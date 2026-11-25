"""Dependencias, respuestas y bajas comunes a las rutas de los datos de la explotación."""

import uuid
from datetime import date
from typing import Annotated, Any

from fastapi import Depends, Query
from sqlmodel import Session, col, select
from sqlmodel.sql.expression import SelectOfScalar

from cuaderno import modelos
from cuaderno.db import sesion as sesion_bd
from cuaderno.esquemas.base import ErrorValidacion, Mensaje
from cuaderno.modelos.maestro import DatoMaestro
from cuaderno.reloj import Reloj, obtener_reloj
from cuaderno.servicios.sesiones import buscar_en_explotacion, explotacion_actual

SesionBD = Annotated[Session, Depends(sesion_bd)]
ExplotacionActual = Annotated[modelos.Explotacion, Depends(explotacion_actual)]
RelojAPI = Annotated[Reloj, Depends(obtener_reloj)]
IncluirBajas = Annotated[
    bool, Query(description="Incluir también los elementos dados de baja (REQ-17)")
]

VALIDACION: dict[str, Any] = {"model": ErrorValidacion, "description": "Datos no válidos"}
NO_ENCONTRADO: dict[str, Any] = {
    "model": Mensaje,
    "description": "No existe en la explotación del usuario",
}


def de_la_explotacion[T: DatoMaestro](
    modelo: type[T], explotacion_id: uuid.UUID, incluir_bajas: bool
) -> SelectOfScalar[T]:
    """Elementos de la explotación de la sesión; sin las bajas, salvo que se pidan (REQ-17)."""
    consulta = select(modelo).where(col(modelo.explotacion_id) == explotacion_id)
    if not incluir_bajas:
        consulta = consulta.where(col(modelo.estado) == "activa")
    return consulta


def dar_de_baja[T: DatoMaestro](
    s: Session, modelo: type[T], id_: uuid.UUID, explotacion_id: uuid.UUID, hoy: date
) -> T:
    """Baja lógica (REQ-17): estado "baja" y fecha de hoy; la fila nunca se borra.

    Dar de baja otra vez no cambia nada: se conserva la primera fecha.
    """
    fila = buscar_en_explotacion(s, modelo, id_, explotacion_id)
    if fila.estado != "baja":
        fila.estado = "baja"
        fila.fecha_baja = hoy
        s.add(fila)
        s.commit()
        s.refresh(fila)
    return fila
