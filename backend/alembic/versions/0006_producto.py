"""Productos fitosanitarios (T-25; REQ-16).

Revision ID: 0006_producto
Revises: 0005_persona_equipo
Create Date: 2026-11-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_producto"
down_revision: str | None = "0005_persona_equipo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # id generado por el cliente (R4); sin unicidad del número de registro (data-model).
    op.create_table(
        "producto",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "explotacion_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("explotacion.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("nombre_comercial", sa.Text(), nullable=False),
        sa.Column("numero_registro", sa.Text(), nullable=False),
        sa.Column("estado", sa.Text(), nullable=False, server_default="activa"),
        sa.Column("fecha_baja", sa.Date(), nullable=True),
        sa.CheckConstraint(
            "char_length(nombre_comercial) BETWEEN 1 AND 150",
            name="producto_nombre_comercial_check",
        ),
        sa.CheckConstraint(
            "char_length(numero_registro) BETWEEN 1 AND 30",
            name="producto_numero_registro_check",
        ),
        sa.CheckConstraint("estado IN ('activa', 'baja')", name="producto_estado_check"),
        sa.CheckConstraint(
            "(estado = 'baja') = (fecha_baja IS NOT NULL)", name="producto_fecha_baja_check"
        ),
    )
    op.create_index("producto_explotacion_id_idx", "producto", ["explotacion_id"])


def downgrade() -> None:
    op.drop_table("producto")
