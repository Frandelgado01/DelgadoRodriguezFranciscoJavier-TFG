"""Intentos de acceso por correo (T-14; REQ-22).

Revision ID: 0003_intento_acceso
Revises: 0002_token_restablecimiento
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_intento_acceso"
down_revision: str | None = "0002_token_restablecimiento"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Sin clave foránea: el límite se aplica igual exista o no la cuenta. Sin contraseñas ni IP.
    op.create_table(
        "intento_acceso",
        sa.Column("correo_normalizado", sa.Text(), primary_key=True),
        sa.Column("fallos_consecutivos", sa.SmallInteger(), nullable=False),
        sa.Column("primer_fallo_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bloqueado_hasta", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("fallos_consecutivos >= 0", name="intento_acceso_fallos_check"),
    )


def downgrade() -> None:
    op.drop_table("intento_acceso")
