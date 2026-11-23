"""Piezas comunes de los esquemas: nombres en camelCase, errores de validación y mensajes."""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class Esquema(BaseModel):
    """Base de los esquemas: atributos en snake_case en Python y camelCase en JSON (contrato)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DatoNoValido(ValueError):
    """Dato rechazado por una regla, con su mensaje en lenguaje llano y el REQ-xx que la pide."""

    def __init__(self, mensaje: str, req: str) -> None:
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.req = req


class ErrorCampo(BaseModel):
    campo: str
    mensaje: str
    req: str | None = None


class ErrorValidacion(BaseModel):
    """Respuesta 422: un mensaje en lenguaje llano por campo (REQ-04, principio V)."""

    errores: list[ErrorCampo]


class Mensaje(BaseModel):
    """Respuesta de error con un mensaje en lenguaje llano."""

    mensaje: str
