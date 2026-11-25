"""Esquemas de equipo de aplicación (contrato: EquipoEntrada, Equipo; REQ-15).

Que la fecha no sea posterior a hoy lo comprueba la API, que conoce "hoy" en Europe/Madrid.
"""

import uuid
from datetime import date
from typing import Annotated

from pydantic import BeforeValidator, Field

from cuaderno.esquemas.base import Esquema
from cuaderno.esquemas.maestro import EstadoBaja, Texto, en_blanco_a_nulo


class EquipoEntrada(Esquema):
    descripcion: Texto = Field(min_length=1, max_length=150)
    fecha_adquisicion_o_inspeccion: date
    numero_roma: Annotated[
        Annotated[str, Field(max_length=30)] | None, BeforeValidator(en_blanco_a_nulo)
    ] = Field(default=None, description="Número ROMA o referencia censal, si procede")


class Equipo(EquipoEntrada, EstadoBaja):
    id: uuid.UUID
