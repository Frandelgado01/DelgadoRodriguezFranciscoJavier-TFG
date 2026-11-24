"""Pruebas de REQ-17: baja lógica de parcelas, personas, equipos y productos (T-26).

Criterios de la spec (historia 4, escenario 4) y de data-model ("bajas lógicas"): la baja pone
`estado = 'baja'` y `fecha_baja`; el elemento deja de salir en los listados salvo con
`incluir_bajas=true`, y la fila nunca se borra. Que no se pueda usar en tratamientos nuevos se
prueba con el registro (T-35).
"""

import itertools
import uuid
from collections.abc import Callable
from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.conftest import RelojFijo
from tests.contract.contrato import openapi_generado
from tests.integration.test_cuenta_sesion import consultar, iniciar_sesion
from tests.integration.test_parcelas import alta_parcela, entrar, sigpac
from tests.integration.test_personas_equipos import alta_equipo, alta_persona
from tests.integration.test_productos import alta_producto, producto_valido

HOY = date(2026, 3, 15)  # "hoy" del reloj fijo de las pruebas (conftest)

Alta = Callable[[TestClient], Any]

_RECINTOS = itertools.count(1)


def _alta_parcela(cliente: TestClient) -> Any:
    """Cada parcela en otro recinto SIGPAC: dos activas no pueden compartir referencia (REQ-14)."""
    return alta_parcela(cliente, sigpac=sigpac(recinto=next(_RECINTOS)))


RECURSOS: list[Any] = [
    pytest.param("parcelas", "parcela", _alta_parcela, id="parcela"),
    pytest.param("personas", "persona", lambda c: alta_persona(c), id="persona"),
    pytest.param("equipos", "equipo", lambda c: alta_equipo(c), id="equipo"),
    pytest.param(
        "productos", "producto", lambda c: alta_producto(c, producto_valido()), id="producto"
    ),
]


def dar_de_baja(cliente: TestClient, ruta: str, id_: str) -> Any:
    return cliente.post(f"/api/{ruta}/{id_}/baja")


@pytest.mark.parametrize(("ruta", "tabla", "alta"), RECURSOS)
def test_req17_la_baja_pone_estado_baja_y_la_fecha_de_hoy(
    cliente: TestClient, ruta: str, tabla: str, alta: Alta
) -> None:
    entrar(cliente)
    creado = alta(cliente).json()
    respuesta = dar_de_baja(cliente, ruta, creado["id"])
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json() == creado | {"estado": "baja", "fechaBaja": HOY.isoformat()}


@pytest.mark.parametrize(("ruta", "tabla", "alta"), RECURSOS)
def test_req17_el_elemento_de_baja_solo_sale_en_el_listado_con_incluir_bajas(
    cliente: TestClient, ruta: str, tabla: str, alta: Alta
) -> None:
    entrar(cliente)
    activo = alta(cliente).json()
    de_baja = dar_de_baja(cliente, ruta, alta(cliente).json()["id"]).json()

    assert cliente.get(f"/api/{ruta}").json() == [activo]
    assert cliente.get(f"/api/{ruta}?incluir_bajas=false").json() == [activo]
    con_bajas = cliente.get(f"/api/{ruta}?incluir_bajas=true").json()
    assert sorted(con_bajas, key=lambda e: e["estado"]) == [activo, de_baja]


@pytest.mark.parametrize(("ruta", "tabla", "alta"), RECURSOS)
def test_req17_la_baja_nunca_borra_la_fila(
    cliente: TestClient, bd: Engine, ruta: str, tabla: str, alta: Alta
) -> None:
    entrar(cliente)
    id_ = alta(cliente).json()["id"]
    assert dar_de_baja(cliente, ruta, id_).status_code == 200
    # La tabla sale de los parámetros de esta prueba, no de datos externos.
    filas = consultar(bd, f"SELECT estado, fecha_baja FROM {tabla} WHERE id = :id", id=id_)  # noqa: S608
    assert [(f.estado, f.fecha_baja) for f in filas] == [("baja", HOY)]


@pytest.mark.parametrize(("ruta", "tabla", "alta"), RECURSOS)
def test_req17_dar_de_baja_otra_vez_conserva_la_primera_fecha(
    cliente: TestClient, reloj: RelojFijo, ruta: str, tabla: str, alta: Alta
) -> None:
    entrar(cliente)
    id_ = alta(cliente).json()["id"]
    assert dar_de_baja(cliente, ruta, id_).status_code == 200
    reloj.fijar_hoy(date(2026, 4, 1))
    otra = dar_de_baja(cliente, ruta, id_)
    assert otra.status_code == 200
    assert otra.json()["fechaBaja"] == HOY.isoformat()


@pytest.mark.parametrize(("ruta", "tabla", "alta"), RECURSOS)
def test_req17_baja_de_un_elemento_inexistente_o_de_otra_explotacion_responde_404(
    cliente: TestClient, ruta: str, tabla: str, alta: Alta
) -> None:
    entrar(cliente, "ana@example.com")
    de_ana = alta(cliente).json()["id"]
    entrar(cliente, "luis@example.com")
    assert dar_de_baja(cliente, ruta, de_ana).status_code == 404
    assert dar_de_baja(cliente, ruta, str(uuid.uuid4())).status_code == 404
    assert cliente.get(f"/api/{ruta}?incluir_bajas=true").json() == []

    # La titular sí puede darlo de baja.
    assert iniciar_sesion(cliente, correo="ana@example.com").status_code == 204
    assert dar_de_baja(cliente, ruta, de_ana).status_code == 200


@pytest.mark.parametrize(("ruta", "tabla", "alta"), RECURSOS)
def test_req17_no_hay_delete(cliente: TestClient, ruta: str, tabla: str, alta: Alta) -> None:
    """Nada se borra: la API no ofrece DELETE en los datos de la explotación."""
    entrar(cliente)
    id_ = alta(cliente).json()["id"]
    # 405 si la ruta tiene otras operaciones (PUT); 404 si no tiene ninguna (productos).
    assert cliente.delete(f"/api/{ruta}/{id_}").status_code in (404, 405)
    rutas = openapi_generado()["paths"]
    for camino, operaciones in rutas.items():
        if camino.startswith(f"/{ruta}"):
            assert "delete" not in operaciones, camino


@pytest.mark.parametrize(("ruta", "tabla", "alta"), RECURSOS)
def test_req17_baja_sin_sesion_responde_401(
    cliente: TestClient, ruta: str, tabla: str, alta: Alta
) -> None:
    assert dar_de_baja(cliente, ruta, str(uuid.uuid4())).status_code == 401


def test_req17_dar_de_baja_una_parcela_libera_su_referencia_sigpac_pero_no_su_numero(
    cliente: TestClient,
) -> None:
    entrar(cliente)
    primera = alta_parcela(cliente).json()
    assert dar_de_baja(cliente, "parcelas", primera["id"]).status_code == 200
    segunda = alta_parcela(cliente)
    assert segunda.status_code == 201, segunda.text
    assert segunda.json()["numeroOrden"] == 2
