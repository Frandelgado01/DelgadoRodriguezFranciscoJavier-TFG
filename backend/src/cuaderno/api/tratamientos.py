"""Rutas de tratamientos (contrato: /tratamientos*; REQ-01 a REQ-06, REQ-10)."""

import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from cuaderno import modelos
from cuaderno.api.comun import NO_ENCONTRADO, VALIDACION, ExplotacionActual, RelojAPI, SesionBD
from cuaderno.esquemas.base import Mensaje
from cuaderno.esquemas.tratamiento import PaginaTratamientos, Tratamiento, TratamientoNuevo
from cuaderno.servicios import tratamientos
from cuaderno.servicios.sesiones import buscar_en_explotacion

router = APIRouter(prefix="/tratamientos", tags=["tratamientos"])

PAGINA_MAXIMA = 1_000_000  # para que el desplazamiento quepa en la base


@router.get(
    "",
    summary="Consultar tratamientos ordenados por fecha, con filtros (REQ-10)",
    responses={422: VALIDACION},
)
def listar_tratamientos(
    s: SesionBD,
    explotacion: ExplotacionActual,
    desde: date | None = None,
    hasta: date | None = None,
    parcela_id: uuid.UUID | None = None,
    producto_id: uuid.UUID | None = None,
    pagina: Annotated[int, Query(ge=1, le=PAGINA_MAXIMA)] = 1,
    tamano: Annotated[int, Query(ge=1, le=200)] = 50,
) -> PaginaTratamientos:
    filtros = tratamientos.Filtros(desde, hasta, parcela_id, producto_id)
    return tratamientos.listar(s, explotacion.id, filtros, pagina, tamano)


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
