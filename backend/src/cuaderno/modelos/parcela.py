"""Parcela de la explotación (data-model.md, "parcela"; REQ-14; RD 1311/2012, anexo III, A.2)."""

from decimal import Decimal

from sqlalchemy import Column, Integer, Numeric, SmallInteger
from sqlmodel import Field

from cuaderno.modelos.maestro import DatoMaestro


class Parcela(DatoMaestro, table=True):
    # Número de orden correlativo en la explotación (A.2.a): lo asigna el servidor con
    # explotacion.ultimo_numero_parcela y no se reutiliza; UNIQUE (explotacion_id, numero_orden).
    numero_orden: int = Field(sa_column=Column(Integer, nullable=False))
    nombre: str | None = Field(default=None)
    # Referencia SIGPAC (A.2.b; SIEX REA 12.2 a 12.8).
    sigpac_provincia: int = Field(sa_column=Column(SmallInteger, nullable=False))
    sigpac_municipio: int = Field(sa_column=Column(SmallInteger, nullable=False))
    sigpac_agregado: int = Field(sa_column=Column(SmallInteger, nullable=False))
    sigpac_zona: int = Field(sa_column=Column(SmallInteger, nullable=False))
    sigpac_poligono: int = Field(sa_column=Column(Integer, nullable=False))
    sigpac_parcela: int = Field(sa_column=Column(Integer, nullable=False))
    sigpac_recinto: int = Field(sa_column=Column(Integer, nullable=False))
    superficie: Decimal = Field(sa_column=Column(Numeric(10, 4), nullable=False))  # ha
    uso_sigpac: str = Field(nullable=False)
    aprovechamiento: str = Field(nullable=False)  # forestal, pastos o cultivo (A.2.d)
    cultivo_lenoso: bool = Field(default=False, nullable=False)
    cultivo_especie: str | None = Field(default=None)
    cultivo_variedad: str | None = Field(default=None)
    sistema_explotacion: str = Field(nullable=False)  # secano o regadio
    sistema_riego: str | None = Field(default=None)
    protegido: bool = Field(nullable=False)
    tipo_proteccion: str | None = Field(default=None)
    sistema_certificacion: str | None = Field(default=None)
    marco_control_plagas: str | None = Field(default=None)
