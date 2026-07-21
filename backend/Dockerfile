# Stage 1: Build dependencies
FROM python:3.13-slim AS builder

WORKDIR /app

# Build-time environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libcairo2-dev \
    pkg-config \
    python3-dev \
    libglib2.0-dev \
    libpango1.0-dev \
    libpangoft2-1.0-0 \
    libharfbuzz-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip & build tools
RUN pip install --upgrade pip setuptools wheel

# Install python dependencies as wheels
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# ─────────────────────────────────────────────────────────────
# Stage 2: Run application
FROM python:3.13-slim

WORKDIR /app

# Runtime environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.production

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libcairo2 \
    libglib2.0-0 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libffi8 \
    shared-mime-info \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built wheels from builder stage and install
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

# Copy project files
COPY . .

# Collect static files during image build. Runtime env vars (including ALLOWED_HOSTS)
# may not be available at build time, so provide a temporary safe default here.
RUN ALLOWED_HOSTS=localhost,127.0.0.1 python manage.py collectstatic --noinput || true

# Create non-root user for security
RUN addgroup --system django && adduser --system --ingroup django django
RUN chown -R django:django /app

# Use non-root user
USER django

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f\"http://127.0.0.1:{os.environ.get('PORT','8000')}/healthz\")" || exit 1

# Expose port
EXPOSE 8000

# Use project startup script so migrations/bootstrap run before Gunicorn.
CMD ["bash", "scripts/railway-start-web.sh"]
