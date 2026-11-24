"""Rutas de personas que aplican o asesoran (contrato: /personas*; REQ-15)."""

import uuid

from fastapi import APIRouter, status
from sqlmodel import Session, col

from cuaderno import modelos
from cuaderno.api.comun import (
    NO_ENCONTRADO,
    VALIDACION,
    ExplotacionActual,
    IncluirBajas,
    RelojAPI,
    SesionBD,
    dar_de_baja,
    de_la_explotacion,
)
from cuaderno.esquemas.persona import Persona, PersonaEntrada
from cuaderno.servicios.sesiones import buscar_en_explotacion

router = APIRouter(prefix="/personas", tags=["personas"])


def _guardar(s: Session, fila: modelos.Persona) -> Persona:
    s.add(fila)
    s.commit()
    s.refresh(fila)
    return Persona.model_validate(fila, from_attributes=True)


@router.get("", summary="Listar aplicadores y asesores (REQ-15)")
def listar_personas(
    s: SesionBD, explotacion: ExplotacionActual, incluir_bajas: IncluirBajas = False
) -> list[Persona]:
    consulta = de_la_explotacion(modelos.Persona, explotacion.id, incluir_bajas)
    filas = s.exec(consulta.order_by(col(modelos.Persona.nombre))).all()
    return [Persona.model_validate(p, from_attributes=True) for p in filas]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Dar de alta una persona (REQ-15)",
    responses={422: VALIDACION},
)
def crear_persona(datos: PersonaEntrada, s: SesionBD, explotacion: ExplotacionActual) -> Persona:
    fila = modelos.Persona.model_validate(datos.model_dump() | {"explotacion_id": explotacion.id})
    return _guardar(s, fila)


@router.put(
    "/{id}",
    summary="Modificar una persona (REQ-15)",
    responses={404: NO_ENCONTRADO, 422: VALIDACION},
)
def modificar_persona(
    id: uuid.UUID, datos: PersonaEntrada, s: SesionBD, explotacion: ExplotacionActual
) -> Persona:
    fila = buscar_en_explotacion(s, modelos.Persona, id, explotacion.id)
    fila.sqlmodel_update(datos.model_dump())
    return _guardar(s, fila)


@router.post(
    "/{id}/baja",
    summary="Dar de baja una persona (REQ-17)",
    responses={404: NO_ENCONTRADO},
)
def dar_de_baja_persona(
    id: uuid.UUID, s: SesionBD, explotacion: ExplotacionActual, reloj: RelojAPI
) -> Persona:
    fila = dar_de_baja(s, modelos.Persona, id, explotacion.id, reloj.hoy())
    return Persona.model_validate(fila, from_attributes=True)
