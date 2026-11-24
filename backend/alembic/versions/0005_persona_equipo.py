"""Personas que aplican o asesoran y equipos de aplicación (T-23; REQ-15).

Revision ID: 0005_persona_equipo
Revises: 0004_parcela
Create Date: 2026-11-24
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_persona_equipo"
down_revision: str | None = "0004_parcela"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def columnas_maestro(tabla: str) -> list[Any]:
    """Clave, explotación, estado y baja lógica, comunes a los datos maestros (REQ-17)."""
    return [
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "explotacion_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("explotacion.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("estado", sa.Text(), nullable=False, server_default="activa"),
        sa.Column("fecha_baja", sa.Date(), nullable=True),
        sa.CheckConstraint("estado IN ('activa', 'baja')", name=f"{tabla}_estado_check"),
        sa.CheckConstraint(
            "(estado = 'baja') = (fecha_baja IS NOT NULL)", name=f"{tabla}_fecha_baja_check"
        ),
    ]


def upgrade() -> None:
    # Sin NIF ni otros datos personales (REQ-15; principio VI).
    op.create_table(
        "persona",
        *columnas_maestro("persona"),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("numero_carne", sa.Text(), nullable=False),
        sa.CheckConstraint("char_length(nombre) BETWEEN 1 AND 150", name="persona_nombre_check"),
        sa.CheckConstraint("tipo IN ('aplicador', 'asesor')", name="persona_tipo_check"),
        sa.CheckConstraint(
            "char_length(numero_carne) BETWEEN 1 AND 30", name="persona_numero_carne_check"
        ),
    )
    op.create_index("persona_explotacion_id_idx", "persona", ["explotacion_id"])

    op.create_table(
        "equipo",
        *columnas_maestro("equipo"),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("fecha_adquisicion_o_inspeccion", sa.Date(), nullable=False),
        sa.Column("numero_roma", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "char_length(descripcion) BETWEEN 1 AND 150", name="equipo_descripcion_check"
        ),
        sa.CheckConstraint(
            "numero_roma IS NULL OR char_length(numero_roma) BETWEEN 1 AND 30",
            name="equipo_numero_roma_check",
        ),
    )
    op.create_index("equipo_explotacion_id_idx", "equipo", ["explotacion_id"])


def downgrade() -> None:
    op.drop_table("equipo")
    op.drop_table("persona")
