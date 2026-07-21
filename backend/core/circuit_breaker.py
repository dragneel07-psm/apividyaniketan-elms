# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
Simple in-process circuit breaker — no external dependencies required.

States:
  CLOSED    → normal operation, all calls go through.
  OPEN      → failure threshold exceeded; calls are rejected immediately.
  HALF_OPEN → recovery window; one probe call is allowed through.

Usage:
    from core.circuit_breaker import CircuitBreaker, CircuitOpenError

    _openai_breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=60, name="openai")

    try:
        result = _openai_breaker.call(my_openai_fn, *args)
    except CircuitOpenError:
        # return fallback
        ...
"""

from __future__ import annotations

import functools
import logging
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitOpenError(Exception):
    """Raised when a call is rejected because the circuit is OPEN."""


class CircuitBreaker:
    """
    Thread-safe circuit breaker.

    Args:
        failure_threshold: Consecutive failures before opening the circuit.
        recovery_timeout:  Seconds to wait in OPEN state before attempting recovery.
        name:              Label used in log messages.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        name: str = "circuit",
    ) -> None:
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.name = name

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._opened_at: float | None = None
        self._lock = threading.Lock()

    # ── Public API ────────────────────────────────────────────────────────────

    @property
    def state(self) -> str:
        return self._state.value

    def call(self, fn: Callable, *args: Any, **kwargs: Any) -> Any:
        """Execute *fn* with circuit-breaker protection."""
        self._check_state()
        try:
            result = fn(*args, **kwargs)
            self._on_success()
            return result
        except CircuitOpenError:
            raise
        except Exception as exc:
            self._on_failure(exc)
            raise

    def __call__(self, fn: Callable) -> Callable:
        """Use as a decorator: @breaker"""

        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return self.call(fn, *args, **kwargs)

        return wrapper

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _check_state(self) -> None:
        with self._lock:
            if self._state == CircuitState.OPEN:
                elapsed = time.monotonic() - (self._opened_at or 0)
                if elapsed >= self.recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                    logger.info(
                        "Circuit breaker entering half-open state — probing recovery",
                        extra={"circuit": self.name, "elapsed_s": round(elapsed, 1)},
                    )
                else:
                    raise CircuitOpenError(
                        f"Circuit '{self.name}' is OPEN — call rejected "
                        f"(retry in {self.recovery_timeout - elapsed:.0f}s)."
                    )

    def _on_success(self) -> None:
        with self._lock:
            if self._failure_count > 0 or self._state != CircuitState.CLOSED:
                logger.info(
                    "Circuit breaker closed after successful call",
                    extra={"circuit": self.name, "prev_failures": self._failure_count},
                )
            self._failure_count = 0
            self._state = CircuitState.CLOSED
            self._opened_at = None

    def _on_failure(self, exc: Exception) -> None:
        with self._lock:
            self._failure_count += 1
            if (
                self._failure_count >= self.failure_threshold
                or self._state == CircuitState.HALF_OPEN
            ):
                self._state = CircuitState.OPEN
                self._opened_at = time.monotonic()
                logger.error(
                    "Circuit breaker opened",
                    extra={
                        "circuit": self.name,
                        "failure_count": self._failure_count,
                        "error": str(exc),
                    },
                )
            else:
                logger.warning(
                    "Circuit breaker recorded failure",
                    extra={
                        "circuit": self.name,
                        "failure_count": self._failure_count,
                        "threshold": self.failure_threshold,
                        "error": str(exc),
                    },
                )
