# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
"""
VideoTranscriptService — Transcribe video lesson audio via OpenAI Whisper.

Supported sources:
  • Direct media URLs (mp4, webm, mp3, wav, m4a, ogg) — downloaded and
    sent to Whisper for transcription.
  • YouTube / Vimeo URLs — not supported (requires yt-dlp); returns None.

Usage:
  service = VideoTranscriptService(tenant=tenant)
  transcript = service.transcribe_lesson(lesson, using="default")
  # Returns transcript text or None on failure.
"""

from __future__ import annotations

import logging
import os
import tempfile
import urllib.request
from urllib.parse import urlparse

from django.conf import settings

from ai_engine.services.provider_config import get_ai_provider_config

logger = logging.getLogger(__name__)

# Media file extensions Whisper accepts
_SUPPORTED_EXTENSIONS = {
    ".mp4",
    ".webm",
    ".mp3",
    ".wav",
    ".m4a",
    ".ogg",
    ".mpeg",
    ".mpga",
}
# Domains that require special downloaders (not supported)
_UNSUPPORTED_HOSTS = {"youtube.com", "youtu.be", "vimeo.com", "dailymotion.com"}
# Max file size to download (50 MB — Whisper API limit)
_MAX_BYTES = 50 * 1024 * 1024


class VideoTranscriptService:
    def __init__(self, *, tenant=None):
        self.tenant = tenant

    # ------------------------------------------------------------------ #
    #  Public API
    # ------------------------------------------------------------------ #

    def transcribe_lesson(self, lesson, using: str = "default") -> str | None:
        """
        Transcribe the video attached to `lesson` via OpenAI Whisper.

        Persists the transcript to `lesson.video_transcript` on success.
        Returns the transcript text or None if transcription is not possible.
        """
        video_url = getattr(lesson, "video_url", None) or ""
        if not video_url:
            return None

        if self._is_unsupported_host(video_url):
            logger.info(
                "VideoTranscriptService: YouTube/Vimeo not supported for lesson %s",
                lesson.pk,
            )
            return None

        ext = self._url_extension(video_url)
        if ext not in _SUPPORTED_EXTENSIONS:
            logger.info(
                "VideoTranscriptService: unsupported extension '%s' for lesson %s",
                ext,
                lesson.pk,
            )
            return None

        transcript = self._transcribe_url(video_url, ext)
        if transcript:
            from academic.models.lesson import Lesson as LessonModel

            LessonModel.objects.using(using).filter(pk=lesson.pk).update(
                video_transcript=transcript
            )
            lesson.video_transcript = transcript
            logger.info(
                "VideoTranscriptService: lesson %s transcribed (%d chars)",
                lesson.pk,
                len(transcript),
            )
        return transcript

    # ------------------------------------------------------------------ #
    #  Internals
    # ------------------------------------------------------------------ #

    def _transcribe_url(self, url: str, ext: str) -> str | None:
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                tmp_path = tmp.name

            try:
                self._download(url, tmp_path)
                return self._call_whisper(tmp_path, ext)
            finally:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
        except Exception as exc:
            logger.warning("VideoTranscriptService: transcription failed: %s", exc)
            return None

    def _download(self, url: str, dest_path: str) -> None:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310
            downloaded = 0
            with open(dest_path, "wb") as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    downloaded += len(chunk)
                    if downloaded > _MAX_BYTES:
                        raise ValueError(
                            f"Media file too large (>{_MAX_BYTES // 1024 // 1024} MB)"
                        )
                    f.write(chunk)

    def _call_whisper(self, path: str, ext: str) -> str | None:
        from openai import OpenAI

        config = get_ai_provider_config()
        client = OpenAI(
            api_key=config.get("api_key"),
            base_url=config.get("base_url"),
            default_headers=config.get("request_headers") or None,
            timeout=float(getattr(settings, "OPENAI_TIMEOUT_SECONDS", 60)),
        )
        whisper_model = str(getattr(settings, "AI_WHISPER_MODEL", "whisper-1"))
        mime = _EXT_MIME.get(ext, "video/mp4")

        with open(path, "rb") as f:
            response = client.audio.transcriptions.create(
                model=whisper_model,
                file=(f"audio{ext}", f, mime),
                response_format="text",
            )
        return str(response).strip() if response else None

    @staticmethod
    def _is_unsupported_host(url: str) -> bool:
        try:
            host = urlparse(url).hostname or ""
            return any(h in host for h in _UNSUPPORTED_HOSTS)
        except Exception:
            return False

    @staticmethod
    def _url_extension(url: str) -> str:
        try:
            path = urlparse(url).path
            _, ext = os.path.splitext(path)
            return ext.lower()
        except Exception:
            return ""


_EXT_MIME: dict[str, str] = {
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".mpeg": "video/mpeg",
    ".mpga": "audio/mpeg",
}
