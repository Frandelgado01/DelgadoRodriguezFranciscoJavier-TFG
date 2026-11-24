"""Pruebas de REQ-14: alta, listado y modificación de parcelas (T-20).

Criterios de la spec (historia 4, escenario 1) y de data-model ("parcela"): datos de la
sección A.2 del anexo III del RD 1311/2012, número de orden correlativo por explotación que asigna
el servidor y no se reutiliza (A.2.a), especie y variedad obligatorias en los cultivos leñosos
(A.2.d), regadío con su sistema de riego, protegido con su tipo de protección y referencia SIGPAC
única entre las parcelas activas de la explotación.
"""

import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.exc import IntegrityError

from cuaderno.main import app
from tests.integration.test_cuenta_sesion import consultar, crear_cuenta

GENERICO = "El dato no es válido."


def sigpac(**cambios: int) -> dict[str, int]:
    """Referencia SIGPAC de un recinto de Ciudad Real; `cambios` sustituye componentes."""
    referencia = {
        "provincia": 13,
        "municipio": 53,
        "agregado": 0,
        "zona": 0,
        "poligono": 12,
        "parcela": 345,
        "recinto": 1,
    }
    return referencia | cambios


def parcela_valida(**cambios: Any) -> dict[str, Any]:
    """Escenario 1 de la historia 4: viñedo de Airén, leñoso, 4,2 ha, en secano y al aire libre."""
    datos: dict[str, Any] = {
        "nombre": "Viña Grande",
        "sigpac": sigpac(),
        "superficie": 4.2,
        "usoSigpac": "VI",
        "aprovechamiento": "cultivo",
        "cultivoLenoso": True,
        "cultivoEspecie": "Vitis vinifera",
        "cultivoVariedad": "Airén",
        "sistemaExplotacion": "secano",
        "sistemaRiego": None,
        "protegido": False,
        "tipoProteccion": None,
        "sistemaCertificacion": None,
        "marcoControlPlagas": "Gestión integrada de plagas",
    }
    return datos | cambios


def alta_parcela(cliente: TestClient, **cambios: Any) -> Any:
    return cliente.post("/api/parcelas", json=parcela_valida(**cambios))


def entrar(cliente: TestClient, correo: str = "ana@example.com") -> None:
    """Crea la cuenta (y su explotación) e inicia sesión con ella."""
    assert crear_cuenta(cliente, correo=correo).status_code == 201


def errores_de(respuesta: Any) -> dict[str, dict[str, Any]]:
    """Errores de una respuesta 422, por campo."""
    assert respuesta.status_code == 422, respuesta.text
    return {error["campo"]: error for error in respuesta.json()["errores"]}


# --- Alta y listado ---


def test_req14_alta_con_todos_los_datos_responde_201_y_aparece_en_el_listado(
    cliente: TestClient,
) -> None:
    entrar(cliente)
    respuesta = alta_parcela(cliente)
    assert respuesta.status_code == 201, respuesta.text
    parcela = respuesta.json()
    uuid.UUID(parcela["id"])
    assert parcela == parcela_valida() | {
        "id": parcela["id"],
        "numeroOrden": 1,
        "estado": "activa",
        "fechaBaja": None,
    }

    listado = cliente.get("/api/parcelas")
    assert listado.status_code == 200
    assert listado.json() == [parcela]


def test_req14_el_nombre_es_opcional(cliente: TestClient) -> None:
    entrar(cliente)
    datos = parcela_valida()
    del datos["nombre"]
    respuesta = cliente.post("/api/parcelas", json=datos)
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["nombre"] is None
    assert respuesta.json()["numeroOrden"] == 1


def test_req14_parcela_no_lenosa_sin_especie_ni_variedad(cliente: TestClient) -> None:
    """En los cultivos no leñosos especie y variedad son opcionales (A.2.d)."""
    entrar(cliente)
    respuesta = alta_parcela(
        cliente,
        usoSigpac="TA",
        cultivoLenoso=False,
        cultivoEspecie=None,
        cultivoVariedad=None,
        sistemaExplotacion="regadio",
        sistemaRiego="Goteo",
        protegido=True,
        tipoProteccion="Invernadero",
        sistemaCertificacion="Producción ecológica",
    )
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["sistemaRiego"] == "Goteo"
    assert respuesta.json()["tipoProteccion"] == "Invernadero"


def test_req14_sin_sesion_responde_401(cliente: TestClient) -> None:
    assert cliente.get("/api/parcelas").status_code == 401
    assert cliente.post("/api/parcelas", json=parcela_valida()).status_code == 401


def test_req14_cada_explotacion_ve_solo_sus_parcelas(cliente: TestClient) -> None:
    entrar(cliente, "ana@example.com")
    assert alta_parcela(cliente).status_code == 201
    entrar(cliente, "luis@example.com")
    assert cliente.get("/api/parcelas").json() == []


# --- Número de orden (A.2.a) ---


def test_req14_numero_de_orden_correlativo_y_propio_de_cada_explotacion(
    cliente: TestClient,
) -> None:
    entrar(cliente, "ana@example.com")
    altas = [alta_parcela(cliente, sigpac=sigpac(recinto=r)) for r in (1, 2, 3)]
    numeros = [a.json()["numeroOrden"] for a in altas]
    assert numeros == [1, 2, 3]
    assert [p["numeroOrden"] for p in cliente.get("/api/parcelas").json()] == [1, 2, 3]

    entrar(cliente, "luis@example.com")
    assert alta_parcela(cliente).json()["numeroOrden"] == 1


def test_req14_el_numero_de_orden_no_se_reutiliza_tras_una_baja(
    cliente: TestClient, bd: Engine
) -> None:
    entrar(cliente)
    ids = [alta_parcela(cliente, sigpac=sigpac(recinto=r)).json()["id"] for r in (1, 2, 3)]
    # La baja se hace en la base: el endpoint de baja llega con REQ-17 (T-27).
    with bd.begin() as conexion:
        conexion.execute(
            text("UPDATE parcela SET estado = 'baja', fecha_baja = current_date WHERE id = :id"),
            {"id": ids[1]},
        )
    assert alta_parcela(cliente, sigpac=sigpac(recinto=4)).json()["numeroOrden"] == 4


def test_req14_dos_altas_simultaneas_reciben_numeros_distintos(cliente: TestClient) -> None:
    entrar(cliente)

    def alta(recinto: int) -> int:
        # Un cliente por hilo, con la misma cookie de sesión.
        otro = TestClient(app, base_url="https://testserver", cookies=dict(cliente.cookies))
        respuesta = alta_parcela(otro, sigpac=sigpac(recinto=recinto))
        assert respuesta.status_code == 201, respuesta.text
        numero: int = respuesta.json()["numeroOrden"]
        return numero

    with ThreadPoolExecutor(max_workers=4) as hilos:
        numeros = sorted(hilos.map(alta, range(1, 5)))
    assert numeros == [1, 2, 3, 4]


def test_req14_el_cliente_no_puede_fijar_ni_cambiar_el_numero_de_orden(
    cliente: TestClient,
) -> None:
    entrar(cliente)
    respuesta = cliente.post("/api/parcelas", json=parcela_valida() | {"numeroOrden": 99})
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["numeroOrden"] == 1

    id_ = respuesta.json()["id"]
    cambio = cliente.put(f"/api/parcelas/{id_}", json=parcela_valida() | {"numeroOrden": 7})
    assert cambio.status_code == 200, cambio.text
    assert cambio.json()["numeroOrden"] == 1


# --- Modificación ---


def test_req14_modificar_con_put(cliente: TestClient) -> None:
    entrar(cliente)
    creada = alta_parcela(cliente).json()
    nuevos = parcela_valida(
        nombre="Viña del Cerro",
        superficie=3.75,
        sistemaExplotacion="regadio",
        sistemaRiego="Goteo",
    )
    respuesta = cliente.put(f"/api/parcelas/{creada['id']}", json=nuevos)
    assert respuesta.status_code == 200, respuesta.text
    esperada = nuevos | {
        "id": creada["id"],
        "numeroOrden": 1,
        "estado": "activa",
        "fechaBaja": None,
    }
    assert respuesta.json() == esperada
    assert cliente.get("/api/parcelas").json() == [esperada]


def test_req14_modificar_una_parcela_inexistente_o_de_otra_explotacion_responde_404(
    cliente: TestClient,
) -> None:
    entrar(cliente, "ana@example.com")
    de_ana = alta_parcela(cliente).json()["id"]
    entrar(cliente, "luis@example.com")
    assert cliente.put(f"/api/parcelas/{de_ana}", json=parcela_valida()).status_code == 404
    assert cliente.put(f"/api/parcelas/{uuid.uuid4()}", json=parcela_valida()).status_code == 404


# --- Rechazos (422 con mensaje llano junto al campo) ---

RECHAZOS = [
    pytest.param({"superficie": 0}, "superficie", id="superficie-cero"),
    pytest.param({"superficie": -1.5}, "superficie", id="superficie-negativa"),
    pytest.param({"aprovechamiento": "huerta"}, "aprovechamiento", id="aprovechamiento"),
    pytest.param({"cultivoEspecie": None}, "cultivoEspecie", id="lenoso-sin-especie"),
    pytest.param({"cultivoVariedad": None}, "cultivoVariedad", id="lenoso-sin-variedad"),
    pytest.param({"cultivoEspecie": "  "}, "cultivoEspecie", id="lenoso-con-especie-en-blanco"),
    pytest.param({"aprovechamiento": "pastos"}, "cultivoLenoso", id="lenoso-no-cultivo"),
    pytest.param({"sistemaExplotacion": "goteo"}, "sistemaExplotacion", id="sistema-explotacion"),
    pytest.param({"sistemaExplotacion": "regadio"}, "sistemaRiego", id="regadio-sin-riego"),
    pytest.param({"sistemaRiego": "Goteo"}, "sistemaRiego", id="secano-con-riego"),
    pytest.param({"protegido": True}, "tipoProteccion", id="protegido-sin-tipo"),
    pytest.param({"tipoProteccion": "Malla"}, "tipoProteccion", id="aire-libre-con-tipo"),
    pytest.param({"sigpac": sigpac(provincia=0)}, "sigpac.provincia", id="provincia-0"),
    pytest.param({"sigpac": sigpac(provincia=100)}, "sigpac.provincia", id="provincia-100"),
    pytest.param({"sigpac": sigpac(municipio=0)}, "sigpac.municipio", id="municipio-0"),
    pytest.param({"sigpac": sigpac(agregado=-1)}, "sigpac.agregado", id="agregado-negativo"),
    pytest.param({"sigpac": sigpac(zona=-1)}, "sigpac.zona", id="zona-negativa"),
    pytest.param({"sigpac": sigpac(poligono=0)}, "sigpac.poligono", id="poligono-0"),
    pytest.param({"sigpac": sigpac(parcela=0)}, "sigpac.parcela", id="parcela-0"),
    pytest.param({"sigpac": sigpac(recinto=0)}, "sigpac.recinto", id="recinto-0"),
]

# Reglas entre campos de REQ-14, que llevan el requisito en el error.
ENTRE_CAMPOS = {
    "cultivoEspecie",
    "cultivoVariedad",
    "cultivoLenoso",
    "sistemaRiego",
    "tipoProteccion",
}


@pytest.mark.parametrize(("cambios", "campo"), RECHAZOS)
def test_req14_datos_no_validos_responden_422_con_mensaje_llano(
    cliente: TestClient, cambios: dict[str, Any], campo: str
) -> None:
    entrar(cliente)
    errores = errores_de(alta_parcela(cliente, **cambios))
    assert campo in errores, errores
    assert errores[campo]["mensaje"] not in ("", GENERICO)
    if campo in ENTRE_CAMPOS:
        assert errores[campo]["req"] == "REQ-14"
    assert cliente.get("/api/parcelas").json() == []


@pytest.mark.parametrize(("cambios", "campo"), RECHAZOS[:4])
def test_req14_put_con_datos_no_validos_responde_422(
    cliente: TestClient, cambios: dict[str, Any], campo: str
) -> None:
    entrar(cliente)
    id_ = alta_parcela(cliente).json()["id"]
    respuesta = cliente.put(f"/api/parcelas/{id_}", json=parcela_valida(**cambios))
    assert campo in errores_de(respuesta)


# --- Referencia SIGPAC única entre las parcelas activas ---


def test_req14_referencia_sigpac_repetida_en_una_parcela_activa_responde_409(
    cliente: TestClient,
) -> None:
    entrar(cliente)
    assert alta_parcela(cliente).status_code == 201
    repetida = alta_parcela(cliente, nombre="Otra")
    assert repetida.status_code == 409
    assert repetida.json()["mensaje"]
    # Otro recinto de la misma parcela SIGPAC sí se admite.
    assert alta_parcela(cliente, sigpac=sigpac(recinto=2)).status_code == 201


def test_req14_la_misma_referencia_sigpac_se_admite_en_otra_explotacion(
    cliente: TestClient,
) -> None:
    entrar(cliente, "ana@example.com")
    assert alta_parcela(cliente).status_code == 201
    entrar(cliente, "luis@example.com")
    assert alta_parcela(cliente).status_code == 201


def test_req14_put_con_la_referencia_de_otra_parcela_activa_responde_409(
    cliente: TestClient,
) -> None:
    entrar(cliente)
    assert alta_parcela(cliente).status_code == 201
    otra = alta_parcela(cliente, sigpac=sigpac(recinto=2)).json()["id"]
    assert cliente.put(f"/api/parcelas/{otra}", json=parcela_valida()).status_code == 409


def test_req14_la_referencia_de_una_parcela_dada_de_baja_se_puede_volver_a_dar_de_alta(
    cliente: TestClient, bd: Engine
) -> None:
    entrar(cliente)
    id_ = alta_parcela(cliente).json()["id"]
    with bd.begin() as conexion:
        conexion.execute(
            text("UPDATE parcela SET estado = 'baja', fecha_baja = current_date WHERE id = :id"),
            {"id": id_},
        )
    respuesta = alta_parcela(cliente)
    assert respuesta.status_code == 201, respuesta.text
    assert respuesta.json()["numeroOrden"] == 2


# --- Restricciones de la base (data-model) ---


def _insertar(bd: Engine, explotacion_id: Any, numero: int, **cambios: Any) -> None:
    fila: dict[str, Any] = {
        "id": uuid.uuid4(),
        "explotacion_id": explotacion_id,
        "numero_orden": numero,
        "nombre": None,
        "sigpac_provincia": 13,
        "sigpac_municipio": 53,
        "sigpac_agregado": 0,
        "sigpac_zona": 0,
        "sigpac_poligono": 12,
        "sigpac_parcela": 345,
        "sigpac_recinto": numero,
        "superficie": 1,
        "uso_sigpac": "TA",
        "aprovechamiento": "cultivo",
        "cultivo_lenoso": False,
        "cultivo_especie": None,
        "cultivo_variedad": None,
        "sistema_explotacion": "secano",
        "sistema_riego": None,
        "protegido": False,
        "tipo_proteccion": None,
        "sistema_certificacion": None,
        "marco_control_plagas": None,
        "estado": "activa",
        "fecha_baja": None,
    } | cambios
    columnas = ", ".join(fila)
    valores = ", ".join(f":{c}" for c in fila)
    with bd.begin() as conexion:
        # Las columnas son las de esta prueba, no datos externos.
        conexion.execute(text(f"INSERT INTO parcela ({columnas}) VALUES ({valores})"), fila)  # noqa: S608


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"numero_orden": 0}, id="numero-orden-0"),
        pytest.param({"superficie": 0}, id="superficie-0"),
        pytest.param({"aprovechamiento": "huerta"}, id="aprovechamiento"),
        pytest.param({"cultivo_lenoso": True, "aprovechamiento": "pastos"}, id="lenoso-no-cultivo"),
        pytest.param({"cultivo_lenoso": True, "cultivo_variedad": "Airén"}, id="sin-especie"),
        pytest.param({"cultivo_lenoso": True, "cultivo_especie": "Vitis"}, id="sin-variedad"),
        pytest.param({"sistema_explotacion": "regadio"}, id="regadio-sin-riego"),
        pytest.param({"sistema_riego": "Goteo"}, id="secano-con-riego"),
        pytest.param({"protegido": True}, id="protegido-sin-tipo"),
        pytest.param({"estado": "baja"}, id="baja-sin-fecha"),
        pytest.param({"sigpac_provincia": 100}, id="provincia-100"),
        pytest.param({"sigpac_zona": -1}, id="zona-negativa"),
        pytest.param({"nombre": ""}, id="nombre-vacio"),
    ],
)
def test_req14_la_base_rechaza_parcelas_no_validas(
    cliente: TestClient, bd: Engine, cambios: dict[str, Any]
) -> None:
    entrar(cliente)
    explotacion_id = consultar(bd, "SELECT id FROM explotacion")[0].id
    with pytest.raises(IntegrityError):
        _insertar(bd, explotacion_id, 1, **cambios)


def test_req14_la_base_no_admite_dos_parcelas_con_el_mismo_numero_de_orden(
    cliente: TestClient, bd: Engine
) -> None:
    """El número es único en la explotación también entre las parcelas de baja."""
    entrar(cliente)
    explotacion_id = consultar(bd, "SELECT id FROM explotacion")[0].id
    _insertar(bd, explotacion_id, 1, estado="baja", fecha_baja="2026-01-01")
    with pytest.raises(IntegrityError):
        _insertar(bd, explotacion_id, 1, sigpac_recinto=9)


def test_req14_la_explotacion_empieza_con_el_contador_de_parcelas_a_cero(
    cliente: TestClient, bd: Engine
) -> None:
    entrar(cliente)
    assert consultar(bd, "SELECT ultimo_numero_parcela FROM explotacion")[0][0] == 0
    alta_parcela(cliente)
    assert consultar(bd, "SELECT ultimo_numero_parcela FROM explotacion")[0][0] == 1
