"""Esquemas de producto fitosanitario (contrato: ProductoEntrada, Producto; REQ-16, REQ-06)."""

import uuid

from pydantic import Field

from cuaderno.esquemas.base import Esquema
from cuaderno.esquemas.maestro import EstadoBaja, Texto


class ProductoEntrada(Esquema):
    id: uuid.UUID = Field(description="Generado por el cliente (R4)")
    nombre_comercial: Texto = Field(min_length=1, max_length=150)
    numero_registro: Texto = Field(min_length=1, max_length=30)


class Producto(ProductoEntrada, EstadoBaja):
    pass
