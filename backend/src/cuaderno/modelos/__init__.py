"""Modelos de las tablas (data-model.md).

Importar este paquete registra todas las tablas en `SQLModel.metadata` (Alembic y las pruebas).
"""

from cuaderno.modelos.cuentas import (
    Explotacion,
    IntentoAcceso,
    Sesion,
    TokenRestablecimiento,
    Usuario,
)
from cuaderno.modelos.equipo import Equipo
from cuaderno.modelos.parcela import Parcela
from cuaderno.modelos.persona import Persona
from cuaderno.modelos.producto import Producto

__all__ = [
    "Equipo",
    "Explotacion",
    "IntentoAcceso",
    "Parcela",
    "Persona",
    "Producto",
    "Sesion",
    "TokenRestablecimiento",
    "Usuario",
]
