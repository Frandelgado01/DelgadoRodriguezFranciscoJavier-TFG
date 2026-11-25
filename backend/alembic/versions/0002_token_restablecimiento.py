"""Token de restablecimiento de la contraseña (T-12; REQ-21).

Revision ID: 0002_token_restablecimiento
Revises: 0001_cuentas
Create Date: 2026-11-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_token_restablecimiento"
down_revision: str | None = "0001_cuentas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "token_restablecimiento",
        sa.Column("hash_token", postgresql.BYTEA(), primary_key=True),
        sa.Column(
            "usuario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("usuario.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("usado_en", sa.DateTime(timezone=True), nullable=True),
    )
    # El límite de 3 solicitudes por hora cuenta los tokens recientes de cada usuario.
    op.create_index(
        "token_restablecimiento_usuario_idx", "token_restablecimiento", ["usuario_id", "creado_en"]
    )


def downgrade() -> None:
    op.drop_table("token_restablecimiento")
