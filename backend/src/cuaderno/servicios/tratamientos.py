"""Registro de tratamientos fitosanitarios (REQ-01 a REQ-05, REQ-17; research R4, R14).

Cada registro se guarda en una sola transacción: tratamiento, parcelas tratadas, productos aplicados
y el cambio `creacion` del historial con la instantánea completa.
"""

import uuid
from collections.abc import Iterable
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlmodel import Session, col, select

from cuaderno import modelos
from cuaderno.config import ZONA_HORARIA
from cuaderno.dominio.validacion import DatosNoValidos, ErrorRegla, validar_tratamiento
from cuaderno.esquemas.tratamiento import (
    DatosTratamiento,
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


def registrar(
    s: Session, datos: TratamientoNuevo, explotacion_id: uuid.UUID, ahora: datetime
) -> modelos.Tratamiento:
    """Valida y guarda el tratamiento; lanza DatosNoValidos con todos los errores a la vez."""
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
    s.add(tratamiento)
    s.flush()
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
    return tratamiento


def a_esquema(s: Session, t: modelos.Tratamiento) -> Tratamiento:
    """Tratamiento con sus líneas: parcelas por número de orden y productos por nombre."""
    parcelas = s.exec(
        select(modelos.TratamientoParcela, modelos.Parcela.numero_orden)
        .join(modelos.Parcela)
        .where(col(modelos.TratamientoParcela.tratamiento_id) == t.id)
        .order_by(col(modelos.Parcela.numero_orden))
    ).all()
    productos = s.exec(
        select(modelos.TratamientoProducto)
        .join(modelos.Producto)
        .where(col(modelos.TratamientoProducto.tratamiento_id) == t.id)
        .order_by(col(modelos.Producto.nombre_comercial), col(modelos.Producto.id))
    ).all()
    return Tratamiento(
        id=t.id,
        registrado_en=t.registrado_en.astimezone(UTC),
        fecha=t.fecha,
        problema=t.problema,
        aplicador_id=t.aplicador_id,
        asesor_id=t.asesor_id,
        equipo_id=t.equipo_id,
        parcelas=[
            ParcelaTratada(
                parcela_id=linea.parcela_id,
                numero_orden=numero_orden,
                superficie_tratada=float(linea.superficie_tratada),
                cultivo_especie=linea.cultivo_especie,
                cultivo_variedad=linea.cultivo_variedad,
                producto_semilla=linea.producto_semilla,
            )
            for linea, numero_orden in parcelas
        ],
        productos=[
            ProductoAplicado(
                producto_id=linea.producto_id,
                cantidad=float(linea.cantidad),
                unidad_medida=linea.unidad_medida,  # type: ignore[arg-type]
            )
            for linea in productos
        ],
        eficacia=t.eficacia,  # type: ignore[arg-type]
        observaciones=t.observaciones,
        version=t.version,
        en_conflicto=t.en_conflicto,
    )
