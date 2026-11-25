"""Rutas de tratamientos (contrato: /tratamientos*; REQ-01 a REQ-06)."""

import uuid

from fastapi import APIRouter, Response, status

from cuaderno import modelos
from cuaderno.api.comun import NO_ENCONTRADO, VALIDACION, ExplotacionActual, RelojAPI, SesionBD
from cuaderno.esquemas.base import Mensaje
from cuaderno.esquemas.tratamiento import Tratamiento, TratamientoNuevo
from cuaderno.servicios import tratamientos
from cuaderno.servicios.sesiones import buscar_en_explotacion

router = APIRouter(prefix="/tratamientos", tags=["tratamientos"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un tratamiento (REQ-01 a REQ-05)",
    description="Idempotente por `id` (UUID del cliente, REQ-06). Un reintento con el mismo "
    "contenido devuelve 200.",
    responses={
        200: {"model": Tratamiento, "description": "Ya existía con el mismo contenido (reintento)"},
        409: {
            "model": Mensaje,
            "description": "Existe otro tratamiento con ese id y distinto contenido",
        },
        422: VALIDACION,
    },
)
def registrar_tratamiento(
    datos: TratamientoNuevo,
    respuesta: Response,
    s: SesionBD,
    explotacion: ExplotacionActual,
    reloj: RelojAPI,
) -> Tratamiento:
    tratamiento, nuevo = tratamientos.registrar(s, datos, explotacion.id, reloj.ahora())
    if not nuevo:
        respuesta.status_code = status.HTTP_200_OK
    return tratamientos.a_esquema(s, tratamiento)


@router.get(
    "/{id}",
    summary="Ver un tratamiento (REQ-10)",
    responses={404: NO_ENCONTRADO},
)
def ver_tratamiento(id: uuid.UUID, s: SesionBD, explotacion: ExplotacionActual) -> Tratamiento:
    return tratamientos.a_esquema(
        s, buscar_en_explotacion(s, modelos.Tratamiento, id, explotacion.id)
    )
