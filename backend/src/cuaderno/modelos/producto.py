"""Producto fitosanitario (data-model.md, "producto"; REQ-16; anexo III, B.g).

El id lo genera el cliente (research R4). El número de registro no es único: dos dispositivos sin
conexión pueden dar de alta el mismo producto, y una restricción haría fallar la sincronización.
"""

from cuaderno.modelos.maestro import DatoMaestro


class Producto(DatoMaestro, table=True):
    nombre_comercial: str  # 1–150 car. (SIEX CUE 8.22)
    numero_registro: str  # 1–30 car. (SIEX CUE 8.24)
