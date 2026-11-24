"""Rutas de equipos de aplicación (contrato: /equipos*; REQ-15)."""

import uuid

from fastapi import APIRouter, status
from sqlmodel import Session, col, select

from cuaderno import modelos
from cuaderno.api.comun import NO_ENCONTRADO, VALIDACION, ExplotacionActual, RelojAPI, SesionBD
from cuaderno.api.errores import DatosNoValidos
from cuaderno.esquemas.equipo import Equipo, EquipoEntrada
from cuaderno.reloj import Reloj
from cuaderno.servicios.sesiones import buscar_en_explotacion

router = APIRouter(prefix="/equipos", tags=["equipos"])


def _comprobar_fecha(datos: EquipoEntrada, reloj: Reloj) -> None:
    """La fecha de adquisición o de la última inspección no puede ser posterior a hoy (REQ-15)."""
    if datos.fecha_adquisicion_o_inspeccion > reloj.hoy():
        raise DatosNoValidos(
            "fechaAdquisicionOInspeccion",
            "La fecha de adquisición o de la última inspección no puede ser posterior a hoy.",
            "REQ-15",
        )


def _guardar(s: Session, fila: modelos.Equipo) -> Equipo:
    s.add(fila)
    s.commit()
    s.refresh(fila)
    return Equipo.model_validate(fila, from_attributes=True)


@router.get("", summary="Listar equipos de aplicación (REQ-15)")
def listar_equipos(s: SesionBD, explotacion: ExplotacionActual) -> list[Equipo]:
    filas = s.exec(
        select(modelos.Equipo)
        .where(modelos.Equipo.explotacion_id == explotacion.id)
        .order_by(col(modelos.Equipo.descripcion))
    ).all()
    return [Equipo.model_validate(e, from_attributes=True) for e in filas]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Dar de alta un equipo (REQ-15)",
    responses={422: VALIDACION},
)
def crear_equipo(
    datos: EquipoEntrada, s: SesionBD, explotacion: ExplotacionActual, reloj: RelojAPI
) -> Equipo:
    _comprobar_fecha(datos, reloj)
    fila = modelos.Equipo.model_validate(datos.model_dump() | {"explotacion_id": explotacion.id})
    return _guardar(s, fila)


@router.put(
    "/{id}",
    summary="Modificar un equipo (REQ-15)",
    responses={404: NO_ENCONTRADO, 422: VALIDACION},
)
def modificar_equipo(
    id: uuid.UUID,
    datos: EquipoEntrada,
    s: SesionBD,
    explotacion: ExplotacionActual,
    reloj: RelojAPI,
) -> Equipo:
    fila = buscar_en_explotacion(s, modelos.Equipo, id, explotacion.id)
    _comprobar_fecha(datos, reloj)
    fila.sqlmodel_update(datos.model_dump())
    return _guardar(s, fila)
