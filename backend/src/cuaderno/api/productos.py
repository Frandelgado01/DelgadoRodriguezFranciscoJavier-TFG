"""Rutas de productos fitosanitarios (contrato: /productos*; REQ-16, REQ-06)."""

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import col, select

from cuaderno import modelos
from cuaderno.api.comun import VALIDACION, ExplotacionActual, SesionBD
from cuaderno.esquemas.base import Mensaje
from cuaderno.esquemas.producto import Producto, ProductoEntrada

router = APIRouter(prefix="/productos", tags=["productos"])

MENSAJE_ID_OCUPADO = (
    "Ya existe otro producto con este identificador y distintos datos. Vuelve a darlo de alta."
)


@router.get("", summary="Listar productos fitosanitarios (REQ-16)")
def listar_productos(s: SesionBD, explotacion: ExplotacionActual) -> list[Producto]:
    filas = s.exec(
        select(modelos.Producto)
        .where(modelos.Producto.explotacion_id == explotacion.id)
        .order_by(col(modelos.Producto.nombre_comercial))
    ).all()
    return [Producto.model_validate(p, from_attributes=True) for p in filas]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Dar de alta un producto, también desde el registro y sin conexión (REQ-16, REQ-06)",
    description="Idempotente por `id` (UUID del cliente). Un reintento con el mismo contenido "
    "devuelve 200.",
    responses={
        200: {"model": Producto, "description": "Ya existía con el mismo contenido (reintento)"},
        409: {
            "model": Mensaje,
            "description": "Existe otro producto con ese id y distinto contenido",
        },
        422: VALIDACION,
    },
)
def crear_producto(
    datos: ProductoEntrada, respuesta: Response, s: SesionBD, explotacion: ExplotacionActual
) -> Producto:
    """Creación idempotente por id (research R4).

    `ON CONFLICT DO NOTHING` espera a que termine un alta simultánea con el mismo id, así que de
    varios reintentos a la vez solo uno crea el producto y los demás lo encuentran.
    """
    creado = s.exec(
        insert(modelos.Producto)
        .values(
            id=datos.id,
            explotacion_id=explotacion.id,
            nombre_comercial=datos.nombre_comercial,
            numero_registro=datos.numero_registro,
            estado="activa",
        )
        .on_conflict_do_nothing(index_elements=["id"])
        .returning(col(modelos.Producto.id))
    ).first()
    s.commit()
    fila = s.get(modelos.Producto, datos.id)
    assert fila is not None  # noqa: S101 (se acaba de crear o ya existía)
    if creado is None:
        mismo = (
            fila.explotacion_id == explotacion.id
            and fila.nombre_comercial == datos.nombre_comercial
            and fila.numero_registro == datos.numero_registro
        )
        if not mismo:
            raise HTTPException(status.HTTP_409_CONFLICT, MENSAJE_ID_OCUPADO)
        respuesta.status_code = status.HTTP_200_OK
    return Producto.model_validate(fila, from_attributes=True)
