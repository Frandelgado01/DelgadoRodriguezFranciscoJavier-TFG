"""Pruebas de REQ-21: recuperación de la contraseña por correo (T-11; research R9 y R10).

Criterios de R9: misma respuesta exista o no la cuenta; enlace construido con URL_PUBLICA y nunca
con la cabecera Host; token aleatorio de un solo uso, guardado como hash, que caduca en 1 hora; como
mucho 3 solicitudes por cuenta y hora; al restablecer se cierran todas las sesiones y se invalidan
los demás tokens, sin iniciar sesión; la página de restablecimiento envía
`Referrer-Policy: no-referrer`.

La parte "se borra la fila de intento_acceso" se prueba con REQ-22 (T-13), porque esa tabla llega
en T-14.
"""

import hashlib
import os
import re
from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from tests.conftest import ClienteMailpit, RelojFijo
from tests.integration.test_cuenta_sesion import (
    COOKIE,
    CORREO,
    crear_cuenta,
    iniciar_sesion,
)

NUEVA = "otra frase distinta para la cuenta"
MENSAJE_202 = (
    "Si hay una cuenta con ese correo, te hemos enviado un enlace para restablecer la contraseña. "
    "Caduca en 1 hora."
)
RAIZ = Path(__file__).resolve().parents[3]


def solicitar(cliente: TestClient, correo: str = CORREO, **cabeceras: str) -> Any:
    return cliente.post("/api/cuenta/recuperacion", json={"correo": correo}, headers=cabeceras)


def confirmar(cliente: TestClient, token: str, contrasena: str = NUEVA) -> Any:
    return cliente.post(
        "/api/cuenta/recuperacion/confirmar", json={"token": token, "contrasena": contrasena}
    )


def enlaces(mailpit: ClienteMailpit) -> list[str]:
    """Enlaces de restablecimiento de los correos recibidos, del más antiguo al más reciente."""
    url = re.escape(os.environ["URL_PUBLICA"].rstrip("/"))
    resultado = []
    for resumen in reversed(mailpit.mensajes()):
        texto = mailpit.mensaje(resumen["ID"])["Text"]
        resultado += re.findall(rf"{url}/restablecer\?token=[A-Za-z0-9_-]+", texto)
    return resultado


def token_de(enlace: str) -> str:
    return enlace.rsplit("=", 1)[1]


@pytest.fixture
def cuenta(cliente: TestClient) -> None:
    """Cuenta de CORREO sin sesión abierta en el cliente."""
    crear_cuenta(cliente)
    cliente.cookies.clear()


# --- Solicitud ---


@pytest.mark.usefixtures("cuenta")
def test_req21_solicitud_responde_202_y_envia_un_unico_correo_con_el_enlace(
    cliente: TestClient, mailpit: ClienteMailpit
) -> None:
    respuesta = solicitar(cliente)
    assert respuesta.status_code == 202
    assert respuesta.json() == {"mensaje": MENSAJE_202}

    mensajes = mailpit.mensajes()
    assert len(mensajes) == 1
    assert [destino["Address"] for destino in mensajes[0]["To"]] == [CORREO]
    assert len(enlaces(mailpit)) == 1


@pytest.mark.usefixtures("cuenta")
def test_req21_misma_respuesta_exista_o_no_la_cuenta(
    cliente: TestClient, mailpit: ClienteMailpit
) -> None:
    con_cuenta = solicitar(cliente)
    mailpit.vaciar()
    sin_cuenta = solicitar(cliente, correo="nadie@example.com")
    assert sin_cuenta.status_code == con_cuenta.status_code
    assert sin_cuenta.json() == con_cuenta.json()
    assert mailpit.mensajes() == []


@pytest.mark.usefixtures("cuenta")
def test_req21_el_enlace_usa_url_publica_y_no_la_cabecera_host(
    cliente: TestClient, mailpit: ClienteMailpit
) -> None:
    solicitar(cliente, host="malicioso.example", **{"x-forwarded-host": "malicioso.example"})
    [enlace] = enlaces(mailpit)
    assert enlace.startswith(os.environ["URL_PUBLICA"].rstrip("/") + "/restablecer?token=")
    texto = mailpit.mensaje(mailpit.mensajes()[0]["ID"])["Text"]
    assert "malicioso" not in texto


@pytest.mark.usefixtures("cuenta")
def test_req21_el_token_se_guarda_solo_como_hash(
    cliente: TestClient, mailpit: ClienteMailpit, bd: Engine
) -> None:
    solicitar(cliente)
    token = token_de(enlaces(mailpit)[0])
    assert len(token) >= 43  # 256 bits en base64 URL
    with bd.connect() as conexion:
        filas = conexion.execute(text("SELECT * FROM token_restablecimiento")).all()
    assert [bytes(fila.hash_token) for fila in filas] == [hashlib.sha256(token.encode()).digest()]
    assert token not in " ".join(str(valor) for valor in filas[0])


@pytest.mark.usefixtures("cuenta")
def test_req21_mas_de_3_solicitudes_por_hora_no_envian_mas_correos(
    cliente: TestClient, mailpit: ClienteMailpit, reloj: RelojFijo
) -> None:
    for _ in range(5):
        assert solicitar(cliente).json() == {"mensaje": MENSAJE_202}
    assert len(mailpit.mensajes()) == 3

    reloj.fijar(reloj.ahora() + timedelta(hours=1, minutes=1))
    solicitar(cliente)
    assert len(mailpit.mensajes()) == 4


# --- Confirmación ---


@pytest.mark.usefixtures("cuenta")
def test_req21_confirmar_cambia_la_contrasena_sin_iniciar_sesion(
    cliente: TestClient, mailpit: ClienteMailpit
) -> None:
    solicitar(cliente)
    respuesta = confirmar(cliente, token_de(enlaces(mailpit)[0]))
    assert respuesta.status_code == 204
    assert not respuesta.headers.get_list("set-cookie")
    assert cliente.get("/api/cuenta/yo").status_code == 401

    assert iniciar_sesion(cliente).status_code == 401
    assert iniciar_sesion(cliente, contrasena=NUEVA).status_code == 204


def test_req21_confirmar_cierra_todas_las_sesiones(
    cliente: TestClient, mailpit: ClienteMailpit
) -> None:
    crear_cuenta(cliente)
    abierta = cliente.cookies[COOKIE]
    solicitar(cliente)
    assert confirmar(cliente, token_de(enlaces(mailpit)[0])).status_code == 204

    cliente.cookies.clear()
    cliente.cookies.set(COOKIE, abierta)
    assert cliente.get("/api/cuenta/yo").status_code == 401


@pytest.mark.usefixtures("cuenta")
def test_req21_el_token_solo_vale_una_vez(cliente: TestClient, mailpit: ClienteMailpit) -> None:
    solicitar(cliente)
    token = token_de(enlaces(mailpit)[0])
    assert confirmar(cliente, token).status_code == 204
    segundo = confirmar(cliente, token, contrasena="una tercera frase para probar")
    assert segundo.status_code == 400
    assert segundo.json() == {"mensaje": "El enlace no es válido o ha caducado. Pide otro."}
    assert iniciar_sesion(cliente, contrasena=NUEVA).status_code == 204


@pytest.mark.usefixtures("cuenta")
def test_req21_confirmar_invalida_los_demas_tokens(
    cliente: TestClient, mailpit: ClienteMailpit
) -> None:
    solicitar(cliente)
    solicitar(cliente)
    primero, segundo = (token_de(enlace) for enlace in enlaces(mailpit))
    assert confirmar(cliente, segundo).status_code == 204
    tercera = "una tercera frase para probar"
    assert confirmar(cliente, primero, contrasena=tercera).status_code == 400


@pytest.mark.usefixtures("cuenta")
def test_req21_el_token_caduca_a_la_hora(
    cliente: TestClient, mailpit: ClienteMailpit, reloj: RelojFijo
) -> None:
    solicitar(cliente)
    token = token_de(enlaces(mailpit)[0])
    reloj.fijar(reloj.ahora() + timedelta(hours=1, seconds=1))
    assert confirmar(cliente, token).status_code == 400
    assert iniciar_sesion(cliente).status_code == 204


@pytest.mark.usefixtures("cuenta")
def test_req21_token_inventado_responde_400(cliente: TestClient) -> None:
    assert confirmar(cliente, "x" * 43).status_code == 400


@pytest.mark.usefixtures("cuenta")
def test_req21_la_contrasena_nueva_cumple_la_longitud(
    cliente: TestClient, mailpit: ClienteMailpit
) -> None:
    solicitar(cliente)
    respuesta = confirmar(cliente, token_de(enlaces(mailpit)[0]), contrasena="corta")
    assert respuesta.status_code == 422
    assert respuesta.json()["errores"][0]["campo"] == "contrasena"


# --- Datos personales y página de restablecimiento ---


def test_req21_el_correo_es_el_unico_dato_personal_de_la_cuenta(bd: Engine) -> None:
    with bd.connect() as conexion:
        columnas = {
            tabla: set(
                conexion.execute(
                    text(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_name = :tabla"
                    ),
                    {"tabla": tabla},
                ).scalars()
            )
            for tabla in ("usuario", "token_restablecimiento")
        }
    assert columnas["usuario"] == {"id", "correo", "hash_contrasena", "creado_en"}
    assert columnas["token_restablecimiento"] == {
        "hash_token",
        "usuario_id",
        "creado_en",
        "expira_en",
        "usado_en",
    }


def test_req21_la_pagina_de_restablecimiento_envia_referrer_policy_no_referrer() -> None:
    """El servicio web (Caddy) sirve la página /restablecer con Referrer-Policy: no-referrer."""
    caddyfile = (RAIZ / "despliegue" / "Caddyfile").read_text(encoding="utf-8")
    assert re.search(r'header\s+/restablecer\*?\s+Referrer-Policy\s+"?no-referrer"?', caddyfile)
