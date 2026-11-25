"""Pruebas de la infraestructura de pruebas (T-06): base de datos, cliente, reloj y Mailpit."""

import os
import smtplib
from datetime import date, datetime
from email.message import EmailMessage

from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from cuaderno.config import ZONA_HORARIA
from cuaderno.reloj import Reloj
from tests.conftest import ClienteMailpit, RelojFijo


def test_base_de_datos_de_pruebas_aparte_y_migrada(bd: Engine) -> None:
    with bd.connect() as conexion:
        nombre = conexion.execute(text("SELECT current_database()")).scalar_one()
        version = conexion.execute(text("SELECT to_regclass('alembic_version')")).scalar_one()
    assert str(nombre).endswith("_pruebas")
    assert version == "alembic_version"


def test_base_de_datos_es_postgresql_18_con_pgvector_disponible(bd: Engine) -> None:
    with bd.connect() as conexion:
        servidor = conexion.execute(text("SHOW server_version_num")).scalar_one()
        pgvector = conexion.execute(
            text("SELECT count(*) FROM pg_available_extensions WHERE name = 'vector'")
        ).scalar_one()
    assert int(servidor) // 10000 == 18
    assert pgvector == 1


def test_cliente_http_responde(cliente: TestClient) -> None:
    assert cliente.get("/api/openapi.json").status_code == 200


def test_reloj_fijo_da_hoy_en_europe_madrid(reloj: RelojFijo) -> None:
    # 23:30 del 31 de marzo en Madrid son las 21:30 UTC: en Madrid sigue siendo el 31.
    reloj.fijar(datetime(2026, 3, 31, 23, 30, tzinfo=ZONA_HORARIA))
    assert reloj.hoy() == date(2026, 3, 31)
    reloj.fijar_hoy(date(2026, 4, 1))
    assert reloj.hoy() == date(2026, 4, 1)


def test_reloj_real_da_hoy_en_europe_madrid() -> None:
    reloj = Reloj()
    assert reloj.hoy() == reloj.ahora().astimezone(ZONA_HORARIA).date()


def test_mailpit_recibe_lee_y_vacia(mailpit: ClienteMailpit) -> None:
    correo = EmailMessage()
    correo["From"] = "cuaderno@localhost"
    correo["To"] = "agricultor@example.com"
    correo["Subject"] = "Prueba de la infraestructura"
    correo.set_content("Hola")
    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"])) as smtp:
        smtp.send_message(correo)

    mensajes = mailpit.mensajes()
    assert len(mensajes) == 1
    assert mensajes[0]["Subject"] == "Prueba de la infraestructura"
    assert mailpit.mensaje(mensajes[0]["ID"])["Text"].strip() == "Hola"

    mailpit.vaciar()
    assert mailpit.mensajes() == []
