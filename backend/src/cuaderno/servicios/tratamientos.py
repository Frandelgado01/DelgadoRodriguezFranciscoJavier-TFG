"""Registro y lista de tratamientos fitosanitarios (REQ-01 a REQ-06, REQ-10, REQ-17; R4, R14).

Cada registro se guarda en una sola transacción: tratamiento, parcelas tratadas, productos aplicados
y el cambio `creacion` del historial con la instantánea completa.
"""

import uuid
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, col, func, select

from cuaderno import modelos
from cuaderno.config import ZONA_HORARIA
from cuaderno.dominio.dosis import calcular_dosis
from cuaderno.dominio.validacion import DatosNoValidos, ErrorRegla, validar_tratamiento
from cuaderno.esquemas.tratamiento import (
    DatosTratamiento,
    PaginaTratamientos,
    ParcelaTratada,
    ProductoAplicado,
    Tratamiento,
    TratamientoNuevo,
)
from cuaderno.modelos.maestro import DatoMaestro


def _de_la_explotacion[T: DatoMaestro](
    s: Session, modelo: type[T], ids: Iterable[uuid.UUID], explotacion_id: uuid.UUID
) -> dict[uuid.UUID, T]:
    """Los elementos con esos ids que son de la explotación, activos o no."""
    consulta = select(modelo).where(
        col(modelo.id).in_(set(ids)), col(modelo.explotacion_id) == explotacion_id
    )
    return {fila.id: fila for fila in s.exec(consulta)}


def _no_disponible(
    fila: DatoMaestro | None, campo: str, nombre: str, articulo: str
) -> ErrorRegla | None:
    """Error si el elemento no es de la explotación (REQ-20) o está de baja (REQ-17)."""
    if fila is None:
        mensaje = f"{articulo} {nombre} no existe en tu explotación."
        return {"campo": campo, "mensaje": mensaje, "req": "REQ-20"}
    if fila.estado != "activa":
        mensaje = f"{articulo} {nombre} está de baja y no se puede usar en un tratamiento nuevo."
        return {"campo": campo, "mensaje": mensaje, "req": "REQ-17"}
    return None


def _errores_persona(persona: modelos.Persona | None, campo: str, tipo: str) -> list[ErrorRegla]:
    error = _no_disponible(persona, campo, "persona", "Esta")
    if error is not None:
        return [error]
    if persona is not None and persona.tipo != tipo:
        articulo = "un aplicador" if tipo == "aplicador" else "un asesor"
        mensaje = f"{persona.nombre} no está dado de alta como {tipo}: elige {articulo}."
        return [{"campo": campo, "mensaje": mensaje, "req": "REQ-01"}]
    return []


def _errores_de_la_base(
    s: Session,
    datos: DatosTratamiento,
    explotacion_id: uuid.UUID,
    parcelas: dict[uuid.UUID, modelos.Parcela],
) -> list[ErrorRegla]:
    """Elementos de otra explotación, de baja o del tipo que no toca (REQ-01, REQ-17, REQ-20)."""
    candidatos: list[ErrorRegla | None] = [
        _no_disponible(parcelas.get(linea.parcela_id), f"parcelas.{i}.parcelaId", "parcela", "Esta")
        for i, linea in enumerate(datos.parcelas)
    ]
    ids_personas = [i for i in (datos.aplicador_id, datos.asesor_id) if i is not None]
    personas = _de_la_explotacion(s, modelos.Persona, ids_personas, explotacion_id)
    candidatos += _errores_persona(personas.get(datos.aplicador_id), "aplicadorId", "aplicador")
    if datos.asesor_id is not None:
        candidatos += _errores_persona(personas.get(datos.asesor_id), "asesorId", "asesor")
    equipos = _de_la_explotacion(s, modelos.Equipo, [datos.equipo_id], explotacion_id)
    candidatos.append(_no_disponible(equipos.get(datos.equipo_id), "equipoId", "equipo", "Este"))
    productos = _de_la_explotacion(
        s, modelos.Producto, [p.producto_id for p in datos.productos], explotacion_id
    )
    candidatos += [
        _no_disponible(
            productos.get(linea.producto_id), f"productos.{i}.productoId", "producto", "Este"
        )
        for i, linea in enumerate(datos.productos)
    ]
    return [error for error in candidatos if error is not None]


def _errores_de_registro(
    registrado_en: datetime, fecha_registro: date, fecha: date, ahora: datetime
) -> list[ErrorRegla]:
    """El momento del guardado no puede ser futuro ni anterior a la fecha (R14)."""
    if registrado_en > ahora:
        mensaje = "El momento en que se anotó es posterior a ahora: revisa la hora del dispositivo."
    elif fecha_registro < fecha:
        mensaje = "El momento en que se anotó es anterior a la fecha del tratamiento."
    else:
        return []
    return [{"campo": "registradoEn", "mensaje": mensaje, "req": "REQ-09"}]


def _instantanea(datos: TratamientoNuevo) -> dict[str, Any]:
    """Instantánea completa del tratamiento para el historial, sin datos calculados (R15)."""
    instantanea: dict[str, Any] = datos.model_dump(mode="json", by_alias=True)
    instantanea["registradoEn"] = datos.registrado_en.astimezone(UTC).isoformat()
    return instantanea


MENSAJE_ID_OCUPADO = (
    "Ya existe otro tratamiento con este identificador y distintos datos. Vuelve a guardarlo."
)


def _ya_registrado(
    s: Session, datos: TratamientoNuevo, explotacion_id: uuid.UUID
) -> modelos.Tratamiento | None:
    """El tratamiento con ese id si es un reintento; None si no hay ninguno (REQ-06; R4).

    Se compara con la instantánea de la creación: el tratamiento pudo cambiar después. Responde 409
    si tiene otro contenido o es de otra explotación.
    """
    tratamiento = s.get(modelos.Tratamiento, datos.id)
    if tratamiento is None:
        return None
    creacion = s.exec(
        select(modelos.Cambio).where(
            col(modelos.Cambio.tratamiento_id) == datos.id,
            col(modelos.Cambio.tipo) == "creacion",
        )
    ).one()
    if tratamiento.explotacion_id != explotacion_id or creacion.datos_nuevos != _instantanea(datos):
        raise HTTPException(status.HTTP_409_CONFLICT, MENSAJE_ID_OCUPADO)
    return tratamiento


def registrar(
    s: Session, datos: TratamientoNuevo, explotacion_id: uuid.UUID, ahora: datetime
) -> tuple[modelos.Tratamiento, bool]:
    """Guarda el tratamiento y dice si es nuevo; lanza DatosNoValidos con todos los errores.

    Un reintento no se vuelve a validar: ya está guardado, aunque después se diera de baja su
    parcela.
    """
    existente = _ya_registrado(s, datos, explotacion_id)
    if existente is not None:
        return existente, False

    parcelas = _de_la_explotacion(
        s, modelos.Parcela, [p.parcela_id for p in datos.parcelas], explotacion_id
    )
    fecha_registro = datos.registrado_en.astimezone(ZONA_HORARIA).date()
    errores = validar_tratamiento(
        datos.model_dump(mode="json", by_alias=True),
        hoy=ahora.astimezone(ZONA_HORARIA).date(),
        superficies={str(id_): p.superficie for id_, p in parcelas.items()},
    )
    if not any(error["campo"] == "fecha" for error in errores):
        errores += _errores_de_registro(datos.registrado_en, fecha_registro, datos.fecha, ahora)
    errores += _errores_de_la_base(s, datos, explotacion_id, parcelas)
    if errores:
        raise DatosNoValidos(errores)

    tratamiento = modelos.Tratamiento(
        **datos.model_dump(exclude={"parcelas", "productos"}),
        explotacion_id=explotacion_id,
        fecha_registro=fecha_registro,
        recibido_en=ahora,
    )
    # Espera a que termine un registro simultáneo con el mismo id: de varios reintentos a la vez
    # solo uno lo crea y los demás lo encuentran ya guardado con sus líneas.
    creado = s.exec(
        insert(modelos.Tratamiento)
        .values(**tratamiento.model_dump())
        .on_conflict_do_nothing(index_elements=["id"])
        .returning(col(modelos.Tratamiento.id))
    ).first()
    if creado is None:
        s.rollback()
        existente = _ya_registrado(s, datos, explotacion_id)
        assert existente is not None  # noqa: S101 (el conflicto es con una fila confirmada)
        return existente, False
    for parcela in datos.parcelas:
        linea = parcela.model_dump()
        linea["superficie_tratada"] = Decimal(str(parcela.superficie_tratada))
        s.add(modelos.TratamientoParcela(tratamiento_id=datos.id, **linea))
    for producto in datos.productos:
        linea = producto.model_dump()
        linea["cantidad"] = Decimal(str(producto.cantidad))
        s.add(modelos.TratamientoProducto(tratamiento_id=datos.id, **linea))
    s.add(
        modelos.Cambio(
            id=datos.id,  # la creación no lleva idOperacion: su operación es el propio registro
            tratamiento_id=datos.id,
            tipo="creacion",
            version_base=0,
            version_resultante=1,
            datos_nuevos=_instantanea(datos),
            realizado_en=datos.registrado_en,
            recibido_en=ahora,
        )
    )
    s.commit()
    return s.get_one(modelos.Tratamiento, datos.id), True


def a_esquema(s: Session, t: modelos.Tratamiento) -> Tratamiento:
    return a_esquemas(s, [t])[0]


def a_esquemas(s: Session, filas: Sequence[modelos.Tratamiento]) -> list[Tratamiento]:
    """Tratamientos con sus líneas: parcelas por número de orden y productos por nombre.

    Las líneas de todos se leen con dos consultas, para que una página no haga una por tratamiento.
    """
    ids = [t.id for t in filas]
    parcelas: dict[uuid.UUID, list[ParcelaTratada]] = {id_: [] for id_ in ids}
    lineas_parcela = s.exec(
        select(modelos.TratamientoParcela, modelos.Parcela.numero_orden)
        .join(modelos.Parcela)
        .where(col(modelos.TratamientoParcela.tratamiento_id).in_(ids))
        .order_by(col(modelos.Parcela.numero_orden))
    )
    superficies: dict[uuid.UUID, list[Decimal]] = {id_: [] for id_ in ids}
    for linea, numero_orden in lineas_parcela:
        superficies[linea.tratamiento_id].append(linea.superficie_tratada)
        parcelas[linea.tratamiento_id].append(
            ParcelaTratada(
                parcela_id=linea.parcela_id,
                numero_orden=numero_orden,
                superficie_tratada=float(linea.superficie_tratada),
                cultivo_especie=linea.cultivo_especie,
                cultivo_variedad=linea.cultivo_variedad,
                producto_semilla=linea.producto_semilla,
            )
        )
    productos: dict[uuid.UUID, list[ProductoAplicado]] = {id_: [] for id_ in ids}
    lineas_producto = s.exec(
        select(modelos.TratamientoProducto)
        .join(modelos.Producto)
        .where(col(modelos.TratamientoProducto.tratamiento_id).in_(ids))
        .order_by(col(modelos.Producto.nombre_comercial), col(modelos.Producto.id))
    )
    for aplicado in lineas_producto:
        (dosis,) = calcular_dosis(
            [(aplicado.cantidad, aplicado.unidad_medida)], superficies[aplicado.tratamiento_id]
        )
        productos[aplicado.tratamiento_id].append(
            ProductoAplicado(
                producto_id=aplicado.producto_id,
                cantidad=float(aplicado.cantidad),
                unidad_medida=aplicado.unidad_medida,  # type: ignore[arg-type]
                dosis_por_hectarea=float(dosis.por_hectarea),
                unidad_dosis=dosis.unidad,  # type: ignore[arg-type]
            )
        )
    return [
        Tratamiento(
            id=t.id,
            registrado_en=t.registrado_en.astimezone(UTC),
            fecha=t.fecha,
            problema=t.problema,
            aplicador_id=t.aplicador_id,
            asesor_id=t.asesor_id,
            equipo_id=t.equipo_id,
            parcelas=parcelas[t.id],
            productos=productos[t.id],
            eficacia=t.eficacia,  # type: ignore[arg-type]
            observaciones=t.observaciones,
            version=t.version,
            en_conflicto=t.en_conflicto,
        )
        for t in filas
    ]


@dataclass(frozen=True)
class Filtros:
    """Filtros de la lista (REQ-10). El del estado llega en T-54."""

    desde: date | None = None
    hasta: date | None = None
    parcela_id: uuid.UUID | None = None
    producto_id: uuid.UUID | None = None


def listar(
    s: Session, explotacion_id: uuid.UUID, filtros: Filtros, pagina: int, tamano: int
) -> PaginaTratamientos:
    """Página de tratamientos de la explotación, del más reciente al más antiguo, y el total."""
    tabla = modelos.Tratamiento
    condiciones = [col(tabla.explotacion_id) == explotacion_id]
    if filtros.desde is not None:
        condiciones.append(col(tabla.fecha) >= filtros.desde)
    if filtros.hasta is not None:
        condiciones.append(col(tabla.fecha) <= filtros.hasta)
    if filtros.parcela_id is not None:
        lineas = select(modelos.TratamientoParcela.tratamiento_id).where(
            col(modelos.TratamientoParcela.parcela_id) == filtros.parcela_id
        )
        condiciones.append(col(tabla.id).in_(lineas))
    if filtros.producto_id is not None:
        lineas = select(modelos.TratamientoProducto.tratamiento_id).where(
            col(modelos.TratamientoProducto.producto_id) == filtros.producto_id
        )
        condiciones.append(col(tabla.id).in_(lineas))
    total = s.exec(select(func.count()).select_from(tabla).where(*condiciones)).one()
    filas = s.exec(
        select(tabla)
        .where(*condiciones)
        .order_by(col(tabla.fecha).desc(), col(tabla.registrado_en).desc(), col(tabla.id))
        .offset((pagina - 1) * tamano)
        .limit(tamano)
    ).all()
    return PaginaTratamientos(elementos=a_esquemas(s, filas), total=total)
