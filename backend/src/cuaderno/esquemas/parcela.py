"""Esquemas de parcela (contrato: ParcelaEntrada, Parcela, ReferenciaSigpac; REQ-14).

Las reglas entre campos de A.2 (cultivo leñoso, riego, protección) se comprueban por campo, para que
cada rechazo salga junto al campo que hay que corregir.
"""

import uuid
from typing import Annotated, Literal

from pydantic import AfterValidator, Field, ValidationInfo, field_validator
from pydantic_core import PydanticKnownError

from cuaderno.esquemas.base import DatoNoValido, Esquema
from cuaderno.esquemas.maestro import EstadoBaja, Texto, TextoOpcional

REQ = "REQ-14"

# Límites de los tipos de las columnas (SMALLINT, INTEGER, NUMERIC(10,4)), para responder 422 y no
# un error de la base.
_SMALLINT = 32767
_INTEGER = 2147483647
_SUPERFICIE_TOPE = 1_000_000


def _con_cuatro_decimales(valor: float) -> float:
    """La superficie tal como se guarda; se rechaza si al redondearla sale del rango permitido."""
    guardada = round(valor, 4)
    if guardada <= 0:
        raise PydanticKnownError("greater_than", {"gt": 0})
    if guardada >= _SUPERFICIE_TOPE:
        raise PydanticKnownError("less_than", {"lt": _SUPERFICIE_TOPE})
    return guardada


Superficie = Annotated[
    float,
    Field(gt=0, lt=_SUPERFICIE_TOPE, description="ha"),
    AfterValidator(_con_cuatro_decimales),
]


class ReferenciaSigpac(Esquema):
    """Recinto SIGPAC (A.2.b; SIEX REA 12.2 a 12.8)."""

    provincia: int = Field(ge=1, le=99)
    municipio: int = Field(ge=1, le=_SMALLINT)
    agregado: int = Field(ge=0, le=_SMALLINT)
    zona: int = Field(ge=0, le=_SMALLINT)
    poligono: int = Field(ge=1, le=_INTEGER)
    parcela: int = Field(ge=1, le=_INTEGER)
    recinto: int = Field(ge=1, le=_INTEGER)


class ParcelaEntrada(Esquema):
    """Datos de la parcela que da el agricultor (A.2, apartados a–f). El número de orden no."""

    nombre: TextoOpcional = None
    sigpac: ReferenciaSigpac
    superficie: Superficie
    uso_sigpac: Texto = Field(min_length=1, max_length=10)
    aprovechamiento: Literal["forestal", "pastos", "cultivo"]
    cultivo_lenoso: bool
    cultivo_especie: TextoOpcional = Field(default=None, validate_default=True)
    cultivo_variedad: TextoOpcional = Field(default=None, validate_default=True)
    sistema_explotacion: Literal["secano", "regadio"]
    sistema_riego: TextoOpcional = Field(default=None, validate_default=True)
    protegido: bool
    tipo_proteccion: TextoOpcional = Field(default=None, validate_default=True)
    sistema_certificacion: TextoOpcional = None
    marco_control_plagas: TextoOpcional = None

    # Cada regla mira campos anteriores (info.data); si uno no es válido, ya tiene su error.

    @field_validator("cultivo_lenoso")
    @classmethod
    def _lenoso_solo_en_cultivos(cls, valor: bool, info: ValidationInfo) -> bool:
        aprovechamiento = info.data.get("aprovechamiento")
        if valor and aprovechamiento is not None and aprovechamiento != "cultivo":
            raise DatoNoValido(
                "Solo un cultivo puede ser leñoso: elige el aprovechamiento «cultivo» o desmarca "
                "«cultivo leñoso».",
                REQ,
            )
        return valor

    @field_validator("cultivo_especie", "cultivo_variedad")
    @classmethod
    def _especie_y_variedad_si_lenoso(cls, valor: str | None, info: ValidationInfo) -> str | None:
        if valor is None and info.data.get("cultivo_lenoso"):
            dato = "la especie" if info.field_name == "cultivo_especie" else "la variedad"
            raise DatoNoValido(f"En un cultivo leñoso hay que indicar {dato}.", REQ)
        return valor

    @field_validator("sistema_riego")
    @classmethod
    def _riego_solo_en_regadio(cls, valor: str | None, info: ValidationInfo) -> str | None:
        sistema = info.data.get("sistema_explotacion")
        if sistema == "regadio" and valor is None:
            raise DatoNoValido("En regadío hay que indicar el sistema de riego.", REQ)
        if sistema == "secano" and valor is not None:
            raise DatoNoValido(
                "En secano no hay sistema de riego: déjalo vacío o elige regadío.", REQ
            )
        return valor

    @field_validator("tipo_proteccion")
    @classmethod
    def _tipo_solo_si_protegido(cls, valor: str | None, info: ValidationInfo) -> str | None:
        protegido = info.data.get("protegido")
        if protegido is True and valor is None:
            raise DatoNoValido("Si el cultivo está protegido, indica el tipo de protección.", REQ)
        if protegido is False and valor is not None:
            raise DatoNoValido(
                "Al aire libre no hay tipo de protección: déjalo vacío o marca «protegido».", REQ
            )
        return valor


class Parcela(ParcelaEntrada, EstadoBaja):
    """Parcela guardada, con su número de orden (A.2.a), que asigna el servidor."""

    id: uuid.UUID
    numero_orden: int = Field(ge=1)
