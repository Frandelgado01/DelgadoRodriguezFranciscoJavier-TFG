"""Pruebas de la aplicación base (T-05): prefijo /api, documentación y configuración."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from cuaderno.config import ZONA_HORARIA, leer_config
from cuaderno.main import app

ENTORNO = {
    "URL_BASE_DATOS": "postgresql+psycopg://u:p@localhost:5432/cuaderno",
    "URL_PUBLICA": "https://localhost/",
    "SMTP_HOST": "mailpit",
    "SMTP_PORT": "1025",
    "CORREO_REMITENTE": "cuaderno@localhost",
}


def test_documentacion_interactiva_en_api_docs() -> None:
    cliente = TestClient(app)
    assert cliente.get("/api/docs").status_code == 200
    assert cliente.get("/docs").status_code == 404


def test_openapi_declara_el_servidor_api_como_el_contrato() -> None:
    esquema = TestClient(app).get("/api/openapi.json").json()
    assert esquema["servers"] == [{"url": "/api"}]


def test_config_lee_las_variables_de_env_example() -> None:
    config = leer_config(ENTORNO)
    assert config.smtp_port == 1025
    assert config.url_publica == "https://localhost"


def test_config_falla_si_falta_una_variable() -> None:
    with pytest.raises(RuntimeError, match="URL_PUBLICA"):
        leer_config({k: v for k, v in ENTORNO.items() if k != "URL_PUBLICA"})


def test_zona_horaria_europe_madrid() -> None:
    verano = datetime(2026, 7, 1, 12, tzinfo=ZONA_HORARIA)
    assert verano.utcoffset() == timedelta(hours=2)
