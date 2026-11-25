"""Rutas de parcelas (contrato: /parcelas*; REQ-14)."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
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
from cuaderno.esquemas.base import Mensaje
from cuaderno.esquemas.parcela import Parcela, ParcelaEntrada, ReferenciaSigpac
from cuaderno.servicios.sesiones import buscar_en_explotacion

router = APIRouter(prefix="/parcelas", tags=["parcelas"])

_SIGPAC_REPETIDA = {
    "model": Mensaje,
    "description": "Ya hay una parcela activa con esa referencia SIGPAC",
}
MENSAJE_SIGPAC_REPETIDA = (
    "Ya tienes una parcela activa con esa referencia SIGPAC. Revisa el recinto o modifica la "
    "parcela que ya existe."
)


def a_esquema(p: modelos.Parcela) -> Parcela:
    return Parcela(
        id=p.id,
        numero_orden=p.numero_orden,
        nombre=p.nombre,
        sigpac=ReferenciaSigpac(
            provincia=p.sigpac_provincia,
            municipio=p.sigpac_municipio,
            agregado=p.sigpac_agregado,
            zona=p.sigpac_zona,
            poligono=p.sigpac_poligono,
            parcela=p.sigpac_parcela,
            recinto=p.sigpac_recinto,
        ),
        superficie=float(p.superficie),
        uso_sigpac=p.uso_sigpac,
        aprovechamiento=p.aprovechamiento,  # type: ignore[arg-type]
        cultivo_lenoso=p.cultivo_lenoso,
        cultivo_especie=p.cultivo_especie,
        cultivo_variedad=p.cultivo_variedad,
        sistema_explotacion=p.sistema_explotacion,  # type: ignore[arg-type]
        sistema_riego=p.sistema_riego,
        protegido=p.protegido,
        tipo_proteccion=p.tipo_proteccion,
        sistema_certificacion=p.sistema_certificacion,
        marco_control_plagas=p.marco_control_plagas,
        estado=p.estado,  # type: ignore[arg-type]
        fecha_baja=p.fecha_baja,
    )


def _columnas(datos: ParcelaEntrada) -> dict[str, Any]:
    """Columnas de la fila con los datos del agricultor; sin el número de orden ni el estado."""
    columnas = datos.model_dump(exclude={"sigpac"})
    columnas.update({f"sigpac_{c}": v for c, v in datos.sigpac.model_dump().items()})
    return columnas


def _guardar(s: Session, p: modelos.Parcela) -> Parcela:
    """Confirma la transacción; 409 si la referencia SIGPAC ya es de otra parcela activa."""
    try:
        s.commit()
    except IntegrityError as error:
        s.rollback()
        restriccion = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
        if restriccion == "parcela_sigpac_activa_key":
            raise HTTPException(status.HTTP_409_CONFLICT, MENSAJE_SIGPAC_REPETIDA) from error
        raise
    s.refresh(p)
    return a_esquema(p)


def _siguiente_numero(s: Session, explotacion_id: uuid.UUID) -> int:
    """Siguiente número de orden de la explotación (A.2.a).

    El UPDATE bloquea la fila de la explotación hasta el final de la transacción, así que dos
    altas simultáneas no reciben el mismo número; el contador nunca baja, así que un número no se
    reutiliza aunque la parcela se dé de baja.
    """
    contador = col(modelos.Explotacion.ultimo_numero_parcela)
    numero: int = s.exec(
        update(modelos.Explotacion)
        .where(col(modelos.Explotacion.id) == explotacion_id)
        .values(ultimo_numero_parcela=contador + 1)
        .returning(contador)
    ).scalar_one()
    return numero


@router.get("", summary="Listar parcelas (REQ-14)")
def listar_parcelas(
    s: SesionBD, explotacion: ExplotacionActual, incluir_bajas: IncluirBajas = False
) -> list[Parcela]:
    consulta = de_la_explotacion(modelos.Parcela, explotacion.id, incluir_bajas)
    filas = s.exec(consulta.order_by(col(modelos.Parcela.numero_orden))).all()
    return [a_esquema(p) for p in filas]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Dar de alta una parcela (REQ-14)",
    responses={409: _SIGPAC_REPETIDA, 422: VALIDACION},
)
def crear_parcela(datos: ParcelaEntrada, s: SesionBD, explotacion: ExplotacionActual) -> Parcela:
    parcela = modelos.Parcela.model_validate(
        _columnas(datos)
        | {"explotacion_id": explotacion.id, "numero_orden": _siguiente_numero(s, explotacion.id)}
    )
    s.add(parcela)
    return _guardar(s, parcela)


@router.put(
    "/{id}",
    summary="Modificar una parcela (REQ-14); no altera tratamientos anteriores (REQ-05)",
    responses={404: NO_ENCONTRADO, 409: _SIGPAC_REPETIDA, 422: VALIDACION},
)
def modificar_parcela(
    id: uuid.UUID, datos: ParcelaEntrada, s: SesionBD, explotacion: ExplotacionActual
) -> Parcela:
    parcela = buscar_en_explotacion(s, modelos.Parcela, id, explotacion.id)
    parcela.sqlmodel_update(_columnas(datos))
    s.add(parcela)
    return _guardar(s, parcela)


@router.post(
    "/{id}/baja",
    summary="Dar de baja una parcela (REQ-17)",
    responses={404: NO_ENCONTRADO},
)
def dar_de_baja_parcela(
    id: uuid.UUID, s: SesionBD, explotacion: ExplotacionActual, reloj: RelojAPI
) -> Parcela:
    return a_esquema(dar_de_baja(s, modelos.Parcela, id, explotacion.id, reloj.hoy()))
