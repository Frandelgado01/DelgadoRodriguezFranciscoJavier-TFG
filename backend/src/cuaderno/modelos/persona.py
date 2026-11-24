"""Persona que aplica o asesora (data-model.md, "persona"; REQ-15; anexo III, A.1.c, A.1.h y B.d).

Sin NIF ni otros datos personales: la norma solo exige el NIF del titular (principio VI).
"""

from cuaderno.modelos.maestro import DatoMaestro


class Persona(DatoMaestro, table=True):
    nombre: str  # 1–150 car.
    tipo: str  # aplicador o asesor
    numero_carne: str  # carné de usuario profesional o de asesor, 1–30 car.
