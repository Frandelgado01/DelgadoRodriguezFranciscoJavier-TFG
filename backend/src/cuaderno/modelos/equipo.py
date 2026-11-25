"""Equipo de aplicación (data-model.md, "equipo"; REQ-15; anexo III, A.1 y B.h)."""

from datetime import date

from cuaderno.modelos.maestro import DatoMaestro


class Equipo(DatoMaestro, table=True):
    descripcion: str  # 1–150 car.
    fecha_adquisicion_o_inspeccion: date  # no posterior a hoy (la API lo comprueba)
    numero_roma: str | None = None  # número ROMA o referencia censal, "si procede" (SIEX CUE 8.35)
