"""Piezas comunes de los esquemas de los datos maestros (EstadoMaestro; REQ-14 a REQ-17)."""

from datetime import date
from typing import Annotated, Literal

from pydantic import BeforeValidator, Field

from cuaderno.esquemas.base import Esquema

EstadoMaestro = Literal["activa", "baja"]


def en_blanco_a_nulo(valor: object) -> object:
    """Un texto opcional vacío o solo con espacios se guarda como "sin dato"; si no, sin espacios
    a los lados."""
    if isinstance(valor, str):
        valor = valor.strip()
        return valor or None
    return valor


def sin_espacios(valor: object) -> object:
    """Quita los espacios de los lados de un texto obligatorio (así "  " cuenta como vacío)."""
    return valor.strip() if isinstance(valor, str) else valor


Texto = Annotated[str, BeforeValidator(sin_espacios)]
# Texto opcional de hasta 100 caracteres; el límite va en la rama str, no en la unión con None.
TextoOpcional = Annotated[
    Annotated[str, Field(max_length=100)] | None, BeforeValidator(en_blanco_a_nulo)
]


class EstadoBaja(Esquema):
    """Estado y fecha de baja de las respuestas (REQ-17)."""

    estado: EstadoMaestro
    fecha_baja: date | None = None
