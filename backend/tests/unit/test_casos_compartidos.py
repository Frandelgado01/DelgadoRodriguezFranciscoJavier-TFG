"""Ejecutor en pytest de los casos compartidos de validación (T-07; research R8).

Recorre `compartido/casos-validacion.json`, el mismo fichero que recorre Vitest en
`frontend/tests/casos-compartidos.test.ts`: si la implementación de Python y la de TypeScript de
una regla divergen, falla la prueba de una de ellas. Cada caso es una prueba con su `REQ-xx` en el
nombre.

Formato de cada caso: `req` (requisito que verifica), `regla` (nombre de la regla), `descripcion`,
`entrada` y `esperado` (resultado esperado de la regla para esa entrada).
"""

import json
import re
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

FICHERO_CASOS = Path(__file__).resolve().parents[3] / "compartido" / "casos-validacion.json"
CAMPOS_CASO = {"req", "regla", "descripcion", "entrada", "esperado"}

# Regla del fichero de casos → función del dominio que la implementa. Se amplía con cada regla nueva
# (contraseña y correo en T-17; REQ-02 y REQ-04 en T-31; plazos en T-44; dosis en T-73).
REGLAS: dict[str, Callable[[Any], Any]] = {}


def _cargar_casos() -> list[dict[str, Any]]:
    datos = json.loads(FICHERO_CASOS.read_text(encoding="utf-8"))
    casos: list[dict[str, Any]] = datos["casos"]
    return casos


def _nombre(caso: dict[str, Any]) -> str:
    return f"{caso['req']} {caso['regla']}: {caso['descripcion']}"


def test_fichero_de_casos_tiene_el_formato_acordado() -> None:
    """R8: cada caso tiene regla, entrada, resultado esperado y el REQ-xx que verifica."""
    casos = _cargar_casos()
    for caso in casos:
        assert set(caso) == CAMPOS_CASO, _nombre(caso)
        assert re.fullmatch(r"REQ-\d{2}", caso["req"]), _nombre(caso)
        assert caso["regla"] and caso["descripcion"], caso
    nombres = [_nombre(caso) for caso in casos]
    assert len(nombres) == len(set(nombres)), "Hay casos con el mismo nombre"


@pytest.mark.parametrize("caso", _cargar_casos() if FICHERO_CASOS.exists() else [], ids=_nombre)
def test_caso_compartido(caso: dict[str, Any]) -> None:
    """Ejecuta un caso del fichero compartido; falla si la regla no está implementada en Python."""
    assert caso["regla"] in REGLAS, f"La regla {caso['regla']} no está implementada en Python"
    assert REGLAS[caso["regla"]](caso["entrada"]) == caso["esperado"]
