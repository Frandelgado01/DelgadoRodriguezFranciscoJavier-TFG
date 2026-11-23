"""Pruebas de REQ-20: cuenta, inicio y cierre de sesión (T-09; research R9).

Criterios de R9: contraseña de 15 a 128 caracteres sin reglas de composición, hash Argon2id;
token de sesión opaco de 256 bits guardado como SHA-256 y enviado en la cookie `__Host-sesion` con
`Secure`, `HttpOnly`, `SameSite=Strict` y `Path=/`; caducidad a los 30 días sin uso y a los 90
absolutos.
"""

import hashlib
import re
import uuid
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.exc import IntegrityError

from tests.conftest import RelojFijo

CORREO = "ana@example.com"
CONTRASENA = "una frase larga de ejemplo"
COOKIE = "__Host-sesion"


def crear_cuenta(cliente: TestClient, correo: str = CORREO, contrasena: str = CONTRASENA) -> Any:
    return cliente.post("/api/cuenta", json={"correo": correo, "contrasena": contrasena})


def iniciar_sesion(cliente: TestClient, correo: str = CORREO, contrasena: str = CONTRASENA) -> Any:
    return cliente.post("/api/sesion", json={"correo": correo, "contrasena": contrasena})


def cabecera_cookie(respuesta: Any) -> str:
    """La cabecera Set-Cookie de la sesión."""
    cabeceras = [c for c in respuesta.headers.get_list("set-cookie") if c.startswith(f"{COOKIE}=")]
    assert len(cabeceras) == 1, respuesta.headers.get_list("set-cookie")
    cabecera: str = cabeceras[0]
    return cabecera


def token_de(respuesta: Any) -> str:
    return cabecera_cookie(respuesta).split(";", 1)[0].split("=", 1)[1]


def consultar(bd: Engine, sql: str, **parametros: Any) -> list[Any]:
    with bd.connect() as conexion:
        return list(conexion.execute(text(sql), parametros).all())


# --- Crear cuenta ---


def test_req20_crear_cuenta_crea_la_explotacion_e_inicia_sesion(
    cliente: TestClient, bd: Engine
) -> None:
    respuesta = crear_cuenta(cliente)
    assert respuesta.status_code == 201
    assert token_de(respuesta)

    usuarios = consultar(bd, "SELECT id, correo FROM usuario")
    assert [u.correo for u in usuarios] == [CORREO]
    explotaciones = consultar(bd, "SELECT id, usuario_id FROM explotacion")
    assert len(explotaciones) == 1
    assert explotaciones[0].usuario_id == usuarios[0].id

    yo = cliente.get("/api/cuenta/yo")
    assert yo.status_code == 200
    assert yo.json() == {"correo": CORREO, "explotacionId": str(explotaciones[0].id)}


def test_req20_correo_repetido_responde_409(cliente: TestClient) -> None:
    assert crear_cuenta(cliente).status_code == 201
    assert crear_cuenta(cliente).status_code == 409
    assert crear_cuenta(cliente, correo="ANA@Example.com").status_code == 409


@pytest.mark.parametrize("longitud", [14, 129])
def test_req20_contrasena_fuera_de_15_a_128_caracteres_responde_422(
    cliente: TestClient, bd: Engine, longitud: int
) -> None:
    respuesta = crear_cuenta(cliente, contrasena="a" * longitud)
    assert respuesta.status_code == 422
    assert respuesta.json() == {
        "errores": [
            {
                "campo": "contrasena",
                "mensaje": "La contraseña debe tener entre 15 y 128 caracteres.",
                "req": "REQ-20",
            }
        ]
    }
    assert consultar(bd, "SELECT id FROM usuario") == []


@pytest.mark.parametrize(
    "contrasena",
    ["a" * 15, "b" * 128, "todo en minusculas", "ÑANDÚ cigüeña 🌾 olivo"],
    ids=["15", "128", "sin-composicion", "unicode"],
)
def test_req20_contrasena_sin_reglas_de_composicion(cliente: TestClient, contrasena: str) -> None:
    assert crear_cuenta(cliente, contrasena=contrasena).status_code == 201


def test_req20_correo_no_valido_responde_422(cliente: TestClient) -> None:
    respuesta = crear_cuenta(cliente, correo="no-es-un-correo")
    assert respuesta.status_code == 422
    assert respuesta.json()["errores"][0]["campo"] == "correo"


def test_req20_hash_argon2id_y_sin_contrasena_en_claro(cliente: TestClient, bd: Engine) -> None:
    crear_cuenta(cliente)
    [fila] = consultar(bd, "SELECT * FROM usuario")
    valores = " ".join(str(valor) for valor in fila)
    assert CONTRASENA not in valores

    formato = r"\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$.+"
    parametros = re.fullmatch(formato, fila.hash_contrasena)
    assert parametros, fila.hash_contrasena
    memoria, iteraciones, paralelismo = (int(valor) for valor in parametros.groups())
    # Mínimos de OWASP (R9): 19 MiB, 2 iteraciones y paralelismo 1.
    assert memoria >= 19 * 1024
    assert iteraciones >= 2
    assert paralelismo >= 1


def test_req20_la_base_rechaza_un_correo_repetido_con_otras_mayusculas(
    cliente: TestClient, bd: Engine
) -> None:
    crear_cuenta(cliente)
    with pytest.raises(IntegrityError), bd.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO usuario (id, correo, hash_contrasena, creado_en) "
                "VALUES (:id, 'Ana@EXAMPLE.com', 'x', now())"
            ),
            {"id": uuid.uuid4()},
        )


# --- Iniciar sesión ---


def test_req20_inicio_de_sesion_correcto_da_la_cookie_segura(cliente: TestClient) -> None:
    crear_cuenta(cliente)
    cliente.cookies.clear()

    respuesta = iniciar_sesion(cliente)
    assert respuesta.status_code == 204
    atributos = [a.strip().lower() for a in cabecera_cookie(respuesta).split(";")[1:]]
    assert "secure" in atributos
    assert "httponly" in atributos
    assert "samesite=strict" in atributos
    assert "path=/" in atributos
    assert not any(a.startswith("domain") for a in atributos)
    # La sesión se conserva en el dispositivo (REQ-20): cookie persistente de 90 días.
    assert f"max-age={90 * 24 * 3600}" in atributos
    assert cliente.get("/api/cuenta/yo").status_code == 200


def test_req20_token_opaco_de_256_bits_y_nuevo_en_cada_inicio(cliente: TestClient) -> None:
    crear_cuenta(cliente)
    primero = token_de(iniciar_sesion(cliente))
    segundo = token_de(iniciar_sesion(cliente))
    assert primero != segundo
    # token_urlsafe(32): 32 bytes aleatorios en base64 URL sin relleno.
    assert re.fullmatch(r"[A-Za-z0-9_-]{43}", primero)


def test_req20_inicio_de_sesion_admite_el_correo_con_otras_mayusculas(cliente: TestClient) -> None:
    crear_cuenta(cliente, correo="Ana@Example.com")
    assert iniciar_sesion(cliente, correo="  ana@EXAMPLE.com ").status_code == 204


@pytest.mark.parametrize(
    ("correo", "contrasena"),
    [(CORREO, "otra frase que no es la buena"), ("nadie@example.com", CONTRASENA)],
    ids=["contrasena-erronea", "correo-sin-cuenta"],
)
def test_req20_fallo_de_inicio_de_sesion_responde_401_con_mensaje_generico(
    cliente: TestClient, correo: str, contrasena: str
) -> None:
    crear_cuenta(cliente)
    cliente.cookies.clear()
    respuesta = iniciar_sesion(cliente, correo=correo, contrasena=contrasena)
    assert respuesta.status_code == 401
    assert respuesta.json() == {"mensaje": "Correo o contraseña incorrectos"}
    assert not respuesta.headers.get_list("set-cookie")


def test_req20_en_la_base_solo_esta_el_hash_sha256_del_token(
    cliente: TestClient, bd: Engine
) -> None:
    crear_cuenta(cliente)
    token = token_de(iniciar_sesion(cliente))
    hashes = [bytes(fila.hash_token) for fila in consultar(bd, "SELECT hash_token FROM sesion")]
    assert hashlib.sha256(token.encode()).digest() in hashes
    for fila in consultar(bd, "SELECT * FROM sesion"):
        assert token not in " ".join(str(valor) for valor in fila)


def test_req20_la_api_solo_acepta_json(cliente: TestClient) -> None:
    crear_cuenta(cliente)
    cliente.cookies.clear()
    respuesta = cliente.post(
        "/api/sesion",
        content=f"correo={CORREO}&contrasena={CONTRASENA}",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert respuesta.status_code == 415
    assert not respuesta.headers.get_list("set-cookie")


# --- Caducidad y cierre ---


def test_req20_la_sesion_caduca_a_los_30_dias_sin_uso(
    cliente: TestClient, reloj: RelojFijo
) -> None:
    crear_cuenta(cliente)
    inicio = reloj.ahora()
    reloj.fijar(inicio + timedelta(days=29))
    assert cliente.get("/api/cuenta/yo").status_code == 200
    # El uso del día 29 renueva la inactividad: el día 58 todavía vale.
    reloj.fijar(inicio + timedelta(days=58))
    assert cliente.get("/api/cuenta/yo").status_code == 200
    reloj.fijar(inicio + timedelta(days=88, minutes=1))
    assert cliente.get("/api/cuenta/yo").status_code == 401


def test_req20_la_sesion_caduca_a_los_90_dias_aunque_se_use(
    cliente: TestClient, reloj: RelojFijo
) -> None:
    crear_cuenta(cliente)
    inicio = reloj.ahora()
    for dias in (25, 50, 75):
        reloj.fijar(inicio + timedelta(days=dias))
        assert cliente.get("/api/cuenta/yo").status_code == 200
    reloj.fijar(inicio + timedelta(days=90, minutes=1))
    assert cliente.get("/api/cuenta/yo").status_code == 401


def test_req20_cerrar_sesion_la_invalida_en_el_servidor(cliente: TestClient, bd: Engine) -> None:
    crear_cuenta(cliente)
    token = token_de(iniciar_sesion(cliente))

    respuesta = cliente.delete("/api/sesion")
    assert respuesta.status_code == 204
    assert "max-age=0" in cabecera_cookie(respuesta).lower()

    # Aunque alguien conserve el token, el servidor ya no lo acepta.
    cliente.cookies.clear()
    cliente.cookies.set(COOKIE, token)
    assert cliente.get("/api/cuenta/yo").status_code == 401
    revocadas = consultar(
        bd,
        "SELECT revocada_en FROM sesion WHERE hash_token = :h",
        h=hashlib.sha256(token.encode()).digest(),
    )
    assert revocadas[0].revocada_en is not None


def test_req20_sin_sesion_cuenta_yo_responde_401(cliente: TestClient) -> None:
    assert cliente.get("/api/cuenta/yo").status_code == 401
    cliente.cookies.set(COOKIE, "token-inventado")
    assert cliente.get("/api/cuenta/yo").status_code == 401


# --- Aislamiento entre explotaciones ---


def test_req20_cada_usuario_ve_solo_su_cuenta_y_su_explotacion(
    cliente: TestClient, bd: Engine
) -> None:
    crear_cuenta(cliente, correo="ana@example.com")
    cliente.cookies.clear()
    crear_cuenta(cliente, correo="luis@example.com")
    explotacion_luis = consultar(
        bd,
        "SELECT e.id FROM explotacion e JOIN usuario u ON u.id = e.usuario_id "
        "WHERE u.correo = 'luis@example.com'",
    )[0].id
    assert cliente.get("/api/cuenta/yo").json() == {
        "correo": "luis@example.com",
        "explotacionId": str(explotacion_luis),
    }


@dataclass
class _Recurso:
    id: uuid.UUID
    explotacion_id: uuid.UUID


class _SesionFalsa:
    """Sesión de base de datos mínima: devuelve el recurso guardado si coincide el id."""

    def __init__(self, recurso: _Recurso) -> None:
        self.recurso = recurso

    def get(self, _modelo: type, id_: uuid.UUID) -> _Recurso | None:
        return self.recurso if id_ == self.recurso.id else None


def test_req20_un_recurso_de_otra_explotacion_responde_404() -> None:
    """La búsqueda que usan todas las rutas filtra por la explotación de la sesión (REQ-20)."""
    from cuaderno.servicios.sesiones import buscar_en_explotacion

    mia, ajena = uuid.uuid4(), uuid.uuid4()
    recurso = _Recurso(id=uuid.uuid4(), explotacion_id=ajena)
    s: Any = _SesionFalsa(recurso)

    with pytest.raises(HTTPException) as error:
        buscar_en_explotacion(s, _Recurso, recurso.id, mia)
    assert error.value.status_code == 404
    with pytest.raises(HTTPException):
        buscar_en_explotacion(s, _Recurso, uuid.uuid4(), ajena)
    assert buscar_en_explotacion(s, _Recurso, recurso.id, ajena) is recurso
