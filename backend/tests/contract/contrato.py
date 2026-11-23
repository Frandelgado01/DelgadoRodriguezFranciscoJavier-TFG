"""Utilidad de prueba de contrato (T-08; research R7, principio I).

Compara el contrato de diseño `specs/001-registro-tratamientos/contracts/openapi.yaml` con el
OpenAPI que genera FastAPI. Para cada operación pedida comprueba que la API tiene la ruta, el método
y todos los códigos de estado documentados en el contrato. Cada historia la usa en su prueba de
contrato con la lista de las operaciones que implementa; T-68 la usa con todas.

Las rutas son relativas al servidor `/api` en los dos documentos (la API se monta en `/api`).
"""

from functools import cache
from pathlib import Path
from typing import Any

import yaml
from fastapi.testclient import TestClient

FICHERO_CONTRATO = (
    Path(__file__).resolve().parents[3]
    / "specs"
    / "001-registro-tratamientos"
    / "contracts"
    / "openapi.yaml"
)

Operacion = tuple[str, str]
"""Método HTTP y ruta del contrato, p. ej. ("POST", "/cuenta")."""


@cache
def cargar_contrato() -> dict[str, Any]:
    """Contrato de diseño (contracts/openapi.yaml)."""
    contrato: dict[str, Any] = yaml.safe_load(FICHERO_CONTRATO.read_text(encoding="utf-8"))
    return contrato


def openapi_generado() -> dict[str, Any]:
    """OpenAPI que genera FastAPI para la API montada en /api."""
    from cuaderno.main import app

    esquema: dict[str, Any] = TestClient(app).get("/api/openapi.json").json()
    return esquema


def _codigos(operacion: dict[str, Any]) -> set[str]:
    return {str(codigo) for codigo in operacion.get("responses", {})}


def comprobar_operaciones(generado: dict[str, Any], operaciones: list[Operacion]) -> list[str]:
    """Diferencias entre el contrato y el OpenAPI generado para las operaciones dadas.

    Devuelve una lista vacía si la API tiene todas las operaciones con todos los códigos de estado
    del contrato. La API puede documentar códigos de más (p. ej. el 422 que FastAPI añade solo).
    """
    contrato = cargar_contrato()
    diferencias: list[str] = []
    for metodo, ruta in operaciones:
        nombre = f"{metodo.upper()} {ruta}"
        esperada = contrato["paths"].get(ruta, {}).get(metodo.lower())
        if esperada is None:
            diferencias.append(f"{nombre}: la operación no está en contracts/openapi.yaml")
            continue
        real = generado.get("paths", {}).get(ruta, {}).get(metodo.lower())
        if real is None:
            diferencias.append(f"{nombre}: la API no tiene esta operación")
            continue
        faltan = sorted(_codigos(esperada) - _codigos(real))
        if faltan:
            diferencias.append(f"{nombre}: faltan los códigos {', '.join(faltan)}")
    return diferencias
