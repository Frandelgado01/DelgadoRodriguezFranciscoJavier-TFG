"""Aplicación FastAPI.

La API se monta como subaplicación en /api: así su OpenAPI declara `servers: /api` y rutas como
`/cuenta`, igual que contracts/openapi.yaml, y la documentación interactiva queda en /api/docs.
"""

from fastapi import FastAPI

from cuaderno.api import cuenta, errores

api = FastAPI(
    title="Cuaderno de Campo",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
)
errores.registrar(api)
api.include_router(cuenta.router)

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/api", api)
