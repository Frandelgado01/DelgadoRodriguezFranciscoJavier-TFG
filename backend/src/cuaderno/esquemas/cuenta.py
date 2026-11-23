"""Esquemas de cuenta y sesión (contrato: Credenciales, Cuenta, EsperaAcceso; REQ-20 a REQ-22).

Las reglas de la contraseña y del correo son las de `dominio/validacion.py`, compartidas con la PWA.
"""

import uuid
from typing import Annotated

from pydantic import AfterValidator, Field, WithJsonSchema

from cuaderno.dominio import validacion
from cuaderno.esquemas.base import DatoNoValido, Esquema


def validar_contrasena(valor: str) -> str:
    if error := validacion.validar_contrasena(valor):
        raise DatoNoValido(error["mensaje"], error["req"])
    return valor


def validar_correo(valor: str) -> str:
    """Devuelve el correo sin los espacios de los lados."""
    if error := validacion.validar_correo(valor):
        raise DatoNoValido(error["mensaje"], error["req"])
    return valor.strip()


Contrasena = Annotated[
    str,
    AfterValidator(validar_contrasena),
    WithJsonSchema({"type": "string", "minLength": 15, "maxLength": 128}),
]
Correo = Annotated[
    str,
    AfterValidator(validar_correo),
    WithJsonSchema({"type": "string", "format": "email", "maxLength": 254}),
]


class Credenciales(Esquema):
    correo: Correo
    contrasena: Contrasena


class Cuenta(Esquema):
    correo: str
    explotacion_id: uuid.UUID


class SolicitudRecuperacion(Esquema):
    correo: Correo


class ConfirmacionRecuperacion(Esquema):
    token: str = Field(min_length=32, max_length=128)
    contrasena: Contrasena


class EsperaAcceso(Esquema):
    """Respuesta 429 del inicio de sesión (REQ-22)."""

    mensaje: str
    segundos_restantes: int = Field(ge=1)
