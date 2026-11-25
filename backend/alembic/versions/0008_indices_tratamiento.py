"""Índices de los filtros de la lista de tratamientos (T-81; REQ-10).

Revision ID: 0008_indices_tratamiento
Revises: 0007_tratamiento
Create Date: 2026-11-25
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0008_indices_tratamiento"
down_revision: str | None = "0007_tratamiento"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

INDICES = (
    ("tratamiento_explotacion_id_fecha_idx", "tratamiento", ["explotacion_id", "fecha"]),
    ("tratamiento_parcela_parcela_id_idx", "tratamiento_parcela", ["parcela_id"]),
    ("tratamiento_producto_producto_id_idx", "tratamiento_producto", ["producto_id"]),
)


def upgrade() -> None:
    for nombre, tabla, columnas in INDICES:
        op.create_index(nombre, tabla, columnas)


def downgrade() -> None:
    for nombre, tabla, _ in reversed(INDICES):
        op.drop_index(nombre, table_name=tabla)
