"""Esquemas de tratamiento (contrato: TratamientoNuevo, Tratamiento; REQ-01 a REQ-05).

Aquí se comprueban los tipos, los textos y las listas cerradas. Las reglas de REQ-02 y REQ-04
compartidas con la PWA (al menos una parcela y un producto, superficies, cantidades y fecha) están
en dominio/validacion.py; en el esquema solo se documentan, para que el rechazo lleve su mensaje.

Los campos de plazo del contrato (estado, vencimiento y marcas) llegan con REQ-07 y REQ-09 (T-47).
"""

import uuid
from datetime import date
from typing import Annotated, Literal

from pydantic import AwareDatetime, BeforeValidator, Field

from cuaderno.dominio import validacion
from cuaderno.esquemas.base import Esquema
from cuaderno.esquemas.maestro import Texto, en_blanco_a_nulo


class ParcelaTratadaNueva(Esquema):
    parcela_id: uuid.UUID
    superficie_tratada: float = Field(
        description="ha; ≤ superficie de la parcela (REQ-04)",
        json_schema_extra={"exclusiveMinimum": 0, "multipleOf": 0.01},
    )
    cultivo_especie: Texto = Field(min_length=1, max_length=validacion.CULTIVO_MAXIMO)
    cultivo_variedad: Texto = Field(min_length=1, max_length=validacion.CULTIVO_MAXIMO)
    producto_semilla: Annotated[
        Annotated[str, Field(max_length=validacion.PRODUCTO_SEMILLA_MAXIMO)] | None,
        BeforeValidator(en_blanco_a_nulo),
    ] = None


class ParcelaTratada(ParcelaTratadaNueva):
    numero_orden: int = Field(ge=1, description="Número de orden de la parcela (REQ-01 b)")


class ProductoAplicado(Esquema):
    producto_id: uuid.UUID
    cantidad: float = Field(json_schema_extra={"exclusiveMinimum": 0})
    unidad_medida: Literal["kg", "L"]


class DatosTratamiento(Esquema):
    """Datos de la sección B del anexo III que da el agricultor (REQ-01)."""

    fecha: date = Field(description="≤ hoy (REQ-04)")
    problema: Texto = Field(min_length=1, max_length=validacion.PROBLEMA_MAXIMO)
    aplicador_id: uuid.UUID
    asesor_id: uuid.UUID | None = None
    equipo_id: uuid.UUID
    parcelas: list[ParcelaTratadaNueva] = Field(json_schema_extra={"minItems": 1})
    productos: list[ProductoAplicado] = Field(json_schema_extra={"minItems": 1})
    eficacia: Literal["buena", "regular", "mala"] | None = None
    observaciones: Annotated[
        Annotated[str, Field(max_length=validacion.OBSERVACIONES_MAXIMO)] | None,
        BeforeValidator(en_blanco_a_nulo),
    ] = None


class TratamientoNuevo(DatosTratamiento):
    id: uuid.UUID = Field(description="Generado por el cliente (R4)")
    registrado_en: AwareDatetime = Field(description="Momento del guardado en el dispositivo (R14)")


class Tratamiento(TratamientoNuevo):
    """Tratamiento guardado, con el número de orden de cada parcela tratada."""

    parcelas: list[ParcelaTratada]  # type: ignore[assignment]
    version: int = Field(ge=1)
    en_conflicto: bool
