"""Columnas comunes de los datos maestros de la explotación (data-model.md; REQ-14 a REQ-17).

Parcelas, personas, equipos y productos son de una explotación y se dan de baja de forma lógica:
`estado` pasa a `baja` y se anota `fecha_baja`; la fila nunca se borra (REQ-17). Las restricciones
CHECK están en las migraciones, que son las que crean el esquema.
"""

import uuid
from datetime import date

from sqlmodel import Field, SQLModel


class DatoMaestro(SQLModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    explotacion_id: uuid.UUID = Field(
        foreign_key="explotacion.id", ondelete="RESTRICT", nullable=False
    )
    # CHECK IN ('activa', 'baja') y CHECK (estado = 'baja') = (fecha_baja IS NOT NULL).
    estado: str = Field(default="activa", nullable=False)
    fecha_baja: date | None = Field(default=None)
