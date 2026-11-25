"""Pruebas del script que exporta el OpenAPI generado para la PWA (T-15; research R7 y R8)."""

import json
import subprocess
import sys
from pathlib import Path

from cuaderno.main import api

RAIZ_BACKEND = Path(__file__).resolve().parents[2]
SCRIPT = RAIZ_BACKEND / "scripts" / "exportar_openapi.py"


def _exportar(destino: Path) -> str:
    subprocess.run(  # noqa: S603 (script del repositorio con el mismo intérprete)
        [sys.executable, str(SCRIPT), str(destino)], check=True, cwd=RAIZ_BACKEND
    )
    return destino.read_text(encoding="utf-8")


def test_exporta_el_openapi_que_genera_fastapi(tmp_path: Path) -> None:
    texto = _exportar(tmp_path / "openapi.json")
    assert json.loads(texto) == json.loads(json.dumps(api.openapi()))


def test_la_exportacion_es_estable(tmp_path: Path) -> None:
    """Dos exportaciones dan el mismo texto, para que el CI compare con el fichero versionado."""
    primera = _exportar(tmp_path / "a.json")
    segunda = _exportar(tmp_path / "b.json")
    assert primera == segunda
    assert primera.endswith("}\n")


def test_el_fichero_versionado_esta_al_dia(tmp_path: Path) -> None:
    versionado = RAIZ_BACKEND.parent / "frontend" / "src" / "api" / "openapi.json"
    assert versionado.read_text(encoding="utf-8") == _exportar(tmp_path / "openapi.json")
