"""Reglas de validación compartidas con la PWA (research R8).

La misma regla está en `frontend/src/dominio/validacion.ts`; las dos pasan los casos de
`compartido/casos-validacion.json`. Cada regla devuelve None si el dato es válido o el error con el
campo, un mensaje en lenguaje llano y el REQ-xx que la pide.
"""

import re
from typing import TypedDict


class ErrorRegla(TypedDict):
    campo: str
    mensaje: str
    req: str


CONTRASENA_MINIMA = 15
CONTRASENA_MAXIMA = 128
CORREO_MAXIMO = 254
_FORMATO_CORREO = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


def validar_contrasena(valor: str) -> ErrorRegla | None:
    """De 15 a 128 caracteres de cualquier tipo, sin reglas de composición (REQ-20; R9).

    Se cuentan caracteres Unicode (puntos de código), no bytes.
    """
    if CONTRASENA_MINIMA <= len(valor) <= CONTRASENA_MAXIMA:
        return None
    return {
        "campo": "contrasena",
        "mensaje": "La contraseña debe tener entre 15 y 128 caracteres.",
        "req": "REQ-20",
    }


def validar_correo(valor: str) -> ErrorRegla | None:
    """Forma nombre@dominio.ext, sin espacios dentro y de 254 caracteres como mucho (REQ-20).

    Los espacios de los lados no cuentan.
    """
    valor = valor.strip()
    if len(valor) <= CORREO_MAXIMO and _FORMATO_CORREO.fullmatch(valor):
        return None
    return {
        "campo": "correo",
        "mensaje": "Escribe un correo electrónico válido, por ejemplo nombre@dominio.es.",
        "req": "REQ-20",
    }
