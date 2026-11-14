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
COPY alembic.ini ./
COPY alembic ./alembic
RUN uv sync --locked --no-dev

ENV PATH="/app/.venv/bin:$PATH"

RUN useradd --system --uid 10001 cuaderno
USER cuaderno

EXPOSE 8000
# Aplica las migraciones pendientes y arranca la API. Caddy (servicio web) es el único que la expone.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn cuaderno.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
