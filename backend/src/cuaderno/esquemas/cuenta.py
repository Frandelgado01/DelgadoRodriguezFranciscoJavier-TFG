"""Esquemas de cuenta y sesión (contrato: Credenciales, Cuenta; REQ-20)."""

import re
import uuid
from typing import Annotated

from pydantic import AfterValidator, Field, WithJsonSchema

from cuaderno.esquemas.base import DatoNoValido, Esquema

_FORMATO_CORREO = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


def validar_contrasena(valor: str) -> str:
    """De 15 a 128 caracteres, cualquier carácter y sin reglas de composición (R9)."""
    if not 15 <= len(valor) <= 128:
        raise DatoNoValido("La contraseña debe tener entre 15 y 128 caracteres.", "REQ-20")
    return valor


def validar_correo(valor: str) -> str:
    """Correo con forma nombre@dominio, sin espacios a los lados y de 254 caracteres como mucho."""
    valor = valor.strip()
    if len(valor) > 254 or not _FORMATO_CORREO.fullmatch(valor):
        raise DatoNoValido(
            "Escribe un correo electrónico válido, por ejemplo nombre@dominio.es.", "REQ-20"
        )
    return valor


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
