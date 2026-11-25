"""Pruebas de la dosis por hectárea en la API (T-75; REQ-23; research R15).

La dosis no se guarda: la API la calcula en cada respuesta con la cantidad de cada producto y la
suma de las superficies tratadas. Escenarios 6 y 7 de la historia 1.
"""

import json
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.integration.test_cuenta_sesion import consultar
from tests.integration.test_registrar_tratamiento import (
    linea_parcela,
    linea_producto,
    preparar,
    registrar,
    tratamiento_valido,
)


def dosis_de(tratamiento: dict[str, Any]) -> dict[str, tuple[float, str]]:
    return {
        p["productoId"]: (p["dosisPorHectarea"], p["unidadDosis"]) for p in tratamiento["productos"]
    }


def test_req23_escenario_6_dosis_de_un_producto(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    respuesta = registrar(cliente, datos)
    assert respuesta.status_code == 201, respuesta.text
    assert dosis_de(respuesta.json()) == {m.producto["id"]: (0.57, "kg/ha")}
    leido = cliente.get(f"/api/tratamientos/{datos['id']}").json()
    assert dosis_de(leido) == {m.producto["id"]: (0.57, "kg/ha")}


def test_req23_escenario_7_dosis_de_cada_producto_con_la_superficie_total(
    cliente: TestClient,
) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(
        m,
        parcelas=[linea_parcela(m.parcela, 1.5), linea_parcela(m.otra_parcela, 2)],
        productos=[
            linea_producto(m.producto, 2, "kg"),
            linea_producto(m.otro_producto, 1.5, "L"),
        ],
    )
    assert registrar(cliente, datos).status_code == 201
    assert dosis_de(cliente.get(f"/api/tratamientos/{datos['id']}").json()) == {
        m.producto["id"]: (0.57, "kg/ha"),
        m.otro_producto["id"]: (0.43, "L/ha"),
    }


def test_req23_una_dosis_enviada_no_se_guarda_ni_cambia_la_calculada(cliente: TestClient) -> None:
    m = preparar(cliente)
    linea = linea_producto(m.producto, 2) | {"dosisPorHectarea": 99, "unidadDosis": "L/ha"}
    respuesta = registrar(cliente, tratamiento_valido(m, productos=[linea]))
    assert respuesta.status_code == 201, respuesta.text
    assert dosis_de(respuesta.json()) == {m.producto["id"]: (0.57, "kg/ha")}


def test_req23_la_instantanea_del_historial_no_contiene_la_dosis(
    cliente: TestClient, bd: Engine
) -> None:
    m = preparar(cliente)
    linea = linea_producto(m.producto, 2) | {"dosisPorHectarea": 99}
    assert registrar(cliente, tratamiento_valido(m, productos=[linea])).status_code == 201
    (cambio,) = consultar(bd, "SELECT datos_nuevos FROM cambio")
    assert "osis" not in json.dumps(cambio.datos_nuevos)


def test_req23_no_hay_ninguna_columna_de_dosis(bd: Engine) -> None:
    columnas = consultar(
        bd,
        "SELECT table_name, column_name FROM information_schema.columns "
        "WHERE table_schema = 'public' AND column_name ILIKE '%dosis%'",
    )
    assert columnas == []
