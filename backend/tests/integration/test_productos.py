"""Pruebas de REQ-16 y REQ-06: alta idempotente de productos fitosanitarios (T-24).

Criterios de la spec y de data-model ("producto"; research R4): el `id` lo genera el cliente, porque
el producto se puede dar de alta desde el registro y sin conexión; un reintento con el mismo `id` y
el mismo contenido devuelve 200 con el producto, y con distinto contenido 409. El número de registro
no es único: dos dispositivos sin conexión pueden dar de alta el mismo producto.
"""

import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.exc import IntegrityError

from cuaderno.main import app
from tests.integration.test_cuenta_sesion import consultar
from tests.integration.test_parcelas import GENERICO, entrar, errores_de


def producto_valido(**cambios: Any) -> dict[str, Any]:
    datos = {
        "id": str(uuid.uuid4()),
        "nombreComercial": "Cobre Nordox 75 WG",
        "numeroRegistro": "ES-00123",
    }
    return datos | cambios


def alta_producto(cliente: TestClient, datos: dict[str, Any]) -> Any:
    return cliente.post("/api/productos", json=datos)


def test_req16_alta_con_id_del_cliente_responde_201_y_se_reutiliza_en_el_listado(
    cliente: TestClient,
) -> None:
    entrar(cliente)
    datos = producto_valido()
    respuesta = alta_producto(cliente, datos)
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json() == datos | {"estado": "activa", "fechaBaja": None}

    listado = cliente.get("/api/productos")
    assert listado.status_code == 200
    assert listado.json() == [respuesta.json()]


def test_req06_reintento_con_el_mismo_id_y_contenido_responde_200(cliente: TestClient) -> None:
    entrar(cliente)
    datos = producto_valido()
    primera = alta_producto(cliente, datos)
    assert primera.status_code == 201
    reintento = alta_producto(cliente, datos)
    assert reintento.status_code == 200, reintento.text
    assert reintento.json() == primera.json()
    assert len(cliente.get("/api/productos").json()) == 1


def test_req06_mismo_id_con_distinto_contenido_responde_409(cliente: TestClient) -> None:
    entrar(cliente)
    datos = producto_valido()
    assert alta_producto(cliente, datos).status_code == 201
    otro = alta_producto(cliente, datos | {"numeroRegistro": "ES-99999"})
    assert otro.status_code == 409
    assert otro.json()["mensaje"]
    assert cliente.get("/api/productos").json()[0]["numeroRegistro"] == "ES-00123"


def test_req06_el_id_de_un_producto_de_otra_explotacion_responde_409(
    cliente: TestClient,
) -> None:
    """No se puede leer ni cambiar el producto de otra explotación aunque se conozca su id."""
    entrar(cliente, "ana@example.com")
    datos = producto_valido()
    assert alta_producto(cliente, datos).status_code == 201
    entrar(cliente, "luis@example.com")
    respuesta = alta_producto(cliente, datos)
    assert respuesta.status_code == 409
    assert "nombreComercial" not in respuesta.json()
    assert cliente.get("/api/productos").json() == []


def test_req06_reintentos_simultaneos_crean_un_solo_producto(cliente: TestClient) -> None:
    entrar(cliente)
    datos = producto_valido()

    def alta(_: int) -> int:
        otro = TestClient(app, base_url="https://testserver", cookies=dict(cliente.cookies))
        codigo: int = alta_producto(otro, datos).status_code
        return codigo

    with ThreadPoolExecutor(max_workers=4) as hilos:
        codigos = sorted(hilos.map(alta, range(4)))
    assert codigos == [200, 200, 200, 201]
    assert len(cliente.get("/api/productos").json()) == 1


def test_req16_se_admiten_dos_productos_con_el_mismo_numero_de_registro(
    cliente: TestClient,
) -> None:
    entrar(cliente)
    assert alta_producto(cliente, producto_valido()).status_code == 201
    assert alta_producto(cliente, producto_valido(nombreComercial="Nordox")).status_code == 201
    assert len(cliente.get("/api/productos").json()) == 2


def test_req16_cada_explotacion_ve_solo_sus_productos(cliente: TestClient) -> None:
    entrar(cliente, "ana@example.com")
    assert alta_producto(cliente, producto_valido()).status_code == 201
    entrar(cliente, "luis@example.com")
    assert cliente.get("/api/productos").json() == []


def test_req16_sin_sesion_responde_401(cliente: TestClient) -> None:
    assert cliente.get("/api/productos").status_code == 401
    assert alta_producto(cliente, producto_valido()).status_code == 401


@pytest.mark.parametrize(
    ("cambios", "campo"),
    [
        pytest.param({"id": "no-es-un-uuid"}, "id", id="id"),
        pytest.param({"id": None}, "id", id="sin-id"),
        pytest.param({"nombreComercial": ""}, "nombreComercial", id="nombre-vacio"),
        pytest.param({"nombreComercial": "x" * 151}, "nombreComercial", id="nombre-largo"),
        pytest.param({"numeroRegistro": " "}, "numeroRegistro", id="registro-en-blanco"),
        pytest.param({"numeroRegistro": "1\u0000"}, "numeroRegistro", id="registro-nulo"),
        pytest.param({"numeroRegistro": "x" * 31}, "numeroRegistro", id="registro-largo"),
    ],
)
def test_req16_datos_no_validos_responden_422(
    cliente: TestClient, cambios: dict[str, Any], campo: str
) -> None:
    entrar(cliente)
    errores = errores_de(alta_producto(cliente, producto_valido(**cambios)))
    assert campo in errores, errores
    assert errores[campo]["mensaje"] not in ("", GENERICO)
    assert cliente.get("/api/productos").json() == []


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"nombre_comercial": ""}, id="nombre-vacio"),
        pytest.param({"nombre_comercial": "x" * 151}, id="nombre-largo"),
        pytest.param({"numero_registro": ""}, id="registro-vacio"),
        pytest.param({"numero_registro": "x" * 31}, id="registro-largo"),
        pytest.param({"estado": "baja"}, id="baja-sin-fecha"),
    ],
)
def test_req16_la_base_rechaza_productos_no_validos(
    cliente: TestClient, bd: Engine, cambios: dict[str, Any]
) -> None:
    entrar(cliente)
    fila = {
        "id": uuid.uuid4(),
        "explotacion_id": consultar(bd, "SELECT id FROM explotacion")[0].id,
        "nombre_comercial": "Cobre",
        "numero_registro": "ES-1",
        "estado": "activa",
        "fecha_baja": None,
    } | cambios
    with pytest.raises(IntegrityError), bd.begin() as conexion:
        conexion.execute(
            text(
                "INSERT INTO producto (id, explotacion_id, nombre_comercial, numero_registro, "
                "estado, fecha_baja) VALUES (:id, :explotacion_id, :nombre_comercial, "
                ":numero_registro, :estado, :fecha_baja)"
            ),
            fila,
        )
