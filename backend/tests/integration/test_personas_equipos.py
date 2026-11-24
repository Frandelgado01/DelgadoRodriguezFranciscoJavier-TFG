"""Pruebas de REQ-15: personas que aplican o asesoran y equipos de aplicación (T-22).

Criterios de la spec (historia 4, escenarios 2 y 3) y de data-model ("persona" y "equipo"): nombre y
número de carné, sin NIF ni otros datos personales (principio VI); descripción del equipo, fecha de
adquisición o de la última inspección (no posterior a hoy) y número ROMA "si procede".
"""

import uuid
from datetime import date
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.exc import IntegrityError

from tests.conftest import RelojFijo
from tests.contract.contrato import openapi_generado
from tests.integration.test_cuenta_sesion import consultar
from tests.integration.test_parcelas import GENERICO, entrar, errores_de

HOY = date(2026, 3, 15)  # "hoy" del reloj fijo de las pruebas (conftest)


def persona_valida(**cambios: Any) -> dict[str, Any]:
    return {"nombre": "Juan Pérez", "tipo": "aplicador", "numeroCarne": "CM-13-0457"} | cambios


def equipo_valido(**cambios: Any) -> dict[str, Any]:
    """Escenario 3: equipo con número ROMA."""
    datos = {
        "descripcion": "Pulverizador hidráulico suspendido 800 L",
        "fechaAdquisicionOInspeccion": "2025-05-20",
        "numeroRoma": "ES130530000123",
    }
    return datos | cambios


def alta_persona(cliente: TestClient, **cambios: Any) -> Any:
    return cliente.post("/api/personas", json=persona_valida(**cambios))


def alta_equipo(cliente: TestClient, **cambios: Any) -> Any:
    return cliente.post("/api/equipos", json=equipo_valido(**cambios))


def de_alta(id_: str) -> dict[str, Any]:
    return {"id": id_, "estado": "activa", "fechaBaja": None}


# --- Personas ---


def test_req15_alta_de_un_aplicador_y_un_asesor_y_listado(cliente: TestClient) -> None:
    """Escenario 2: el aplicador dado de alta queda disponible para elegirlo."""
    entrar(cliente)
    aplicador = alta_persona(cliente)
    assert aplicador.status_code == 201, aplicador.text
    asesor = alta_persona(cliente, nombre="María López", tipo="asesor", numeroCarne="AS-0099")
    assert asesor.status_code == 201, asesor.text

    id_aplicador = aplicador.json()["id"]
    uuid.UUID(id_aplicador)
    assert aplicador.json() == persona_valida() | de_alta(id_aplicador)

    listado = cliente.get("/api/personas")
    assert listado.status_code == 200
    assert sorted(p["tipo"] for p in listado.json()) == ["aplicador", "asesor"]
    assert aplicador.json() in listado.json()


def test_req15_modificar_una_persona_con_put(cliente: TestClient) -> None:
    entrar(cliente)
    id_ = alta_persona(cliente).json()["id"]
    nuevos = persona_valida(nombre="Juan Pérez Gil", numeroCarne="CM-13-9999")
    respuesta = cliente.put(f"/api/personas/{id_}", json=nuevos)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json() == nuevos | de_alta(id_)
    assert cliente.get("/api/personas").json() == [nuevos | de_alta(id_)]


def test_req15_modificar_una_persona_inexistente_o_de_otra_explotacion_responde_404(
    cliente: TestClient,
) -> None:
    entrar(cliente, "ana@example.com")
    de_ana = alta_persona(cliente).json()["id"]
    entrar(cliente, "luis@example.com")
    assert cliente.get("/api/personas").json() == []
    assert cliente.put(f"/api/personas/{de_ana}", json=persona_valida()).status_code == 404
    assert cliente.put(f"/api/personas/{uuid.uuid4()}", json=persona_valida()).status_code == 404


@pytest.mark.parametrize(
    ("cambios", "campo"),
    [
        pytest.param({"nombre": ""}, "nombre", id="nombre-vacio"),
        pytest.param({"nombre": "   "}, "nombre", id="nombre-en-blanco"),
        pytest.param({"nombre": "a\u0000b"}, "nombre", id="nombre-con-caracter-nulo"),
        pytest.param({"nombre": "x" * 151}, "nombre", id="nombre-largo"),
        pytest.param({"tipo": "tecnico"}, "tipo", id="tipo"),
        pytest.param({"numeroCarne": ""}, "numeroCarne", id="carne-vacio"),
        pytest.param({"numeroCarne": "x" * 31}, "numeroCarne", id="carne-largo"),
        pytest.param({"numeroCarne": None}, "numeroCarne", id="carne-nulo"),
    ],
)
def test_req15_persona_con_datos_no_validos_responde_422(
    cliente: TestClient, cambios: dict[str, Any], campo: str
) -> None:
    entrar(cliente)
    errores = errores_de(alta_persona(cliente, **cambios))
    assert campo in errores, errores
    assert errores[campo]["mensaje"] not in ("", GENERICO)
    assert cliente.get("/api/personas").json() == []


def test_req15_la_persona_no_tiene_nif_ni_otros_datos_personales(
    cliente: TestClient, bd: Engine
) -> None:
    """Solo nombre, tipo y número de carné (REQ-15; principio VI)."""
    entrada = openapi_generado()["components"]["schemas"]["PersonaEntrada"]
    assert set(entrada["properties"]) == {"nombre", "tipo", "numeroCarne"}

    entrar(cliente)
    respuesta = alta_persona(cliente, nif="12345678Z", telefono="600000000")
    assert respuesta.status_code == 201
    assert "nif" not in respuesta.json()
    columnas = {
        fila[0]
        for fila in consultar(
            bd, "SELECT column_name FROM information_schema.columns WHERE table_name = 'persona'"
        )
    }
    assert columnas == {
        "id",
        "explotacion_id",
        "nombre",
        "tipo",
        "numero_carne",
        "estado",
        "fecha_baja",
    }


# --- Equipos ---


def test_req15_alta_de_un_equipo_con_numero_roma(cliente: TestClient) -> None:
    """Escenario 3: el equipo con número ROMA lo conserva y lo devuelve."""
    entrar(cliente)
    respuesta = alta_equipo(cliente)
    assert respuesta.status_code == 201, respuesta.text
    id_ = respuesta.json()["id"]
    uuid.UUID(id_)
    assert respuesta.json() == equipo_valido() | de_alta(id_)
    assert cliente.get("/api/equipos").json() == [respuesta.json()]


def test_req15_el_numero_roma_es_opcional(cliente: TestClient) -> None:
    entrar(cliente)
    datos = equipo_valido()
    del datos["numeroRoma"]
    respuesta = cliente.post("/api/equipos", json=datos)
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["numeroRoma"] is None
    assert alta_equipo(cliente, numeroRoma="").json()["numeroRoma"] is None


def test_req15_la_fecha_del_equipo_puede_ser_hoy_pero_no_posterior(
    cliente: TestClient, reloj: RelojFijo
) -> None:
    entrar(cliente)
    assert alta_equipo(cliente, fechaAdquisicionOInspeccion=HOY.isoformat()).status_code == 201
    errores = errores_de(alta_equipo(cliente, fechaAdquisicionOInspeccion="2026-03-16"))
    error = errores["fechaAdquisicionOInspeccion"]
    assert error["req"] == "REQ-15"
    assert error["mensaje"] not in ("", GENERICO)

    # "Hoy" es el día en Europe/Madrid: el reloj avanza y la misma fecha ya vale.
    reloj.fijar_hoy(date(2026, 3, 16))
    assert alta_equipo(cliente, fechaAdquisicionOInspeccion="2026-03-16").status_code == 201


@pytest.mark.parametrize(
    ("cambios", "campo"),
    [
        pytest.param({"descripcion": ""}, "descripcion", id="descripcion-vacia"),
        pytest.param({"descripcion": "x" * 151}, "descripcion", id="descripcion-larga"),
        pytest.param(
            {"fechaAdquisicionOInspeccion": None}, "fechaAdquisicionOInspeccion", id="sin-fecha"
        ),
        pytest.param(
            {"fechaAdquisicionOInspeccion": "20/05/2025"},
            "fechaAdquisicionOInspeccion",
            id="fecha-mal",
        ),
        pytest.param({"numeroRoma": "x" * 31}, "numeroRoma", id="roma-largo"),
    ],
)
def test_req15_equipo_con_datos_no_validos_responde_422(
    cliente: TestClient, cambios: dict[str, Any], campo: str
) -> None:
    entrar(cliente)
    errores = errores_de(alta_equipo(cliente, **cambios))
    assert campo in errores, errores
    assert errores[campo]["mensaje"] not in ("", GENERICO)
    assert cliente.get("/api/equipos").json() == []


def test_req15_modificar_un_equipo_con_put(cliente: TestClient) -> None:
    entrar(cliente)
    id_ = alta_equipo(cliente).json()["id"]
    nuevos = equipo_valido(fechaAdquisicionOInspeccion="2026-02-01", numeroRoma=None)
    respuesta = cliente.put(f"/api/equipos/{id_}", json=nuevos)
    assert respuesta.status_code == 200, respuesta.text
    assert respuesta.json() == nuevos | de_alta(id_)

    futura = cliente.put(
        f"/api/equipos/{id_}", json=equipo_valido(fechaAdquisicionOInspeccion="2027-01-01")
    )
    assert "fechaAdquisicionOInspeccion" in errores_de(futura)


def test_req15_modificar_un_equipo_inexistente_o_de_otra_explotacion_responde_404(
    cliente: TestClient,
) -> None:
    entrar(cliente, "ana@example.com")
    de_ana = alta_equipo(cliente).json()["id"]
    entrar(cliente, "luis@example.com")
    assert cliente.get("/api/equipos").json() == []
    assert cliente.put(f"/api/equipos/{de_ana}", json=equipo_valido()).status_code == 404
    assert cliente.put(f"/api/equipos/{uuid.uuid4()}", json=equipo_valido()).status_code == 404


def test_req15_sin_sesion_responde_401(cliente: TestClient) -> None:
    for ruta in ("/api/personas", "/api/equipos"):
        assert cliente.get(ruta).status_code == 401
        assert cliente.post(ruta, json={}).status_code == 401


# --- Restricciones de la base (data-model) ---


def _insertar(bd: Engine, tabla: str, fila: dict[str, Any]) -> None:
    columnas = ", ".join(fila)
    valores = ", ".join(f":{c}" for c in fila)
    with bd.begin() as conexion:
        # Tabla y columnas son las de esta prueba, no datos externos.
        conexion.execute(text(f"INSERT INTO {tabla} ({columnas}) VALUES ({valores})"), fila)  # noqa: S608


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"tipo": "tecnico"}, id="tipo"),
        pytest.param({"nombre": ""}, id="nombre-vacio"),
        pytest.param({"nombre": "x" * 151}, id="nombre-largo"),
        pytest.param({"numero_carne": ""}, id="carne-vacio"),
        pytest.param({"numero_carne": "x" * 31}, id="carne-largo"),
        pytest.param({"estado": "baja"}, id="baja-sin-fecha"),
        pytest.param({"fecha_baja": "2026-01-01"}, id="fecha-sin-baja"),
        pytest.param({"estado": "borrada", "fecha_baja": "2026-01-01"}, id="estado"),
    ],
)
def test_req15_la_base_rechaza_personas_no_validas(
    cliente: TestClient, bd: Engine, cambios: dict[str, Any]
) -> None:
    entrar(cliente)
    fila = {
        "id": uuid.uuid4(),
        "explotacion_id": consultar(bd, "SELECT id FROM explotacion")[0].id,
        "nombre": "Juan",
        "tipo": "aplicador",
        "numero_carne": "CM-1",
        "estado": "activa",
        "fecha_baja": None,
    }
    with pytest.raises(IntegrityError):
        _insertar(bd, "persona", fila | cambios)


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"descripcion": ""}, id="descripcion-vacia"),
        pytest.param({"descripcion": "x" * 151}, id="descripcion-larga"),
        pytest.param({"fecha_adquisicion_o_inspeccion": None}, id="sin-fecha"),
        pytest.param({"numero_roma": "x" * 31}, id="roma-largo"),
        pytest.param({"estado": "baja"}, id="baja-sin-fecha"),
    ],
)
def test_req15_la_base_rechaza_equipos_no_validos(
    cliente: TestClient, bd: Engine, cambios: dict[str, Any]
) -> None:
    entrar(cliente)
    fila = {
        "id": uuid.uuid4(),
        "explotacion_id": consultar(bd, "SELECT id FROM explotacion")[0].id,
        "descripcion": "Mochila",
        "fecha_adquisicion_o_inspeccion": "2025-01-01",
        "numero_roma": None,
        "estado": "activa",
        "fecha_baja": None,
    }
    with pytest.raises(IntegrityError):
        _insertar(bd, "equipo", fila | cambios)
