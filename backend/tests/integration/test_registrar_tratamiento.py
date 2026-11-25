"""Pruebas del registro de tratamientos (T-35; REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-17).

Escenarios 1 a 4 de la historia 1 de la spec, con los datos de la sección B de la parte I del anexo
III del RD 1311/2012, y las comprobaciones contra la base de datos (data-model, "tratamiento").
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from tests.conftest import RelojFijo
from tests.integration.test_bajas import dar_de_baja
from tests.integration.test_cuenta_sesion import consultar
from tests.integration.test_parcelas import (
    GENERICO,
    alta_parcela,
    entrar,
    errores_de,
    parcela_valida,
    sigpac,
)
from tests.integration.test_personas_equipos import alta_equipo, alta_persona
from tests.integration.test_productos import alta_producto, producto_valido

HOY = date(2026, 3, 15)  # "hoy" del reloj fijo de las pruebas (conftest), a las 12:00 de Madrid
REGISTRADO_EN = "2026-03-15T10:30:00Z"


@dataclass
class Maestros:
    """Datos de la explotación del escenario 1 (historia 4) y otros para la mezcla."""

    parcela: dict[str, Any]
    otra_parcela: dict[str, Any]
    aplicador: dict[str, Any]
    asesor: dict[str, Any]
    equipo: dict[str, Any]
    producto: dict[str, Any]
    otro_producto: dict[str, Any]


def preparar(cliente: TestClient, correo: str = "ana@example.com") -> Maestros:
    entrar(cliente, correo)
    otro = producto_valido(nombreComercial="Azufre líquido", numeroRegistro="ES-00456")
    return Maestros(
        parcela=alta_parcela(cliente).json(),
        otra_parcela=alta_parcela(
            cliente, nombre="El Llano", superficie=2, sigpac=sigpac(recinto=2)
        ).json(),
        aplicador=alta_persona(cliente).json(),
        asesor=alta_persona(
            cliente, nombre="María López", tipo="asesor", numeroCarne="AS-0099"
        ).json(),
        equipo=alta_equipo(cliente).json(),
        producto=alta_producto(cliente, producto_valido()).json(),
        otro_producto=alta_producto(cliente, otro).json(),
    )


def linea_parcela(parcela: dict[str, Any], superficie: float, **cambios: Any) -> dict[str, Any]:
    linea = {
        "parcelaId": parcela["id"],
        "superficieTratada": superficie,
        "cultivoEspecie": "Vitis vinifera",
        "cultivoVariedad": "Airén",
        "productoSemilla": None,
    }
    return linea | cambios


def linea_producto(producto: dict[str, Any], cantidad: float, unidad: str = "kg") -> dict[str, Any]:
    return {"productoId": producto["id"], "cantidad": cantidad, "unidadMedida": unidad}


def tratamiento_valido(m: Maestros, **cambios: Any) -> dict[str, Any]:
    """Escenario 1: mildiu en 3,5 de las 4,2 ha de un viñedo de Airén, con 2 kg de producto."""
    datos: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "registradoEn": REGISTRADO_EN,
        "fecha": HOY.isoformat(),
        "problema": "Mildiu",
        "aplicadorId": m.aplicador["id"],
        "asesorId": None,
        "equipoId": m.equipo["id"],
        "parcelas": [linea_parcela(m.parcela, 3.5)],
        "productos": [linea_producto(m.producto, 2)],
        "eficacia": None,
        "observaciones": None,
    }
    return datos | cambios


def registrar(cliente: TestClient, datos: dict[str, Any]) -> Any:
    return cliente.post("/api/tratamientos", json=datos)


def sin_dosis(tratamiento: dict[str, Any]) -> dict[str, Any]:
    """El tratamiento sin la dosis calculada, que se prueba aparte (REQ-23, T-75)."""
    productos = [
        {k: v for k, v in p.items() if k not in ("dosisPorHectarea", "unidadDosis")}
        for p in tratamiento["productos"]
    ]
    return tratamiento | {"productos": productos}


def contar(bd: Engine, tabla: str) -> int:
    # La tabla la ponen las pruebas, no datos externos.
    return int(consultar(bd, f"SELECT count(*) n FROM {tabla}")[0].n)  # noqa: S608


# --- Escenario 1: registrar y ver todos los datos ---


def test_req01_escenario_1_registra_y_devuelve_todos_los_datos(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(
        m,
        asesorId=m.asesor["id"],
        eficacia="buena",
        observaciones="Sin viento. Caldo de 400 L.",
        parcelas=[linea_parcela(m.parcela, 3.5, productoSemilla="Tebuconazol")],
    )
    respuesta = registrar(cliente, datos)
    assert respuesta.status_code == 201, respuesta.text

    esperado = datos | {"version": 1, "enConflicto": False}
    esperado["parcelas"] = [datos["parcelas"][0] | {"numeroOrden": 1}]
    assert sin_dosis(respuesta.json()) == esperado
    leido = cliente.get(f"/api/tratamientos/{datos['id']}")
    assert leido.status_code == 200
    assert leido.json() == respuesta.json()


def test_req02_los_datos_opcionales_se_pueden_omitir(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    for opcional in ("asesorId", "eficacia", "observaciones"):
        del datos[opcional]
    del datos["parcelas"][0]["productoSemilla"]
    respuesta = registrar(cliente, datos)
    assert respuesta.status_code == 201, respuesta.text
    t = respuesta.json()
    assert (t["asesorId"], t["eficacia"], t["observaciones"]) == (None, None, None)
    assert t["parcelas"][0]["productoSemilla"] is None


def test_req01_los_textos_se_guardan_sin_espacios_a_los_lados(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m, problema="  Mildiu ", observaciones="   ")
    t = registrar(cliente, datos).json()
    assert t["problema"] == "Mildiu"
    assert t["observaciones"] is None


def test_req01_un_equipo_sin_numero_roma_se_admite(cliente: TestClient) -> None:
    m = preparar(cliente)
    equipo = alta_equipo(cliente, numeroRoma=None).json()
    assert registrar(cliente, tratamiento_valido(m, equipoId=equipo["id"])).status_code == 201


# --- Escenario 2: datos que faltan ---


@pytest.mark.parametrize(
    ("campo", "valor", "senalado"),
    [
        pytest.param("productos", [], "productos", id="sin-productos"),
        pytest.param("productos", None, "productos", id="productos-null"),
        pytest.param("parcelas", [], "parcelas", id="sin-parcelas"),
        pytest.param("fecha", None, "fecha", id="sin-fecha"),
        pytest.param("problema", " ", "problema", id="problema-en-blanco"),
        pytest.param("aplicadorId", None, "aplicadorId", id="sin-aplicador"),
        pytest.param("equipoId", None, "equipoId", id="sin-equipo"),
        pytest.param("id", None, "id", id="sin-id"),
        pytest.param("registradoEn", None, "registradoEn", id="sin-registradoEn"),
        pytest.param("registradoEn", "2026-03-15T10:30:00", "registradoEn", id="sin-zona"),
    ],
)
def test_req02_escenario_2_sin_un_dato_obligatorio_responde_422_y_lo_senala(
    cliente: TestClient, bd: Engine, campo: str, valor: Any, senalado: str
) -> None:
    m = preparar(cliente)
    errores = errores_de(registrar(cliente, tratamiento_valido(m, **{campo: valor})))
    assert senalado in errores, errores
    assert errores[senalado]["mensaje"] not in ("", GENERICO)
    assert contar(bd, "tratamiento") == 0


@pytest.mark.parametrize(
    ("lista", "campo"),
    [
        ("productos", "cantidad"),
        ("productos", "unidadMedida"),
        ("productos", "productoId"),
        ("parcelas", "superficieTratada"),
        ("parcelas", "cultivoEspecie"),
        ("parcelas", "cultivoVariedad"),
        ("parcelas", "parcelaId"),
    ],
)
def test_req02_escenario_2_sin_un_dato_de_una_linea_responde_422_y_lo_senala(
    cliente: TestClient, bd: Engine, lista: str, campo: str
) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    del datos[lista][0][campo]
    errores = errores_de(registrar(cliente, datos))
    assert f"{lista}.0.{campo}" in errores, errores
    assert errores[f"{lista}.0.{campo}"]["mensaje"] not in ("", GENERICO)
    assert contar(bd, "tratamiento") == 0


# --- Escenario 3: rechazos de REQ-04 ---


def test_req04_escenario_3_superficie_mayor_que_la_parcela(cliente: TestClient) -> None:
    m = preparar(cliente)
    errores = errores_de(
        registrar(cliente, tratamiento_valido(m, parcelas=[linea_parcela(m.parcela, 5)]))
    )
    assert errores["parcelas.0.superficieTratada"] == {
        "campo": "parcelas.0.superficieTratada",
        "mensaje": "La superficie tratada (5 ha) es mayor que la de la parcela (4,2 ha).",
        "req": "REQ-04",
    }


@pytest.mark.parametrize("superficie", [0, -1, 3.505, 0.004, 1e300])
def test_req04_superficie_no_valida_responde_422(cliente: TestClient, superficie: float) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m, parcelas=[linea_parcela(m.parcela, superficie)])
    errores = errores_de(registrar(cliente, datos))
    assert errores["parcelas.0.superficieTratada"]["mensaje"] not in ("", GENERICO)


@pytest.mark.parametrize("cantidad", [0, -2, 0.0004, 1_000_000_000, 1e300])
def test_req04_cantidad_no_valida_responde_422(cliente: TestClient, cantidad: float) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m, productos=[linea_producto(m.producto, cantidad)])
    errores = errores_de(registrar(cliente, datos))
    assert errores["productos.0.cantidad"]["mensaje"] not in ("", GENERICO)


@pytest.mark.parametrize("unidad", ["g", "l", "ml", ""])
def test_req04_unidad_no_valida_responde_422(cliente: TestClient, unidad: str) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m, productos=[linea_producto(m.producto, 2, unidad)])
    errores = errores_de(registrar(cliente, datos))
    assert errores["productos.0.unidadMedida"]["mensaje"] not in ("", GENERICO)


def test_req04_fecha_posterior_a_hoy_responde_422(cliente: TestClient) -> None:
    m = preparar(cliente)
    errores = errores_de(registrar(cliente, tratamiento_valido(m, fecha="2026-03-16")))
    assert errores["fecha"]["mensaje"] == "La fecha no puede ser posterior a hoy."
    assert errores["fecha"]["req"] == "REQ-04"


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"problema": "x" * 201}, id="problema"),
        pytest.param({"problema": "Mildiu\u0000"}, id="problema-nulo"),
        pytest.param({"observaciones": "x" * 2001}, id="observaciones"),
        pytest.param({"observaciones": "a\u0000"}, id="observaciones-nulo"),
        pytest.param({"eficacia": "excelente"}, id="eficacia"),
        pytest.param({"aplicadorId": "x"}, id="aplicadorId"),
    ],
)
def test_req04_datos_no_validos_responden_422(cliente: TestClient, cambios: dict[str, Any]) -> None:
    m = preparar(cliente)
    errores = errores_de(registrar(cliente, tratamiento_valido(m, **cambios)))
    (campo,) = cambios
    assert errores[campo]["mensaje"] not in ("", GENERICO)


def test_req04_se_senalan_a_la_vez_todos_los_datos_incorrectos(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(
        m,
        fecha="2026-03-16",
        parcelas=[linea_parcela(m.parcela, 5)],
        productos=[linea_producto(m.producto, 0)],
    )
    errores = errores_de(registrar(cliente, datos))
    assert set(errores) == {"fecha", "parcelas.0.superficieTratada", "productos.0.cantidad"}


def test_req03_parcela_o_producto_repetidos_responden_422(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(
        m,
        parcelas=[linea_parcela(m.parcela, 1), linea_parcela(m.parcela, 2)],
        productos=[linea_producto(m.producto, 1), linea_producto(m.producto, 2)],
    )
    errores = errores_de(registrar(cliente, datos))
    assert set(errores) == {"parcelas.1.parcelaId", "productos.1.productoId"}


# --- Escenario 4: varias parcelas y varios productos en mezcla ---


def test_req03_escenario_4_dos_productos_sobre_dos_parcelas(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(
        m,
        # En otro orden: la respuesta ordena las parcelas por su número de orden.
        parcelas=[linea_parcela(m.otra_parcela, 2), linea_parcela(m.parcela, 1.5)],
        productos=[
            linea_producto(m.producto, 2, "kg"),
            linea_producto(m.otro_producto, 1.5, "L"),
        ],
    )
    assert registrar(cliente, datos).status_code == 201
    t = cliente.get(f"/api/tratamientos/{datos['id']}").json()
    assert [(p["numeroOrden"], p["parcelaId"], p["superficieTratada"]) for p in t["parcelas"]] == [
        (1, m.parcela["id"], 1.5),
        (2, m.otra_parcela["id"], 2),
    ]
    assert {(p["productoId"], p["cantidad"], p["unidadMedida"]) for p in t["productos"]} == {
        (m.producto["id"], 2, "kg"),
        (m.otro_producto["id"], 1.5, "L"),
    }


# --- REQ-05: copia del cultivo ---


def test_req05_el_cultivo_se_guarda_como_copia(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m, parcelas=[linea_parcela(m.parcela, 3.5)])
    assert registrar(cliente, datos).status_code == 201

    cambiada = parcela_valida(cultivoVariedad="Tempranillo", superficie=1)
    assert cliente.put(f"/api/parcelas/{m.parcela['id']}", json=cambiada).status_code == 200

    linea = cliente.get(f"/api/tratamientos/{datos['id']}").json()["parcelas"][0]
    assert linea["cultivoVariedad"] == "Airén"
    assert linea["superficieTratada"] == 3.5


def test_req05_el_agricultor_puede_cambiar_el_cultivo_propuesto(cliente: TestClient) -> None:
    m = preparar(cliente)
    linea = linea_parcela(m.parcela, 1, cultivoEspecie="Triticum aestivum", cultivoVariedad="Cabal")
    respuesta = registrar(cliente, tratamiento_valido(m, parcelas=[linea]))
    assert respuesta.status_code == 201
    assert respuesta.json()["parcelas"][0]["cultivoEspecie"] == "Triticum aestivum"


# --- REQ-17 y REQ-20: elementos que no se pueden usar ---


@pytest.mark.parametrize(
    ("ruta", "atributo", "campo"),
    [
        ("parcelas", "parcela", "parcelas.0.parcelaId"),
        ("personas", "aplicador", "aplicadorId"),
        ("personas", "asesor", "asesorId"),
        ("equipos", "equipo", "equipoId"),
        ("productos", "producto", "productos.0.productoId"),
    ],
)
def test_req17_un_elemento_de_baja_no_se_puede_usar(
    cliente: TestClient, bd: Engine, ruta: str, atributo: str, campo: str
) -> None:
    m = preparar(cliente)
    assert dar_de_baja(cliente, ruta, getattr(m, atributo)["id"]).status_code == 200
    errores = errores_de(registrar(cliente, tratamiento_valido(m, asesorId=m.asesor["id"])))
    assert set(errores) == {campo}
    assert "baja" in errores[campo]["mensaje"]
    assert errores[campo]["req"] == "REQ-17"
    assert contar(bd, "tratamiento") == 0


def test_req17_la_baja_no_altera_los_tratamientos_registrados(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    respuesta = registrar(cliente, datos)
    assert respuesta.status_code == 201, respuesta.text
    registrado = respuesta.json()
    assert dar_de_baja(cliente, "parcelas", m.parcela["id"]).status_code == 200
    assert dar_de_baja(cliente, "productos", m.producto["id"]).status_code == 200
    assert cliente.get(f"/api/tratamientos/{datos['id']}").json() == registrado


def test_req01_el_aplicador_no_puede_ser_un_asesor_ni_al_reves(cliente: TestClient) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m, aplicadorId=m.asesor["id"], asesorId=m.aplicador["id"])
    errores = errores_de(registrar(cliente, datos))
    assert set(errores) == {"aplicadorId", "asesorId"}


def test_req20_los_datos_de_otra_explotacion_no_se_pueden_usar(
    cliente: TestClient, bd: Engine
) -> None:
    ajenos = preparar(cliente, "luis@example.com")
    preparar(cliente, "ana@example.com")
    errores = errores_de(
        registrar(cliente, tratamiento_valido(ajenos, asesorId=ajenos.asesor["id"]))
    )
    assert set(errores) == {
        "parcelas.0.parcelaId",
        "aplicadorId",
        "asesorId",
        "equipoId",
        "productos.0.productoId",
    }
    # No se revela nada de la otra explotación, tampoco la superficie de la parcela.
    assert all("ha)" not in e["mensaje"] for e in errores.values())
    assert contar(bd, "tratamiento") == 0


def test_req20_un_tratamiento_de_otra_explotacion_no_se_ve(cliente: TestClient) -> None:
    m = preparar(cliente, "luis@example.com")
    datos = tratamiento_valido(m)
    assert registrar(cliente, datos).status_code == 201
    entrar(cliente, "ana@example.com")
    assert cliente.get(f"/api/tratamientos/{datos['id']}").status_code == 404
    assert cliente.get(f"/api/tratamientos/{uuid.uuid4()}").status_code == 404


def test_req20_sin_sesion_responde_401(cliente: TestClient) -> None:
    assert registrar(cliente, {}).status_code == 401
    assert cliente.get(f"/api/tratamientos/{uuid.uuid4()}").status_code == 401


# --- Historial y fecha de registro ---


def test_req01_se_guarda_un_cambio_de_creacion_con_la_instantanea(
    cliente: TestClient, bd: Engine, reloj: RelojFijo
) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m)
    assert registrar(cliente, datos).status_code == 201
    (cambio,) = consultar(bd, "SELECT * FROM cambio")
    assert str(cambio.tratamiento_id) == datos["id"]
    assert cambio.tipo == "creacion"
    assert (cambio.version_base, cambio.version_resultante) == (0, 1)
    assert cambio.datos_anteriores is None
    for campo in ("fecha", "problema", "aplicadorId", "equipoId", "parcelas", "productos"):
        assert cambio.datos_nuevos[campo] == datos[campo], campo
    assert cambio.realizado_en == datetime(2026, 3, 15, 10, 30, tzinfo=UTC)
    assert cambio.recibido_en == reloj.ahora()


@pytest.mark.parametrize(
    ("registrado_en", "fecha_registro"),
    [
        # 23:30 UTC del día 14 son las 00:30 del 15 en Madrid (UTC+1 en marzo).
        ("2026-03-14T23:30:00Z", date(2026, 3, 15)),
        ("2026-03-14T22:30:00Z", date(2026, 3, 14)),
        ("2026-03-15T10:30:00+01:00", date(2026, 3, 15)),
    ],
)
def test_req09_la_fecha_de_registro_es_la_de_registrado_en_en_madrid(
    cliente: TestClient, bd: Engine, registrado_en: str, fecha_registro: date
) -> None:
    m = preparar(cliente)
    datos = tratamiento_valido(m, fecha="2026-03-10", registradoEn=registrado_en)
    assert registrar(cliente, datos).status_code == 201
    (t,) = consultar(bd, "SELECT fecha_registro, recibido_en FROM tratamiento")
    assert t.fecha_registro == fecha_registro


@pytest.mark.parametrize(
    "registrado_en",
    [
        pytest.param("2026-03-15T11:00:01Z", id="futuro"),
        pytest.param("2026-03-14T22:59:00Z", id="anterior-a-la-fecha"),
    ],
)
def test_req09_registrado_en_futuro_o_anterior_a_la_fecha_responde_422(
    cliente: TestClient, bd: Engine, registrado_en: str
) -> None:
    m = preparar(cliente)
    errores = errores_de(registrar(cliente, tratamiento_valido(m, registradoEn=registrado_en)))
    assert set(errores) == {"registradoEn"}
    assert contar(bd, "tratamiento") == 0


def test_req01_si_algo_falla_no_se_guarda_nada(cliente: TestClient, bd: Engine) -> None:
    """Todo en una transacción: ni tratamiento, ni líneas, ni historial a medias."""
    m = preparar(cliente)
    datos = tratamiento_valido(
        m, productos=[linea_producto(m.producto, 1), linea_producto({"id": str(uuid.uuid4())}, 1)]
    )
    assert set(errores_de(registrar(cliente, datos))) == {"productos.1.productoId"}
    for tabla in ("tratamiento", "tratamiento_parcela", "tratamiento_producto", "cambio"):
        assert contar(bd, tabla) == 0
