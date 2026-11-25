"""Tratamientos, sus parcelas y productos, y el historial (T-34; REQ-01, REQ-03, REQ-04).

Las columnas de plazo (completado_en, fecha_completado y las generadas) se añaden en T-47. La dosis
por hectárea no es una columna (REQ-23; research R15).

Revision ID: 0007_tratamiento
Revises: 0006_producto
Create Date: 2026-11-25
"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_tratamiento"
down_revision: str | None = "0006_producto"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def uuid_a(nombre: str, destino: str, **opciones: Any) -> sa.Column[Any]:
    """Clave foránea sin borrado en cascada (data-model, convenciones)."""
    return sa.Column(
        nombre,
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey(f"{destino}.id", ondelete="RESTRICT"),
        **({"nullable": False} | opciones),
    )


def instante(nombre: str) -> sa.Column[Any]:
    return sa.Column(nombre, sa.DateTime(timezone=True), nullable=False)


def upgrade() -> None:
    op.create_table(
        "tratamiento",
        # id generado por el cliente (R4).
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        uuid_a("explotacion_id", "explotacion"),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("problema", sa.Text(), nullable=False),
        uuid_a("aplicador_id", "persona"),
        uuid_a("asesor_id", "persona", nullable=True),
        uuid_a("equipo_id", "equipo"),
        sa.Column("eficacia", sa.Text(), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        instante("registrado_en"),
        # No generada: la API la calcula en Europe/Madrid (R14).
        sa.Column("fecha_registro", sa.Date(), nullable=False),
        sa.Column("anulado", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("en_conflicto", sa.Boolean(), nullable=False, server_default=sa.false()),
        instante("recibido_en"),
        sa.CheckConstraint(
            "char_length(problema) BETWEEN 1 AND 200", name="tratamiento_problema_check"
        ),
        sa.CheckConstraint(
            "eficacia IN ('buena', 'regular', 'mala')", name="tratamiento_eficacia_check"
        ),
        sa.CheckConstraint(
            "char_length(observaciones) <= 2000", name="tratamiento_observaciones_check"
        ),
        sa.CheckConstraint("fecha_registro >= fecha", name="tratamiento_fecha_registro_check"),
        sa.CheckConstraint("version >= 1", name="tratamiento_version_check"),
    )

    op.create_table(
        "tratamiento_parcela",
        uuid_a("tratamiento_id", "tratamiento", primary_key=True),
        uuid_a("parcela_id", "parcela", primary_key=True),
        sa.Column("superficie_tratada", sa.Numeric(10, 2), nullable=False),
        # Copia del cultivo al registrar (REQ-05).
        sa.Column("cultivo_especie", sa.Text(), nullable=False),
        sa.Column("cultivo_variedad", sa.Text(), nullable=False),
        sa.Column("producto_semilla", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "superficie_tratada > 0", name="tratamiento_parcela_superficie_tratada_check"
        ),
    )

    op.create_table(
        "tratamiento_producto",
        uuid_a("tratamiento_id", "tratamiento", primary_key=True),
        uuid_a("producto_id", "producto", primary_key=True),
        sa.Column("cantidad", sa.Numeric(12, 3), nullable=False),
        sa.Column("unidad_medida", sa.Text(), nullable=False),
        sa.CheckConstraint("cantidad > 0", name="tratamiento_producto_cantidad_check"),
        sa.CheckConstraint(
            "unidad_medida IN ('kg', 'L')", name="tratamiento_producto_unidad_medida_check"
        ),
    )

    op.create_table(
        "cambio",
        # id = idOperacion del cliente (idempotencia, R4).
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        uuid_a("tratamiento_id", "tratamiento"),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("version_base", sa.Integer(), nullable=False),
        sa.Column("version_resultante", sa.Integer(), nullable=True),
        sa.Column("datos_anteriores", postgresql.JSONB(none_as_null=True), nullable=True),
        sa.Column("datos_nuevos", postgresql.JSONB(none_as_null=True), nullable=False),
        sa.Column("motivo", sa.Text(), nullable=True),
        instante("realizado_en"),
        instante("recibido_en"),
        sa.CheckConstraint(
            "tipo IN ('creacion', 'correccion', 'anulacion', 'conflicto', 'resolucion_conflicto')",
            name="cambio_tipo_check",
        ),
    )
    op.create_index("cambio_tratamiento_id_idx", "cambio", ["tratamiento_id"])


def downgrade() -> None:
    op.drop_table("cambio")
    op.drop_table("tratamiento_producto")
    op.drop_table("tratamiento_parcela")
    op.drop_table("tratamiento")
