"""Infraestructura de pruebas de la API (T-06).

- Base de datos PostgreSQL de pruebas aparte (la de URL_BASE_DATOS con el sufijo _pruebas), creada
  de nuevo en cada ejecución, migrada con `alembic upgrade head` y vaciada después de cada prueba.
- Cliente HTTP de FastAPI que usa esa base de datos y un reloj fijo.
- Reloj inyectable para fijar "hoy" en Europe/Madrid.
- Cliente de la API REST de Mailpit para leer y vaciar los correos recibidos.

Fuera del CI las variables se leen del fichero .env de la raíz del repositorio (ver .env.example).
"""

import os
from collections.abc import Iterator
from datetime import UTC, date, datetime, time
from pathlib import Path
from typing import Any

import httpx2
import psycopg
import pytest
from alembic import command
from alembic.config import Config as ConfigAlembic
from fastapi.testclient import TestClient
from psycopg import sql
from sqlalchemy import Engine, make_url, text
from sqlmodel import Session, SQLModel, create_engine

from cuaderno.config import ZONA_HORARIA
from cuaderno.db import sesion
from cuaderno.main import api, app
from cuaderno.reloj import Reloj, obtener_reloj

RAIZ_BACKEND = Path(__file__).resolve().parents[1]


def _cargar_env() -> None:
    """Carga el .env de la raíz sin sobrescribir las variables ya definidas (las del CI)."""
    fichero = RAIZ_BACKEND.parent / ".env"
    if not fichero.exists():
        return
    for linea in fichero.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if linea and not linea.startswith("#") and "=" in linea:
            nombre, valor = linea.split("=", 1)
            os.environ.setdefault(nombre.strip(), valor.strip())


_cargar_env()


# --- Base de datos ---


def _url_pruebas() -> str:
    url = make_url(os.environ["URL_BASE_DATOS"])
    return url.set(database=f"{url.database}_pruebas").render_as_string(hide_password=False)


def _recrear_base_de_datos(url: str) -> None:
    destino = make_url(url)
    with psycopg.connect(
        host=destino.host,
        port=destino.port,
        user=destino.username,
        password=destino.password,
        dbname="postgres",
        autocommit=True,
    ) as conexion:
        nombre = sql.Identifier(str(destino.database))
        conexion.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(nombre))
        conexion.execute(sql.SQL("CREATE DATABASE {}").format(nombre))


@pytest.fixture(scope="session")
def motor_pruebas() -> Iterator[Engine]:
    """Base de datos de pruebas recién creada y migrada con `alembic upgrade head`."""
    url = _url_pruebas()
    _recrear_base_de_datos(url)
    config = ConfigAlembic(str(RAIZ_BACKEND / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")
    motor = create_engine(url)
    yield motor
    motor.dispose()


@pytest.fixture
def bd(motor_pruebas: Engine) -> Iterator[Engine]:
    """Base de datos de pruebas; se vacía al terminar cada prueba."""
    yield motor_pruebas
    tablas = [tabla.name for tabla in SQLModel.metadata.sorted_tables]
    if tablas:
        lista = ", ".join(f'"{nombre}"' for nombre in tablas)
        with motor_pruebas.begin() as conexion:
            # Los nombres salen de los modelos, no de datos externos.
            conexion.execute(text(f"TRUNCATE {lista} RESTART IDENTITY CASCADE"))  # noqa: S608


# --- Reloj ---


class RelojFijo(Reloj):
    """Reloj que devuelve siempre el instante fijado."""

    def __init__(self, instante: datetime) -> None:
        self.instante = instante

    def ahora(self) -> datetime:
        return self.instante

    def fijar(self, instante: datetime) -> None:
        self.instante = instante.astimezone(UTC)

    def fijar_hoy(self, dia: date) -> None:
        """Fija "hoy" en Europe/Madrid (a mediodía, lejos de los cambios de día)."""
        self.fijar(datetime.combine(dia, time(12), tzinfo=ZONA_HORARIA))


@pytest.fixture
def reloj() -> RelojFijo:
    reloj = RelojFijo(datetime.now(UTC))
    reloj.fijar_hoy(date(2026, 3, 15))
    return reloj


# --- Cliente HTTP de la API ---


@pytest.fixture
def cliente(bd: Engine, reloj: RelojFijo) -> Iterator[TestClient]:
    """Cliente de la API con la base de datos de pruebas y el reloj fijo.

    Usa https para que el cliente envíe las cookies `Secure` (`__Host-sesion`).
    """

    def sesion_pruebas() -> Iterator[Session]:
        with Session(bd) as s:
            yield s

    api.dependency_overrides[sesion] = sesion_pruebas
    api.dependency_overrides[obtener_reloj] = lambda: reloj
    with TestClient(app, base_url="https://testserver") as c:
        yield c
    api.dependency_overrides.clear()


# --- Mailpit ---


class ClienteMailpit:
    """Cliente mínimo de la API REST de Mailpit (v1)."""

    def __init__(self, url: str) -> None:
        self._http = httpx2.Client(base_url=url.rstrip("/"), timeout=10)

    def mensajes(self) -> list[dict[str, Any]]:
        """Resúmenes de los correos recibidos (GET /api/v1/messages)."""
        respuesta = self._http.get("/api/v1/messages")
        respuesta.raise_for_status()
        resultado: list[dict[str, Any]] = respuesta.json()["messages"]
        return resultado

    def mensaje(self, id_mensaje: str) -> dict[str, Any]:
        """Correo completo, con Text y HTML (GET /api/v1/message/{ID})."""
        respuesta = self._http.get(f"/api/v1/message/{id_mensaje}")
        respuesta.raise_for_status()
        resultado: dict[str, Any] = respuesta.json()
        return resultado

    def vaciar(self) -> None:
        """Borra todos los correos (DELETE /api/v1/messages sin identificadores)."""
        self._http.delete("/api/v1/messages").raise_for_status()

    def cerrar(self) -> None:
        self._http.close()


@pytest.fixture
def mailpit() -> Iterator[ClienteMailpit]:
    """Mailpit vacío al empezar la prueba."""
    cliente = ClienteMailpit(os.environ.get("URL_MAILPIT", "http://127.0.0.1:8025"))
    cliente.vaciar()
    yield cliente
    cliente.cerrar()
