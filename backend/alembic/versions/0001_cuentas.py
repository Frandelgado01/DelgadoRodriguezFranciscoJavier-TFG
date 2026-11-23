"""Cuentas: usuario, explotación y sesión (T-10; REQ-20).

Revision ID: 0001_cuentas
Revises:
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_cuentas"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _instante(nombre: str, nulo: bool = False) -> sa.Column[sa.DateTime]:
    return sa.Column(nombre, sa.DateTime(timezone=True), nullable=nulo)


def upgrade() -> None:
    op.create_table(
        "usuario",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("correo", sa.Text(), nullable=False),
        sa.Column("hash_contrasena", sa.Text(), nullable=False),
        _instante("creado_en"),
    )
    # Un correo no se repite aunque cambien las mayúsculas.
    op.create_index("usuario_correo_key", "usuario", [sa.text("lower(correo)")], unique=True)
    op.create_table(
        "explotacion",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuario.id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        _instante("creada_en"),
    )
    op.create_table(
        "sesion",
        sa.Column("hash_token", postgresql.BYTEA(), primary_key=True),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuario.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        _instante("creada_en"),
        _instante("ultimo_uso"),
        _instante("expira_en"),
        _instante("revocada_en", nulo=True),
    )
    op.create_index("sesion_usuario_id_idx", "sesion", ["usuario_id"])


def downgrade() -> None:
    op.drop_table("sesion")
    op.drop_table("explotacion")
    op.drop_index("usuario_correo_key", table_name="usuario")
    op.drop_table("usuario")
