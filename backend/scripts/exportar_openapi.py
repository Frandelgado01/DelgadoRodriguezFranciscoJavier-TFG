"""Exporta el OpenAPI que genera FastAPI a frontend/src/api/openapi.json (T-15; research R7 y R8).

Uso: `uv run python scripts/exportar_openapi.py [destino]`. El CI lo ejecuta y falla si el fichero
versionado difiere, de modo que un cambio en la API obliga a actualizar los tipos de la PWA.
"""

import json
import sys
from pathlib import Path

from cuaderno.main import api

DESTINO = Path(__file__).resolve().parents[2] / "frontend" / "src" / "api" / "openapi.json"


def main() -> None:
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else DESTINO
    texto = json.dumps(api.openapi(), ensure_ascii=False, indent=2) + "\n"
    destino.write_text(texto, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
