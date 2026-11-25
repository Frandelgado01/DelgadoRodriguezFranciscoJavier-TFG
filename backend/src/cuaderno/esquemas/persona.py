"""Esquemas de persona (contrato: PersonaEntrada, Persona; REQ-15).

Solo nombre, tipo y número de carné: sin NIF ni otros datos personales (principio VI).
"""

import uuid
from typing import Literal

from pydantic import Field

from cuaderno.esquemas.base import Esquema
from cuaderno.esquemas.maestro import EstadoBaja, Texto


class PersonaEntrada(Esquema):
    nombre: Texto = Field(min_length=1, max_length=150)
    tipo: Literal["aplicador", "asesor"]
    numero_carne: Texto = Field(min_length=1, max_length=30)


class Persona(PersonaEntrada, EstadoBaja):
    id: uuid.UUID
