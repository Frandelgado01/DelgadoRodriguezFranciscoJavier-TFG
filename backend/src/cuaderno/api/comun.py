"""Dependencias y respuestas documentadas comunes a las rutas de los datos de la explotación."""

from typing import Annotated, Any

from fastapi import Depends
from sqlmodel import Session

from cuaderno import modelos
from cuaderno.db import sesion as sesion_bd
from cuaderno.esquemas.base import ErrorValidacion, Mensaje
from cuaderno.reloj import Reloj, obtener_reloj
from cuaderno.servicios.sesiones import explotacion_actual

SesionBD = Annotated[Session, Depends(sesion_bd)]
ExplotacionActual = Annotated[modelos.Explotacion, Depends(explotacion_actual)]
RelojAPI = Annotated[Reloj, Depends(obtener_reloj)]

VALIDACION: dict[str, Any] = {"model": ErrorValidacion, "description": "Datos no válidos"}
NO_ENCONTRADO: dict[str, Any] = {
    "model": Mensaje,
    "description": "No existe en la explotación del usuario",
}
