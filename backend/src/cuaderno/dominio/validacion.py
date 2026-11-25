"""Reglas de validación compartidas con la PWA (research R8).

La misma regla está en `frontend/src/dominio/validacion.ts`; las dos pasan los casos de
`compartido/casos-validacion.json`. Cada regla devuelve None si el dato es válido o el error con el
campo, un mensaje en lenguaje llano y el REQ-xx que la pide; la del tratamiento, la lista de sus
errores.
"""

import re
from collections.abc import Mapping, Sequence
from datetime import date
from decimal import Decimal
from typing import Any, TypedDict


class ErrorRegla(TypedDict):
    campo: str
    mensaje: str
    req: str


class DatosNoValidos(Exception):
    """Datos rechazados por una o varias reglas; la API responde 422 con todos los errores."""

    def __init__(self, errores: list[ErrorRegla]) -> None:
        super().__init__("; ".join(error["mensaje"] for error in errores))
        self.errores = errores


CONTRASENA_MINIMA = 15
CONTRASENA_MAXIMA = 128
CORREO_MAXIMO = 254
_FORMATO_CORREO = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


def validar_contrasena(valor: str) -> ErrorRegla | None:
    """De 15 a 128 caracteres de cualquier tipo, sin reglas de composición (REQ-20; R9).

    Se cuentan caracteres Unicode (puntos de código), no bytes.
    """
    if CONTRASENA_MINIMA <= len(valor) <= CONTRASENA_MAXIMA:
        return None
    return {
        "campo": "contrasena",
        "mensaje": "La contraseña debe tener entre 15 y 128 caracteres.",
        "req": "REQ-20",
    }


def validar_correo(valor: str) -> ErrorRegla | None:
    """Forma nombre@dominio.ext, sin espacios dentro y de 254 caracteres como mucho (REQ-20).

    Los espacios de los lados no cuentan. Se rechaza el carácter nulo, que la base no puede guardar.
    """
    valor = valor.strip()
    if len(valor) <= CORREO_MAXIMO and "\0" not in valor and _FORMATO_CORREO.fullmatch(valor):
        return None
    return {
        "campo": "correo",
        "mensaje": "Escribe un correo electrónico válido, por ejemplo nombre@dominio.es.",
        "req": "REQ-20",
    }


# --- Tratamiento (REQ-02 y REQ-04) ---

PROBLEMA_MAXIMO = 200
CULTIVO_MAXIMO = 100
PRODUCTO_SEMILLA_MAXIMO = 150
OBSERVACIONES_MAXIMO = 2000
DECIMALES_SUPERFICIE = 2  # NUMERIC(10,2)
DECIMALES_CANTIDAD = 3  # NUMERIC(12,3)
CANTIDAD_TOPE = 1_000_000_000
EFICACIAS = ("buena", "regular", "mala")
UNIDADES = ("kg", "L")
_FORMATO_FECHA = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")


def _error(campo: str, mensaje: str, req: str = "REQ-04") -> ErrorRegla:
    return {"campo": campo, "mensaje": mensaje, "req": req}


def _falta(valor: object) -> bool:
    return valor is None or (isinstance(valor, str) and not valor.strip())


def _decimal(valor: object) -> Decimal | None:
    """El número exacto tal como se escribe (3.5 → 3,5), sin arrastrar el error binario."""
    if isinstance(valor, bool) or not isinstance(valor, int | float | Decimal):
        return None
    numero = Decimal(str(valor))
    return numero if numero.is_finite() else None


def _decimales(numero: Decimal) -> int:
    exponente = numero.normalize().as_tuple().exponent
    return max(0, -exponente) if isinstance(exponente, int) else 0


def en_espanol(numero: Decimal) -> str:
    """Número con coma decimal y sin ceros sobrantes, como se escribe en español."""
    return format(numero.normalize(), "f").replace(".", ",")


def _validar_texto(
    valor: object, campo: str, maximo: int, si_falta: str | None
) -> list[ErrorRegla]:
    if _falta(valor):
        return [] if si_falta is None else [_error(campo, si_falta, "REQ-02")]
    if len(str(valor).strip()) > maximo:
        return [_error(campo, f"Puede tener como mucho {maximo} caracteres.")]
    return []


def _validar_fecha(valor: object, hoy: date) -> list[ErrorRegla]:
    if _falta(valor):
        return [_error("fecha", "Falta la fecha del tratamiento.", "REQ-02")]
    texto = str(valor)
    try:
        if not _FORMATO_FECHA.fullmatch(texto):
            raise ValueError(texto)
        fecha = date.fromisoformat(texto)
    except ValueError:
        return [_error("fecha", "La fecha no es válida.")]
    if fecha > hoy:
        return [_error("fecha", "La fecha no puede ser posterior a hoy.")]
    return []


def _validar_numero(
    valor: object, campo: str, nombre: str, si_falta: str, decimales: int
) -> list[ErrorRegla]:
    if _falta(valor):
        return [_error(campo, si_falta, "REQ-02")]
    numero = _decimal(valor)
    if numero is None:
        return [_error(campo, f"{nombre} tiene que ser un número.")]
    if numero <= 0:
        return [_error(campo, f"{nombre} tiene que ser mayor que 0.")]
    if _decimales(numero) > decimales:
        return [_error(campo, f"{nombre} puede tener como mucho {decimales} decimales.")]
    return []


def _validar_superficie(valor: object, campo: str, de_la_parcela: object) -> list[ErrorRegla]:
    errores = _validar_numero(
        valor,
        campo,
        "La superficie tratada",
        "Falta la superficie tratada.",
        DECIMALES_SUPERFICIE,
    )
    tratada, maxima = _decimal(valor), _decimal(de_la_parcela)
    if not errores and tratada is not None and maxima is not None and tratada > maxima:
        errores.append(
            _error(
                campo,
                f"La superficie tratada ({en_espanol(tratada)} ha) es mayor que la de la parcela "
                f"({en_espanol(maxima)} ha).",
            )
        )
    return errores


def _validar_cantidad(valor: object, campo: str) -> list[ErrorRegla]:
    errores = _validar_numero(
        valor, campo, "La cantidad", "Falta la cantidad de producto.", DECIMALES_CANTIDAD
    )
    cantidad = _decimal(valor)
    if not errores and cantidad is not None and cantidad >= CANTIDAD_TOPE:
        errores.append(_error(campo, f"La cantidad tiene que ser menor que {CANTIDAD_TOPE}."))
    return errores


def _validar_parcelas(
    lineas: Sequence[Mapping[str, Any]], superficies: Mapping[str, Any]
) -> list[ErrorRegla]:
    if not lineas:
        return [_error("parcelas", "Elige al menos una parcela tratada.", "REQ-02")]
    errores: list[ErrorRegla] = []
    vistas: set[object] = set()
    for i, linea in enumerate(lineas):
        ruta = f"parcelas.{i}"
        parcela = linea.get("parcelaId")
        if _falta(parcela):
            errores.append(_error(f"{ruta}.parcelaId", "Elige la parcela.", "REQ-02"))
        elif parcela in vistas:
            errores.append(_error(f"{ruta}.parcelaId", "Esta parcela está repetida."))
        vistas.add(parcela)
        errores += _validar_superficie(
            linea.get("superficieTratada"),
            f"{ruta}.superficieTratada",
            superficies.get(str(parcela)),
        )
        for campo, maximo, si_falta in (
            ("cultivoEspecie", CULTIVO_MAXIMO, "Falta la especie del cultivo."),
            ("cultivoVariedad", CULTIVO_MAXIMO, "Falta la variedad del cultivo."),
            ("productoSemilla", PRODUCTO_SEMILLA_MAXIMO, None),
        ):
            errores += _validar_texto(linea.get(campo), f"{ruta}.{campo}", maximo, si_falta)
    return errores


def _validar_productos(lineas: Sequence[Mapping[str, Any]]) -> list[ErrorRegla]:
    if not lineas:
        return [_error("productos", "Añade al menos un producto.", "REQ-02")]
    errores: list[ErrorRegla] = []
    vistos: set[object] = set()
    for i, linea in enumerate(lineas):
        ruta = f"productos.{i}"
        producto = linea.get("productoId")
        if _falta(producto):
            errores.append(_error(f"{ruta}.productoId", "Elige el producto.", "REQ-02"))
        elif producto in vistos:
            errores.append(
                _error(
                    f"{ruta}.productoId",
                    "Este producto está repetido: suma las cantidades en una sola línea.",
                )
            )
        vistos.add(producto)
        errores += _validar_cantidad(linea.get("cantidad"), f"{ruta}.cantidad")
        if linea.get("unidadMedida") not in UNIDADES:
            errores.append(_error(f"{ruta}.unidadMedida", "La cantidad se anota en kg o en L."))
    return errores


def validar_tratamiento(
    datos: Mapping[str, Any], hoy: date, superficies: Mapping[str, Any]
) -> list[ErrorRegla]:
    """Datos obligatorios (REQ-02) y rechazos (REQ-04) de un tratamiento; vacía si es válido.

    `datos` tiene los nombres del contrato (DatosTratamiento). `superficies` da la superficie en
    hectáreas de cada parcela conocida; si falta la de una parcela, no se compara.
    """
    errores = _validar_fecha(datos.get("fecha"), hoy)
    errores += _validar_parcelas(datos.get("parcelas") or [], superficies)
    errores += _validar_texto(
        datos.get("problema"),
        "problema",
        PROBLEMA_MAXIMO,
        "Falta la plaga o el problema que querías controlar.",
    )
    if _falta(datos.get("aplicadorId")):
        errores.append(_error("aplicadorId", "Falta quién aplicó el producto.", "REQ-02"))
    errores += _validar_productos(datos.get("productos") or [])
    if _falta(datos.get("equipoId")):
        errores.append(_error("equipoId", "Falta el equipo de aplicación.", "REQ-02"))
    eficacia = datos.get("eficacia")
    if eficacia is not None and eficacia not in EFICACIAS:
        errores.append(_error("eficacia", "La eficacia tiene que ser buena, regular o mala."))
    errores += _validar_texto(
        datos.get("observaciones"), "observaciones", OBSERVACIONES_MAXIMO, None
    )
    return errores
