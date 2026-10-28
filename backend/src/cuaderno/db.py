"""Motor y sesión de SQLModel con psycopg 3."""

from collections.abc import Iterator
from functools import cache

from sqlalchemy import Engine
from sqlmodel import Session, create_engine

from cuaderno.config import leer_config


@cache
def motor() -> Engine:
    return create_engine(leer_config().url_base_datos, pool_pre_ping=True)


def sesion() -> Iterator[Session]:
    """Dependencia de FastAPI: una sesión por petición."""
    with Session(motor()) as s:
        yield s
