"""Pruebas de la idempotencia del registro (T-37; REQ-06; research R4).

La cola del móvil reintenta un envío cuya respuesta se perdió. Con el mismo `id` y el mismo
contenido la API responde 200 y no crea nada; con otro contenido, 409.
"""

from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from cuaderno.main import app
from tests.conftest import RelojFijo
from tests.integration.test_bajas import dar_de_baja
from tests.integration.test_cuenta_sesion import consultar
from tests.integration.test_parcelas import entrar
from tests.integration.test_productos import alta_producto, producto_valido
from tests.integration.test_registrar_tratamiento import (
    contar,
    linea_parcela,
    linea_producto,
    preparar,
    registrar,
    tratamiento_valido,
)


def test_req06_reintento_con_el_mismo_contenido_responde_200_y_no_duplica(
    cliente: TestClient, bd: Engine
) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    primera = registrar(cliente, datos)
    assert primera.status_code == 201
    reintento = registrar(cliente, datos)
    assert reintento.status_code == 200, reintento.text
    assert reintento.json() == primera.json()
    for tabla in ("tratamiento", "tratamiento_parcela", "tratamiento_producto", "cambio"):
        assert contar(bd, tabla) == 1, tabla


def test_req06_el_mismo_contenido_escrito_de_otra_forma_es_un_reintento(
    cliente: TestClient,
) -> None:
    """Los mismos datos con el instante en otra zona, 2 en lugar de 2.0 y opcionales a null."""
    m = preparar(cliente)
    datos = tratamiento_valido(m, productos=[linea_producto(m.producto, 2.0)])
    assert registrar(cliente, datos).status_code == 201
    otra = datos | {
        "registradoEn": "2026-03-15T11:30:00+01:00",
        "productos": [linea_producto(m.producto, 2)],
    }
    del otra["asesorId"]
    assert registrar(cliente, otra).status_code == 200


@pytest.mark.parametrize("cambio", ["problema", "cantidad", "superficie", "eficacia"])
def test_req06_mismo_id_con_otro_contenido_responde_409(cliente: TestClient, cambio: str) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    primera = registrar(cliente, datos)
    assert primera.status_code == 201
    otro = {
        "problema": datos | {"problema": "Oídio"},
        "cantidad": datos | {"productos": [linea_producto(m.producto, 3)]},
        "superficie": datos | {"parcelas": [linea_parcela(m.parcela, 1)]},
        "eficacia": datos | {"eficacia": "buena"},
    }[cambio]
    respuesta = registrar(cliente, otro)
    assert respuesta.status_code == 409, respuesta.text
    assert respuesta.json()["mensaje"]
    assert cliente.get(f"/api/tratamientos/{datos['id']}").json() == primera.json()


def test_req06_el_id_de_otra_explotacion_responde_409_sin_mostrar_sus_datos(
    cliente: TestClient,
) -> None:
    ajenos = preparar(cliente, "luis@example.com")
    datos = tratamiento_valido(ajenos)
    assert registrar(cliente, datos).status_code == 201
    m = preparar(cliente, "ana@example.com")
    for cuerpo in (datos, tratamiento_valido(m, id=datos["id"])):
        respuesta = registrar(cliente, cuerpo)
        assert respuesta.status_code == 409, respuesta.text
        assert set(respuesta.json()) == {"mensaje"}
    assert cliente.get(f"/api/tratamientos/{datos['id']}").status_code == 404


def test_req06_un_reintento_vale_aunque_despues_se_diera_de_baja_la_parcela(
    cliente: TestClient,
) -> None:
    """El servidor ya lo guardó: el reintento no se vuelve a validar (no es un rechazo)."""
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    assert registrar(cliente, datos).status_code == 201
    assert dar_de_baja(cliente, "parcelas", m.parcela["id"]).status_code == 200
    assert registrar(cliente, datos).status_code == 200


def test_req06_un_reintento_vale_aunque_el_tratamiento_haya_cambiado_despues(
    cliente: TestClient, bd: Engine, reloj: RelojFijo
) -> None:
    """Se compara con la instantánea de la creación, no con el estado actual (R4)."""
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    assert registrar(cliente, datos).status_code == 201
    with bd.begin() as conexion:
        conexion.execute(text("UPDATE tratamiento SET problema = 'Oídio', version = 2"))
    respuesta = registrar(cliente, datos)
    assert respuesta.status_code == 200
    assert (respuesta.json()["problema"], respuesta.json()["version"]) == ("Oídio", 2)


def test_req06_producto_nuevo_y_tratamiento_que_lo_usa_se_crean_una_vez_aunque_se_reintenten(
    cliente: TestClient, bd: Engine
) -> None:
    m = preparar(cliente)
    antes = contar(bd, "producto")
    producto = producto_valido(nombreComercial="Dado de alta sin conexión")
    datos = tratamiento_valido(m, productos=[linea_producto(producto, 2)])
    codigos = [
        alta_producto(cliente, producto).status_code,
        alta_producto(cliente, producto).status_code,
        registrar(cliente, datos).status_code,
        alta_producto(cliente, producto).status_code,
        registrar(cliente, datos).status_code,
    ]
    assert codigos == [201, 200, 201, 200, 200]
    assert contar(bd, "producto") == antes + 1
    assert contar(bd, "tratamiento") == 1


def test_req06_reintentos_simultaneos_crean_un_solo_tratamiento(
    cliente: TestClient, bd: Engine
) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m)

    def enviar(_: int) -> int:
        otro = TestClient(app, base_url="https://testserver", cookies=dict(cliente.cookies))
        codigo: int = registrar(otro, datos).status_code
        return codigo

    with ThreadPoolExecutor(max_workers=4) as hilos:
        codigos = sorted(hilos.map(enviar, range(4)))
    assert codigos == [200, 200, 200, 201]
    assert contar(bd, "tratamiento") == 1
    assert contar(bd, "cambio") == 1


def test_req06_sin_sesion_no_se_registra(cliente: TestClient, bd: Engine) -> None:
    m = preparar(cliente)
    cliente.cookies.clear()
    assert registrar(cliente, tratamiento_valido(m)).status_code == 401
    assert contar(bd, "tratamiento") == 0
    entrar(cliente, "luis@example.com")
    assert consultar(bd, "SELECT id FROM tratamiento") == []
