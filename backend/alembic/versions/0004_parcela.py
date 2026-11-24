"""Parcelas y contador del número de orden (T-21; REQ-14).

Revision ID: 0004_parcela
Revises: 0003_intento_acceso
Create Date: 2026-11-24
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_parcela"
down_revision: str | None = "0003_intento_acceso"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

REFERENCIA_SIGPAC = [
    "sigpac_provincia",
    "sigpac_municipio",
    "sigpac_agregado",
    "sigpac_zona",
    "sigpac_poligono",
    "sigpac_parcela",
    "sigpac_recinto",
]


def columnas_maestro() -> list[sa.Column[Any]]:
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
    ]


def restricciones_maestro(tabla: str) -> list[sa.CheckConstraint]:
    return [
        sa.CheckConstraint("estado IN ('activa', 'baja')", name=f"{tabla}_estado_check"),
        sa.CheckConstraint(
            "(estado = 'baja') = (fecha_baja IS NOT NULL)", name=f"{tabla}_fecha_baja_check"
        ),
    ]


def upgrade() -> None:
    op.add_column(
        "explotacion",
        sa.Column("ultimo_numero_parcela", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_check_constraint(
        "explotacion_ultimo_numero_parcela_check", "explotacion", "ultimo_numero_parcela >= 0"
    )

    op.create_table(
        "parcela",
        *columnas_maestro(),
        sa.Column("numero_orden", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=True),
        sa.Column("sigpac_provincia", sa.SmallInteger(), nullable=False),
        sa.Column("sigpac_municipio", sa.SmallInteger(), nullable=False),
        sa.Column("sigpac_agregado", sa.SmallInteger(), nullable=False),
        sa.Column("sigpac_zona", sa.SmallInteger(), nullable=False),
        sa.Column("sigpac_poligono", sa.Integer(), nullable=False),
        sa.Column("sigpac_parcela", sa.Integer(), nullable=False),
        sa.Column("sigpac_recinto", sa.Integer(), nullable=False),
        sa.Column("superficie", sa.Numeric(10, 4), nullable=False),
        sa.Column("uso_sigpac", sa.Text(), nullable=False),
        sa.Column("aprovechamiento", sa.Text(), nullable=False),
        sa.Column("cultivo_lenoso", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("cultivo_especie", sa.Text(), nullable=True),
        sa.Column("cultivo_variedad", sa.Text(), nullable=True),
        sa.Column("sistema_explotacion", sa.Text(), nullable=False),
        sa.Column("sistema_riego", sa.Text(), nullable=True),
        sa.Column("protegido", sa.Boolean(), nullable=False),
        sa.Column("tipo_proteccion", sa.Text(), nullable=True),
        sa.Column("sistema_certificacion", sa.Text(), nullable=True),
        sa.Column("marco_control_plagas", sa.Text(), nullable=True),
        *restricciones_maestro("parcela"),
        # Número de orden (A.2.a): único en la explotación, también entre las parcelas de baja.
        sa.CheckConstraint("numero_orden >= 1", name="parcela_numero_orden_check"),
        sa.UniqueConstraint("explotacion_id", "numero_orden", name="parcela_numero_orden_key"),
        sa.CheckConstraint(
            "nombre IS NULL OR char_length(nombre) BETWEEN 1 AND 100", name="parcela_nombre_check"
        ),
        sa.CheckConstraint(
            "sigpac_provincia BETWEEN 1 AND 99", name="parcela_sigpac_provincia_check"
        ),
        sa.CheckConstraint("sigpac_municipio >= 1", name="parcela_sigpac_municipio_check"),
        sa.CheckConstraint("sigpac_agregado >= 0", name="parcela_sigpac_agregado_check"),
        sa.CheckConstraint("sigpac_zona >= 0", name="parcela_sigpac_zona_check"),
        sa.CheckConstraint("sigpac_poligono >= 1", name="parcela_sigpac_poligono_check"),
        sa.CheckConstraint("sigpac_parcela >= 1", name="parcela_sigpac_parcela_check"),
        sa.CheckConstraint("sigpac_recinto >= 1", name="parcela_sigpac_recinto_check"),
        sa.CheckConstraint("superficie > 0", name="parcela_superficie_check"),
        sa.CheckConstraint(
            "aprovechamiento IN ('forestal', 'pastos', 'cultivo')",
            name="parcela_aprovechamiento_check",
        ),
        # A.2.d: "cultivo leñoso" solo en cultivos, con especie y variedad.
        sa.CheckConstraint(
            "NOT cultivo_lenoso OR aprovechamiento = 'cultivo'",
            name="parcela_cultivo_lenoso_check",
        ),
        sa.CheckConstraint(
            "NOT cultivo_lenoso OR cultivo_especie IS NOT NULL",
            name="parcela_cultivo_especie_check",
        ),
        sa.CheckConstraint(
            "NOT cultivo_lenoso OR cultivo_variedad IS NOT NULL",
            name="parcela_cultivo_variedad_check",
        ),
        sa.CheckConstraint(
            "sistema_explotacion IN ('secano', 'regadio')",
            name="parcela_sistema_explotacion_check",
        ),
        sa.CheckConstraint(
            "(sistema_explotacion = 'regadio') = (sistema_riego IS NOT NULL)",
            name="parcela_sistema_riego_check",
        ),
        sa.CheckConstraint(
            "protegido = (tipo_proteccion IS NOT NULL)", name="parcela_tipo_proteccion_check"
        ),
    )
    # Un recinto SIGPAC no se da de alta dos veces entre las parcelas activas de una explotación.
    op.create_index(
        "parcela_sigpac_activa_key",
        "parcela",
        ["explotacion_id", *REFERENCIA_SIGPAC],
        unique=True,
        postgresql_where=sa.text("estado = 'activa'"),
    )


def downgrade() -> None:
    op.drop_index("parcela_sigpac_activa_key", table_name="parcela")
    op.drop_table("parcela")
    op.drop_constraint("explotacion_ultimo_numero_parcela_check", "explotacion")
    op.drop_column("explotacion", "ultimo_numero_parcela")
