# Imagen común de los servicios api y worker (plan, R2 y R10).
FROM ghcr.io/astral-sh/uv:0.13.6-python3.14-trixie-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias primero, desde el fichero de bloqueo, para aprovechar la caché de capas.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN uv sync --locked --no-dev

ENV PATH="/app/.venv/bin:$PATH"

RUN useradd --system --uid 10001 cuaderno
USER cuaderno
