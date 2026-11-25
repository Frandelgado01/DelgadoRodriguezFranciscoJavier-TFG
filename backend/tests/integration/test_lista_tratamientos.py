"""Pruebas de la lista de tratamientos (T-80; REQ-10, REQ-20).

`GET /tratamientos` con los filtros por periodo, parcela y producto, del más reciente al más antiguo
y por páginas. El filtro por estado y los anulados se prueban en T-53.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.integration.test_cuenta_sesion import consultar, iniciar_sesion
from tests.integration.test_parcelas import GENERICO, errores_de
from tests.integration.test_registrar_tratamiento import (
    Maestros,
    linea_parcela,
    linea_producto,
    preparar,
    registrar,
    tratamiento_valido,
)


def listar(cliente: TestClient, **filtros: Any) -> dict[str, Any]:
    respuesta = cliente.get("/api/tratamientos", params=filtros)
    assert respuesta.status_code == 200, respuesta.text
    pagina: dict[str, Any] = respuesta.json()
    return pagina


def alta(cliente: TestClient, m: Maestros, fecha: str, **cambios: Any) -> str:
    datos = tratamiento_valido(m, fecha=fecha, **cambios)
    assert registrar(cliente, datos).status_code == 201
    return str(datos["id"])


def ids(pagina: dict[str, Any]) -> list[str]:
    return [t["id"] for t in pagina["elementos"]]


def test_req10_sin_tratamientos_la_lista_esta_vacia(cliente: TestClient) -> None:
    preparar(cliente)
    assert listar(cliente) == {"elementos": [], "total": 0}


def test_req10_ordena_del_mas_reciente_al_mas_antiguo(cliente: TestClient) -> None:
    m = preparar(cliente)
    enero = alta(cliente, m, "2026-01-10")
    marzo = alta(cliente, m, "2026-03-15")
    febrero = alta(cliente, m, "2026-02-01")
    pagina = listar(cliente)
    assert ids(pagina) == [marzo, febrero, enero]
    assert pagina["total"] == 3


def test_req10_con_la_misma_fecha_va_antes_el_que_se_anoto_despues(cliente: TestClient) -> None:
    m = preparar(cliente)
    antes = alta(cliente, m, "2026-03-10", registradoEn="2026-03-11T08:00:00Z")
    despues = alta(cliente, m, "2026-03-10", registradoEn="2026-03-11T09:00:00Z")
    assert ids(listar(cliente)) == [despues, antes]


def test_req10_cada_elemento_es_el_tratamiento_completo(cliente: TestClient) -> None:
    m = preparar(cliente)
    for datos in (
        tratamiento_valido(m, fecha="2026-03-14"),
        tratamiento_valido(
            m,
            parcelas=[linea_parcela(m.parcela, 1.5), linea_parcela(m.otra_parcela, 2)],
            productos=[
                linea_producto(m.producto, 2),
                linea_producto(m.otro_producto, 1.5, "L"),
            ],
        ),
    ):
        assert registrar(cliente, datos).status_code == 201
    for tratamiento in listar(cliente)["elementos"]:
        assert cliente.get(f"/api/tratamientos/{tratamiento['id']}").json() == tratamiento


def test_req10_filtra_por_periodo_con_los_dos_dias_incluidos(cliente: TestClient) -> None:
    m = preparar(cliente)
    uno = alta(cliente, m, "2026-02-01")
    dos = alta(cliente, m, "2026-02-15")
    tres = alta(cliente, m, "2026-03-01")
    assert ids(listar(cliente, desde="2026-02-15")) == [tres, dos]
    assert ids(listar(cliente, hasta="2026-02-15")) == [dos, uno]
    assert ids(listar(cliente, desde="2026-02-01", hasta="2026-02-15")) == [dos, uno]
    assert listar(cliente, desde="2026-03-02", hasta="2026-02-01") == {"elementos": [], "total": 0}


def test_req10_filtra_por_parcela_y_por_producto(cliente: TestClient) -> None:
    m = preparar(cliente)
    solo_una = alta(cliente, m, "2026-03-01")
    otra = alta(cliente, m, "2026-03-02", parcelas=[linea_parcela(m.otra_parcela, 1)])
    mezcla = alta(
        cliente,
        m,
        "2026-03-03",
        parcelas=[linea_parcela(m.parcela, 1), linea_parcela(m.otra_parcela, 1)],
        productos=[linea_producto(m.producto, 1), linea_producto(m.otro_producto, 1)],
    )
    assert ids(listar(cliente, parcela_id=m.parcela["id"])) == [mezcla, solo_una]
    assert ids(listar(cliente, parcela_id=m.otra_parcela["id"])) == [mezcla, otra]
    assert ids(listar(cliente, producto_id=m.otro_producto["id"])) == [mezcla]
    pagina = listar(
        cliente, parcela_id=m.otra_parcela["id"], producto_id=m.producto["id"], hasta="2026-03-02"
    )
    assert (ids(pagina), pagina["total"]) == ([otra], 1)


def test_req10_pagina_y_da_el_total(cliente: TestClient) -> None:
    m = preparar(cliente)
    todos = [alta(cliente, m, f"2026-03-0{dia}") for dia in range(5, 0, -1)]
    paginas = [listar(cliente, pagina=n, tamano=2) for n in (1, 2, 3, 4)]
    assert [ids(p) for p in paginas] == [todos[:2], todos[2:4], todos[4:], []]
    assert {p["total"] for p in paginas} == {5}
    assert ids(listar(cliente, tamano=200)) == todos


@pytest.mark.parametrize(
    ("parametro", "valor"),
    [
        ("tamano", 0),
        ("tamano", 201),
        ("pagina", 0),
        ("pagina", 10**20),
        ("desde", "ayer"),
        ("hasta", "2026-02-30"),
        ("parcela_id", "x"),
        ("producto_id", "x"),
    ],
)
def test_req10_un_filtro_no_valido_responde_422(
    cliente: TestClient, parametro: str, valor: Any
) -> None:
    preparar(cliente)
    errores = errores_de(cliente.get("/api/tratamientos", params={parametro: valor}))
    assert errores[parametro]["mensaje"] not in ("", GENERICO)


def test_req20_sin_sesion_responde_401(cliente: TestClient) -> None:
    assert cliente.get("/api/tratamientos").status_code == 401


def test_req20_no_se_ven_los_tratamientos_de_otra_explotacion(cliente: TestClient) -> None:
    ajenos = preparar(cliente, "luis@example.com")
    de_luis = alta(cliente, ajenos, "2026-03-10")
    m = preparar(cliente, "ana@example.com")
    de_ana = alta(cliente, m, "2026-03-11")
    assert ids(listar(cliente)) == [de_ana]
    assert listar(cliente, parcela_id=ajenos.parcela["id"]) == {"elementos": [], "total": 0}
    assert listar(cliente, producto_id=ajenos.producto["id"]) == {"elementos": [], "total": 0}
    assert iniciar_sesion(cliente, correo="luis@example.com").status_code == 204
    assert ids(listar(cliente)) == [de_luis]


def test_req10_hay_indices_para_los_filtros(bd: Engine) -> None:
    """data-model: (explotacion_id, fecha), (parcela_id) y (producto_id)."""
    definiciones = [
        fila.indexdef
        for fila in consultar(
            bd,
            "SELECT indexdef FROM pg_indexes WHERE tablename IN "
            "('tratamiento', 'tratamiento_parcela', 'tratamiento_producto')",
        )
    ]
    for tabla, columnas in (
        ("tratamiento", "(explotacion_id, fecha)"),
        ("tratamiento_parcela", "(parcela_id)"),
        ("tratamiento_producto", "(producto_id)"),
    ):
        assert any(f".{tabla} " in d and d.endswith(columnas) for d in definiciones), tabla
