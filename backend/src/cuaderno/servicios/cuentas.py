"""Cuentas: alta y verificación de credenciales (REQ-20; research R9)."""

from datetime import datetime
from functools import cache

from pwdlib import PasswordHash
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from cuaderno.modelos import Explotacion, Usuario

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
