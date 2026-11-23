"""Sesiones: token, cookie, caducidad, acceso a la explotación y límite de intentos.

REQ-20 y REQ-22; research R9.
"""

import hashlib
import math
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Annotated, Any, Protocol

from fastapi import Depends, HTTPException, Response, status
from fastapi.security import APIKeyCookie
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

from cuaderno.db import sesion as sesion_bd
from cuaderno.modelos import Explotacion, IntentoAcceso, Sesion, Usuario
from cuaderno.reloj import Reloj, obtener_reloj
from cuaderno.servicios import cuentas

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


# --- Límite de intentos (REQ-22) ---

FALLOS_MAXIMOS = 5
VENTANA_FALLOS = timedelta(minutes=15)
ESPERA = timedelta(minutes=15)


@dataclass(frozen=True)
class EsperaPendiente:
    """El correo está en espera: no se verifica la contraseña."""

    segundos: int

    @property
    def mensaje(self) -> str:
        minutos = math.ceil(self.segundos / 60)
        unidad = "minuto" if minutos == 1 else "minutos"
        return (
            f"Has fallado la contraseña {FALLOS_MAXIMOS} veces. "
            f"Espera {minutos} {unidad} o recupera tu contraseña."
        )


def _intento_bloqueado(s: Session, correo: str) -> IntentoAcceso:
    """Fila del correo, creada si no existe y bloqueada hasta el final de la transacción.

    Así dos peticiones simultáneas con el mismo correo se atienden de una en una (R9).
    """
    clave = cuentas.normalizar_correo(correo)
    s.exec(
        insert(IntentoAcceso)
        .values(correo_normalizado=clave, fallos_consecutivos=0)
        .on_conflict_do_nothing(index_elements=["correo_normalizado"])
    )
    return s.exec(
        select(IntentoAcceso).where(IntentoAcceso.correo_normalizado == clave).with_for_update()
    ).one()


def autenticar(
    s: Session, correo: str, contrasena: str, ahora: datetime
) -> Usuario | EsperaPendiente | None:
    """Comprueba la espera antes de verificar la contraseña y anota el resultado.

    Devuelve el usuario si entra, la espera si el correo está bloqueado o None si falla. Igual
    exista o no la cuenta. La transacción queda pendiente de confirmar.
    """
    intento = _intento_bloqueado(s, correo)
    if intento.bloqueado_hasta is not None and intento.bloqueado_hasta > ahora:
        return EsperaPendiente(math.ceil((intento.bloqueado_hasta - ahora).total_seconds()))

    usuario = cuentas.verificar_credenciales(s, correo, contrasena)
    if usuario is not None:
        s.delete(intento)
        return usuario

    ventana_caducada = (
        intento.primer_fallo_en is None
        or ahora - intento.primer_fallo_en > VENTANA_FALLOS
        or intento.bloqueado_hasta is not None
    )
    if ventana_caducada:
        intento.fallos_consecutivos = 1
        intento.primer_fallo_en = ahora
        intento.bloqueado_hasta = None
    else:
        intento.fallos_consecutivos += 1
    if intento.fallos_consecutivos >= FALLOS_MAXIMOS:
        intento.bloqueado_hasta = ahora + ESPERA
    s.add(intento)
    return None


def borrar_intentos(s: Session, correo: str) -> None:
    """Pone el contador a cero (restablecimiento de la contraseña)."""
    intento = s.get(IntentoAcceso, cuentas.normalizar_correo(correo))
    if intento is not None:
        s.delete(intento)
