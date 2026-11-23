"""Sesiones: token opaco, cookie, caducidad y acceso a la explotación (REQ-20; research R9)."""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Any, Protocol

from fastapi import Depends, HTTPException, Response, status
from fastapi.security import APIKeyCookie
from sqlmodel import Session, select

from cuaderno.db import sesion as sesion_bd
from cuaderno.modelos import Explotacion, Sesion, Usuario
from cuaderno.reloj import Reloj, obtener_reloj

NOMBRE_COOKIE = "__Host-sesion"
INACTIVIDAD_MAXIMA = timedelta(days=30)
DURACION_MAXIMA = timedelta(days=90)

# Mismo nombre de esquema de seguridad que el contrato (cookieSesion).
cookie_sesion = APIKeyCookie(name=NOMBRE_COOKIE, scheme_name="cookieSesion", auto_error=False)


def _hash(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def crear_sesion(s: Session, usuario_id: uuid.UUID, ahora: datetime) -> str:
    """Crea una sesión y devuelve su token (256 bits); en la base solo queda su SHA-256."""
    token = secrets.token_urlsafe(32)
    s.add(
        Sesion(
            hash_token=_hash(token),
            usuario_id=usuario_id,
            creada_en=ahora,
            ultimo_uso=ahora,
            expira_en=ahora + DURACION_MAXIMA,
        )
    )
    return token


def poner_cookie(respuesta: Response, token: str) -> None:
    """Cookie persistente para que la sesión se conserve en el dispositivo (REQ-20)."""
    respuesta.set_cookie(
        NOMBRE_COOKIE,
        token,
        max_age=int(DURACION_MAXIMA.total_seconds()),
        path="/",
        secure=True,
        httponly=True,
        samesite="strict",
    )


def borrar_cookie(respuesta: Response) -> None:
    respuesta.delete_cookie(NOMBRE_COOKIE, path="/", secure=True, httponly=True, samesite="strict")


def revocar_sesion(s: Session, token: str, ahora: datetime) -> None:
    sesion = s.get(Sesion, _hash(token))
    if sesion is not None and sesion.revocada_en is None:
        sesion.revocada_en = ahora
        s.add(sesion)


def _no_autenticado() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Inicia sesión para continuar.")


def usuario_actual(
    token: Annotated[str | None, Depends(cookie_sesion)],
    s: Annotated[Session, Depends(sesion_bd)],
    reloj: Annotated[Reloj, Depends(obtener_reloj)],
) -> Usuario:
    """Dependencia que exige una sesión válida y actualiza su último uso."""
    if not token:
        raise _no_autenticado()
    sesion = s.get(Sesion, _hash(token))
    ahora = reloj.ahora()
    if (
        sesion is None
        or sesion.revocada_en is not None
        or ahora >= sesion.expira_en
        or ahora - sesion.ultimo_uso >= INACTIVIDAD_MAXIMA
    ):
        raise _no_autenticado()
    sesion.ultimo_uso = ahora
    s.add(sesion)
    s.commit()
    usuario = s.get(Usuario, sesion.usuario_id)
    if usuario is None:
        raise _no_autenticado()
    return usuario


def explotacion_actual(
    usuario: Annotated[Usuario, Depends(usuario_actual)],
    s: Annotated[Session, Depends(sesion_bd)],
) -> Explotacion:
    """La explotación del usuario de la sesión; filtra todas las consultas (REQ-20)."""
    return s.exec(select(Explotacion).where(Explotacion.usuario_id == usuario.id)).one()


class _DeUnaExplotacion(Protocol):
    explotacion_id: uuid.UUID


class _ConGet(Protocol):
    def get(self, modelo: Any, id_: Any, /) -> Any: ...


def buscar_en_explotacion[T: _DeUnaExplotacion](
    s: _ConGet, modelo: type[T], id_: uuid.UUID, explotacion_id: uuid.UUID
) -> T:
    """El elemento con ese id si es de la explotación; 404 si no existe o es de otra (REQ-20)."""
    objeto: T | None = s.get(modelo, id_)
    if objeto is None or objeto.explotacion_id != explotacion_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No existe en tu explotación.")
    return objeto
