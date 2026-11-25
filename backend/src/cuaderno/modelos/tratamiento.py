"""Tratamiento fitosanitario y su historial (data-model.md; REQ-01, REQ-03; anexo III, sección B).

Las restricciones CHECK están en la migración. Las columnas de plazo se añaden en T-47. La dosis por
hectárea no se guarda: se calcula (REQ-23; research R15).
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Column, DateTime, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def _instante() -> Column[datetime]:
    """Columna TIMESTAMPTZ."""
    return Column(DateTime(timezone=True), nullable=False)


class Tratamiento(SQLModel, table=True):
    id: uuid.UUID = Field(primary_key=True)  # generado por el cliente (R4)
    explotacion_id: uuid.UUID = Field(foreign_key="explotacion.id", ondelete="RESTRICT")
    fecha: date  # B.a (SIEX CUE 8.1 y 8.2)
    problema: str  # B.c, 1–200 car.
    aplicador_id: uuid.UUID = Field(foreign_key="persona.id", ondelete="RESTRICT")  # B.d
    asesor_id: uuid.UUID | None = Field(default=None, foreign_key="persona.id", ondelete="RESTRICT")
    equipo_id: uuid.UUID = Field(foreign_key="equipo.id", ondelete="RESTRICT")  # B.h
    eficacia: str | None = None  # B.j: buena, regular o mala
    observaciones: str | None = None  # B.k, ≤ 2000 car.
    registrado_en: datetime = Field(sa_column=_instante())  # guardado en el dispositivo (R14)
    # Fecha en Europe/Madrid del menor de registrado_en y recibido_en; la calcula la API (R14).
    fecha_registro: date
    anulado: bool = False
    version: int = 1
    en_conflicto: bool = False
    recibido_en: datetime = Field(sa_column=_instante())


class TratamientoParcela(SQLModel, table=True):
    """Parcela tratada, con el cultivo que tenía al registrar (REQ-05; B.b, B.e y B.f)."""

    __tablename__ = "tratamiento_parcela"

    tratamiento_id: uuid.UUID = Field(
        foreign_key="tratamiento.id", ondelete="RESTRICT", primary_key=True
    )
    parcela_id: uuid.UUID = Field(foreign_key="parcela.id", ondelete="RESTRICT", primary_key=True)
    superficie_tratada: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))  # ha
    cultivo_especie: str
    cultivo_variedad: str
    producto_semilla: str | None = None


class TratamientoProducto(SQLModel, table=True):
    """Producto aplicado y su cantidad en todo el tratamiento (REQ-03; B.g y B.i)."""

    __tablename__ = "tratamiento_producto"

    tratamiento_id: uuid.UUID = Field(
        foreign_key="tratamiento.id", ondelete="RESTRICT", primary_key=True
    )
    producto_id: uuid.UUID = Field(foreign_key="producto.id", ondelete="RESTRICT", primary_key=True)
    cantidad: Decimal = Field(sa_column=Column(Numeric(12, 3), nullable=False))
    unidad_medida: str  # kg o L


class Cambio(SQLModel, table=True):
    """Cambio del historial con instantáneas completas (REQ-11, REQ-12; R4, R5)."""

    id: uuid.UUID = Field(primary_key=True)  # idOperacion del cliente
    tratamiento_id: uuid.UUID = Field(foreign_key="tratamiento.id", ondelete="RESTRICT", index=True)
    tipo: str
    version_base: int
    version_resultante: int | None = None
    datos_anteriores: dict[str, Any] | None = Field(
        default=None, sa_column=Column(JSONB(none_as_null=True), nullable=True)
    )
    datos_nuevos: dict[str, Any] = Field(sa_column=Column(JSONB(none_as_null=True), nullable=False))
    motivo: str | None = None
    realizado_en: datetime = Field(sa_column=_instante())
    recibido_en: datetime = Field(sa_column=_instante())
