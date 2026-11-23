"""Tablas de cuentas y sesiones (data-model.md, "Cuentas"; REQ-20; research R9).

Las restricciones que no se expresan bien en el modelo (unicidad de `lower(correo)`) están en la
migración de Alembic, que es la que crea el esquema.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, LargeBinary
from sqlmodel import Field, SQLModel


def _instante(nulo: bool = False) -> Column[datetime]:
    """Columna TIMESTAMPTZ."""
    return Column(DateTime(timezone=True), nullable=nulo)


class Usuario(SQLModel, table=True):
    """Cuenta del agricultor titular. El correo es el único dato personal (REQ-21)."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # UNIQUE sobre lower(correo), en la migración.
    correo: str = Field(nullable=False)
    # Argon2id en formato PHC de pwdlib; la contraseña en claro no se guarda.
    hash_contrasena: str = Field(nullable=False)
    creado_en: datetime = Field(sa_column=_instante())


class Explotacion(SQLModel, table=True):
    """Explotación del agricultor; filtra todas las consultas (una por usuario)."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    usuario_id: uuid.UUID = Field(
        sa_column=Column(ForeignKey("usuario.id", ondelete="RESTRICT"), nullable=False, unique=True)
    )
    creada_en: datetime = Field(sa_column=_instante())


class Sesion(SQLModel, table=True):
    """Sesión iniciada. Solo se guarda el SHA-256 del token; el token viaja en la cookie."""

    hash_token: bytes = Field(sa_column=Column(LargeBinary, primary_key=True))
    usuario_id: uuid.UUID = Field(
        sa_column=Column(ForeignKey("usuario.id", ondelete="RESTRICT"), nullable=False)
    )
    creada_en: datetime = Field(sa_column=_instante())
    ultimo_uso: datetime = Field(sa_column=_instante())
    expira_en: datetime = Field(sa_column=_instante())
    revocada_en: datetime | None = Field(default=None, sa_column=_instante(nulo=True))
