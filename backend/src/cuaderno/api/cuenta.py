"""Rutas de cuenta, sesión y recuperación (contrato: /cuenta*, /sesion; REQ-20, REQ-21)."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse
from sqlmodel import Session

from cuaderno.db import sesion as sesion_bd
from cuaderno.esquemas.base import ErrorValidacion, Mensaje
from cuaderno.esquemas.cuenta import (
    ConfirmacionRecuperacion,
    Credenciales,
    Cuenta,
    SolicitudRecuperacion,
)
from cuaderno.modelos import Explotacion, Usuario
from cuaderno.reloj import Reloj, obtener_reloj
from cuaderno.servicios import cuentas, sesiones

router = APIRouter(tags=["cuenta"])

_VALIDACION = {"model": ErrorValidacion, "description": "Datos no válidos"}
_NO_AUTENTICADO = {"model": Mensaje, "description": "Sesión ausente, caducada o revocada"}

SesionBD = Annotated[Session, Depends(sesion_bd)]
RelojAPI = Annotated[Reloj, Depends(obtener_reloj)]


@router.post(
    "/cuenta",
    status_code=status.HTTP_201_CREATED,
    summary="Crear cuenta y explotación (REQ-20)",
    responses={
        409: {"model": Mensaje, "description": "Ya existe una cuenta con ese correo"},
        422: _VALIDACION,
    },
)
def crear_cuenta(datos: Credenciales, respuesta: Response, s: SesionBD, reloj: RelojAPI) -> Cuenta:
    ahora = reloj.ahora()
    try:
        explotacion = cuentas.crear_cuenta(s, datos.correo, datos.contrasena, ahora)
    except cuentas.CorreoRepetido as error:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo."
        ) from error
    token = sesiones.crear_sesion(s, explotacion.usuario_id, ahora)
    s.commit()
    sesiones.poner_cookie(respuesta, token)
    return Cuenta(correo=datos.correo, explotacion_id=explotacion.id)


@router.get(
    "/cuenta/yo",
    summary="Datos de la cuenta de la sesión (REQ-20)",
    responses={401: _NO_AUTENTICADO},
)
def yo(
    usuario: Annotated[Usuario, Depends(sesiones.usuario_actual)],
    explotacion: Annotated[Explotacion, Depends(sesiones.explotacion_actual)],
) -> Cuenta:
    return Cuenta(correo=usuario.correo, explotacion_id=explotacion.id)


@router.post(
    "/sesion",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Iniciar sesión (REQ-20)",
    responses={
        401: {"model": Mensaje, "description": "Correo o contraseña incorrectos"},
        422: _VALIDACION,
    },
)
def iniciar_sesion(datos: Credenciales, s: SesionBD, reloj: RelojAPI) -> Response:
    usuario = cuentas.verificar_credenciales(s, datos.correo, datos.contrasena)
    if usuario is None:
        return JSONResponse(
            {"mensaje": "Correo o contraseña incorrectos"}, status.HTTP_401_UNAUTHORIZED
        )
    token = sesiones.crear_sesion(s, usuario.id, reloj.ahora())
    s.commit()
    respuesta = Response(status_code=status.HTTP_204_NO_CONTENT)
    sesiones.poner_cookie(respuesta, token)
    return respuesta


@router.delete(
    "/sesion",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Cerrar sesión; invalida el token en el servidor (REQ-20)",
)
def cerrar_sesion(
    token: Annotated[str | None, Depends(sesiones.cookie_sesion)], s: SesionBD, reloj: RelojAPI
) -> Response:
    if token:
        sesiones.revocar_sesion(s, token, reloj.ahora())
        s.commit()
    respuesta = Response(status_code=status.HTTP_204_NO_CONTENT)
    sesiones.borrar_cookie(respuesta)
    return respuesta


MENSAJE_RECUPERACION = (
    "Si hay una cuenta con ese correo, te hemos enviado un enlace para restablecer la contraseña. "
    "Caduca en 1 hora."
)


@router.post(
    "/cuenta/recuperacion",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Solicitar el enlace de restablecimiento por correo (REQ-21)",
    responses={422: _VALIDACION},
)
def solicitar_recuperacion(
    datos: SolicitudRecuperacion, tareas: BackgroundTasks, s: SesionBD, reloj: RelojAPI
) -> Mensaje:
    """Responde siempre igual; el correo se envía después de responder (R10)."""
    envio = cuentas.solicitar_recuperacion(s, datos.correo, reloj.ahora())
    s.commit()
    if envio is not None:
        tareas.add_task(cuentas.enviar_correo_recuperacion, envio)
    return Mensaje(mensaje=MENSAJE_RECUPERACION)


@router.post(
    "/cuenta/recuperacion/confirmar",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Fijar una contraseña nueva con el token del enlace (REQ-21)",
    responses={
        400: {"model": Mensaje, "description": "Enlace no válido o caducado"},
        422: _VALIDACION,
    },
)
def confirmar_recuperacion(
    datos: ConfirmacionRecuperacion, s: SesionBD, reloj: RelojAPI
) -> Response:
    """Cambia la contraseña y cierra todas las sesiones; no inicia sesión."""
    try:
        cuentas.confirmar_recuperacion(s, datos.token, datos.contrasena, reloj.ahora())
    except cuentas.EnlaceNoValido as error:
        s.rollback()
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "El enlace no es válido o ha caducado. Pide otro."
        ) from error
    s.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
