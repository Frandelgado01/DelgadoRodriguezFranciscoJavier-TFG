"""Respuestas de error comunes de la API y restricción a JSON (REQ-04, REQ-20; research R9).

- 422: `ErrorValidacion`, un mensaje en lenguaje llano por campo con el REQ-xx que lo pide.
- Errores HTTP: `{"mensaje": ...}`.
- 415: la API solo acepta cuerpos `application/json`; junto con `SameSite=Strict` y el mismo origen
  cubre CSRF (R9), porque un formulario de otra web no puede enviar JSON.
"""

from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from cuaderno.esquemas.base import DatoNoValido

_UBICACIONES = {"body", "query", "path", "header", "cookie"}
_METODOS_CON_CUERPO = {"POST", "PUT", "PATCH", "DELETE"}


def _numero(valor: object) -> str:
    """Número con coma decimal, como se escribe en español."""
    return str(valor).replace(".", ",")


def _mensaje(tipo: str, ctx: dict[str, Any]) -> str:
    """Mensaje en lenguaje llano para los errores de tipo y de rango de Pydantic (principio V)."""
    match tipo:
        case "missing":
            return "Falta este dato."
        case "json_invalid":
            return "Los datos enviados no son JSON válido."
        case "greater_than":
            return f"Tiene que ser mayor que {_numero(ctx['gt'])}."
        case "greater_than_equal":
            return f"Tiene que ser {_numero(ctx['ge'])} o más."
        case "less_than":
            return f"Tiene que ser menor que {_numero(ctx['lt'])}."
        case "less_than_equal":
            return f"Tiene que ser {_numero(ctx['le'])} o menos."
        case "string_too_short":
            return "No puede quedar vacío."
        case "string_too_long":
            return f"Puede tener como mucho {ctx['max_length']} caracteres."
        case "literal_error":
            opciones = str(ctx["expected"]).replace("'", "").replace(" or ", " o ")
            return f"Elige una de estas opciones: {opciones}."
        case "bool_type" | "bool_parsing":
            return "Tiene que ser sí o no."
        case "int_type" | "int_parsing" | "int_from_float":
            return "Tiene que ser un número entero."
        case "float_type" | "float_parsing" | "finite_number":
            return "Tiene que ser un número."
        case "date_type" | "date_parsing" | "date_from_datetime_parsing":
            return "Tiene que ser una fecha (AAAA-MM-DD)."
        case "uuid_type" | "uuid_parsing":
            return "El identificador no es válido."
        case _:
            return "El dato no es válido."


def _error_campo(error: dict[str, Any]) -> dict[str, str]:
    ubicacion = [str(parte) for parte in error.get("loc", ())]
    if ubicacion and ubicacion[0] in _UBICACIONES:
        ubicacion = ubicacion[1:]
    campo = ".".join(ubicacion)
    ctx = error.get("ctx", {})
    causa = ctx.get("error")
    if isinstance(causa, DatoNoValido):
        return {"campo": campo, "mensaje": causa.mensaje, "req": causa.req}
    return {"campo": campo, "mensaje": _mensaje(str(error.get("type")), ctx)}


async def _validacion(_peticion: Request, error: Exception) -> Response:
    assert isinstance(error, RequestValidationError)  # noqa: S101 (contrato del manejador)
    errores = [_error_campo(e) for e in error.errors()]
    return JSONResponse({"errores": errores}, status.HTTP_422_UNPROCESSABLE_CONTENT)


async def _http(_peticion: Request, error: Exception) -> Response:
    assert isinstance(error, HTTPException)  # noqa: S101 (contrato del manejador)
    if error.status_code == status.HTTP_204_NO_CONTENT or error.status_code < 400:
        return Response(status_code=error.status_code, headers=error.headers)
    return JSONResponse({"mensaje": error.detail}, error.status_code, headers=error.headers)


def _es_json(tipo: str) -> bool:
    return tipo.split(";", 1)[0].strip().lower() == "application/json"


async def _solo_json(
    peticion: Request, siguiente: Callable[[Request], Awaitable[Response]]
) -> Response:
    if peticion.method in _METODOS_CON_CUERPO:
        tipo = peticion.headers.get("content-type")
        con_cuerpo = (
            peticion.headers.get("content-length", "0") != "0"
            or "transfer-encoding" in peticion.headers
        )
        if (tipo is not None and not _es_json(tipo)) or (tipo is None and con_cuerpo):
            return JSONResponse(
                {"mensaje": "La API solo acepta datos en formato JSON (application/json)."},
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )
    return await siguiente(peticion)


def registrar(api: FastAPI) -> None:
    api.add_exception_handler(RequestValidationError, _validacion)
    api.add_exception_handler(HTTPException, _http)
    api.middleware("http")(_solo_json)
