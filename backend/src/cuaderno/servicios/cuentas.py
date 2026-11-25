"""Cuentas: alta, verificación de credenciales y recuperación (REQ-20, REQ-21; research R9)."""

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import cache

from pwdlib import PasswordHash
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from cuaderno.config import leer_config
from cuaderno.modelos import Explotacion, Sesion, TokenRestablecimiento, Usuario
from cuaderno.servicios import correo

VALIDEZ_ENLACE = timedelta(hours=1)
SOLICITUDES_POR_HORA = 3

# Argon2id con los parámetros por defecto de pwdlib, por encima de los mínimos de OWASP (R9).
_hasher = PasswordHash.recommended()


class CorreoRepetido(Exception):
    """Ya hay una cuenta con ese correo."""


def normalizar_correo(correo: str) -> str:
    return correo.strip().lower()


@cache
def _hash_ficticio() -> str:
    """Hash con el que se verifica cuando el correo no tiene cuenta, para tardar lo mismo."""
    return _hasher.hash("contraseña ficticia para igualar el tiempo de respuesta")


def buscar_usuario(s: Session, correo: str) -> Usuario | None:
    consulta = select(Usuario).where(func.lower(Usuario.correo) == normalizar_correo(correo))
    return s.exec(consulta).first()


def cifrar_contrasena(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def crear_cuenta(s: Session, correo: str, contrasena: str, ahora: datetime) -> Explotacion:
    """Crea el usuario y su explotación, sin confirmar la transacción."""
    if buscar_usuario(s, correo) is not None:
        raise CorreoRepetido
    usuario = Usuario(
        correo=correo.strip(), hash_contrasena=cifrar_contrasena(contrasena), creado_en=ahora
    )
    s.add(usuario)
    try:
        s.flush()
    except IntegrityError as error:  # Otra petición creó el mismo correo a la vez.
        s.rollback()
        raise CorreoRepetido from error
    explotacion = Explotacion(usuario_id=usuario.id, creada_en=ahora)
    s.add(explotacion)
    s.flush()
    return explotacion


def verificar_credenciales(s: Session, correo: str, contrasena: str) -> Usuario | None:
    """El usuario si la contraseña es la suya; None si no, exista o no la cuenta."""
    usuario = buscar_usuario(s, correo)
    if usuario is None:
        _hasher.verify(contrasena, _hash_ficticio())
        return None
    return usuario if _hasher.verify(contrasena, usuario.hash_contrasena) else None


# --- Recuperación de la contraseña (REQ-21) ---


@dataclass(frozen=True)
class EnvioRecuperacion:
    """Correo pendiente de enviar fuera de la transacción (BackgroundTasks)."""

    destinatario: str
    token: str


def _hash_token(token: str) -> bytes:
    return hashlib.sha256(token.encode()).digest()


def solicitar_recuperacion(s: Session, correo: str, ahora: datetime) -> EnvioRecuperacion | None:
    """Crea un token si la cuenta existe y no ha pedido ya 3 en la última hora.

    Devuelve el correo que hay que enviar, o None; la API responde igual en los dos casos.
    """
    usuario = buscar_usuario(s, correo)
    if usuario is None:
        return None
    recientes = s.exec(
        select(func.count())
        .select_from(TokenRestablecimiento)
        .where(TokenRestablecimiento.usuario_id == usuario.id)
        .where(TokenRestablecimiento.creado_en > ahora - timedelta(hours=1))
    ).one()
    if recientes >= SOLICITUDES_POR_HORA:
        return None
    token = secrets.token_urlsafe(32)
    s.add(
        TokenRestablecimiento(
            hash_token=_hash_token(token),
            usuario_id=usuario.id,
            creado_en=ahora,
            expira_en=ahora + VALIDEZ_ENLACE,
        )
    )
    return EnvioRecuperacion(destinatario=usuario.correo, token=token)


def enviar_correo_recuperacion(envio: EnvioRecuperacion) -> None:
    """El enlace se construye con URL_PUBLICA, nunca con la cabecera Host de la petición."""
    enlace = f"{leer_config().url_publica}/restablecer?token={envio.token}"
    correo.enviar(
        envio.destinatario,
        "Restablece tu contraseña del Cuaderno de Campo",
        "Hola:\n\n"
        "Hemos recibido una solicitud para restablecer la contraseña de tu Cuaderno de Campo. "
        "Abre este enlace para elegir una contraseña nueva:\n\n"
        f"{enlace}\n\n"
        "El enlace caduca en 1 hora y solo se puede usar una vez. Si no lo has pedido tú, "
        "ignora este correo: tu contraseña no cambia.\n",
    )


class EnlaceNoValido(Exception):
    """El token no existe, ya se usó o ha caducado."""


def confirmar_recuperacion(s: Session, token: str, contrasena: str, ahora: datetime) -> Usuario:
    """Cambia la contraseña, gasta el token y los demás del usuario y cierra todas sus sesiones.

    No inicia sesión. Devuelve el usuario, sin confirmar la transacción.
    """
    fila = s.exec(
        select(TokenRestablecimiento)
        .where(TokenRestablecimiento.hash_token == _hash_token(token))
        .with_for_update()
    ).first()
    if fila is None or fila.usado_en is not None or ahora >= fila.expira_en:
        raise EnlaceNoValido
    usuario = s.get(Usuario, fila.usuario_id)
    if usuario is None:
        raise EnlaceNoValido
    usuario.hash_contrasena = cifrar_contrasena(contrasena)
    s.add(usuario)
    s.exec(
        update(TokenRestablecimiento)
        .where(col(TokenRestablecimiento.usuario_id) == usuario.id)
        .where(col(TokenRestablecimiento.usado_en).is_(None))
        .values(usado_en=ahora)
    )
    s.exec(
        update(Sesion)
        .where(col(Sesion.usuario_id) == usuario.id)
        .where(col(Sesion.revocada_en).is_(None))
        .values(revocada_en=ahora)
    )
    return usuario
