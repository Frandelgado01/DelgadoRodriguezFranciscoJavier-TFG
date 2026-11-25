"""Pruebas del esquema de tratamientos en PostgreSQL (T-33; REQ-01, REQ-03 y REQ-04).

Restricciones de data-model ("tratamiento", "tratamiento_parcela", "tratamiento_producto" y
"cambio"), comprobadas con SQL directo: son la última barrera aunque falle la validación de la API.
"""

import json
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text
from sqlalchemy.exc import DBAPIError, IntegrityError

from tests.integration.test_cuenta_sesion import consultar
from tests.integration.test_parcelas import alta_parcela, entrar
from tests.integration.test_personas_equipos import alta_equipo, alta_persona
from tests.integration.test_productos import alta_producto, producto_valido

AHORA = datetime(2026, 3, 15, 11, 0, tzinfo=UTC)


class Filas:
    """Explotación con sus datos maestros y filas válidas de cada tabla del tratamiento."""

    def __init__(self, cliente: TestClient, bd: Engine) -> None:
        self.bd = bd
        entrar(cliente)
        self.parcela_id = alta_parcela(cliente).json()["id"]
        self.aplicador_id = alta_persona(cliente).json()["id"]
        self.equipo_id = alta_equipo(cliente).json()["id"]
        self.producto_id = alta_producto(cliente, producto_valido()).json()["id"]
        self.tratamiento_id = uuid.uuid4()
        self.tratamiento: dict[str, Any] = {
            "id": self.tratamiento_id,
            "explotacion_id": consultar(bd, "SELECT id FROM explotacion")[0].id,
            "fecha": date(2026, 3, 15),
            "problema": "Mildiu",
            "aplicador_id": self.aplicador_id,
            "asesor_id": None,
            "equipo_id": self.equipo_id,
            "eficacia": None,
            "observaciones": None,
            "registrado_en": AHORA,
            "fecha_registro": date(2026, 3, 15),
            "version": 1,
            "recibido_en": AHORA,
        }
        self.parcela: dict[str, Any] = {
            "tratamiento_id": self.tratamiento_id,
            "parcela_id": self.parcela_id,
            "superficie_tratada": Decimal("3.5"),
            "cultivo_especie": "Vitis vinifera",
            "cultivo_variedad": "Airén",
            "producto_semilla": None,
        }
        self.producto: dict[str, Any] = {
            "tratamiento_id": self.tratamiento_id,
            "producto_id": self.producto_id,
            "cantidad": Decimal("2"),
            "unidad_medida": "kg",
        }
        self.cambio: dict[str, Any] = {
            "id": uuid.uuid4(),
            "tratamiento_id": self.tratamiento_id,
            "tipo": "creacion",
            "version_base": 0,
            "version_resultante": 1,
            "datos_anteriores": None,
            "datos_nuevos": json.dumps({"problema": "Mildiu"}),
            "motivo": None,
            "realizado_en": AHORA,
            "recibido_en": AHORA,
        }

    def insertar(self, tabla: str, fila: dict[str, Any]) -> None:
        columnas = ", ".join(fila)
        valores = ", ".join(f":{c}" for c in fila)
        # La tabla y las columnas salen de esta prueba, no de datos externos.
        sentencia = f"INSERT INTO {tabla} ({columnas}) VALUES ({valores})"  # noqa: S608
        with self.bd.begin() as conexion:
            conexion.execute(text(sentencia), fila)

    def todo(self) -> None:
        self.insertar("tratamiento", self.tratamiento)
        self.insertar("tratamiento_parcela", self.parcela)
        self.insertar("tratamiento_producto", self.producto)
        self.insertar("cambio", self.cambio)


@pytest.fixture
def filas(cliente: TestClient, bd: Engine) -> Filas:
    return Filas(cliente, bd)


def test_req01_guarda_un_tratamiento_con_sus_parcelas_productos_e_historial(
    filas: Filas, bd: Engine
) -> None:
    filas.todo()
    (t,) = consultar(bd, "SELECT * FROM tratamiento")
    assert (t.anulado, t.en_conflicto, t.version) == (False, False, 1)
    (p,) = consultar(bd, "SELECT * FROM tratamiento_parcela")
    assert p.superficie_tratada == Decimal("3.50")
    (q,) = consultar(bd, "SELECT * FROM tratamiento_producto")
    assert q.cantidad == Decimal("2.000")
    (c,) = consultar(bd, "SELECT * FROM cambio")
    assert c.datos_nuevos == {"problema": "Mildiu"}


def test_req04_la_superficie_tratada_se_guarda_con_dos_decimales(filas: Filas, bd: Engine) -> None:
    (columna,) = consultar(
        bd,
        "SELECT numeric_precision p, numeric_scale s FROM information_schema.columns "
        "WHERE table_name = 'tratamiento_parcela' AND column_name = 'superficie_tratada'",
    )
    assert (columna.p, columna.s) == (10, 2)
    (columna,) = consultar(
        bd,
        "SELECT numeric_precision p, numeric_scale s FROM information_schema.columns "
        "WHERE table_name = 'tratamiento_producto' AND column_name = 'cantidad'",
    )
    assert (columna.p, columna.s) == (12, 3)


@pytest.mark.parametrize("eficacia", [None, "buena", "regular", "mala"])
def test_req01_eficacia_vacia_o_de_la_escala(filas: Filas, eficacia: str | None) -> None:
    filas.insertar("tratamiento", filas.tratamiento | {"eficacia": eficacia})


@pytest.mark.parametrize("unidad", ["kg", "L"])
def test_req04_unidad_kg_o_l(filas: Filas, unidad: str) -> None:
    filas.insertar("tratamiento", filas.tratamiento)
    filas.insertar("tratamiento_producto", filas.producto | {"unidad_medida": unidad})


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"eficacia": "excelente"}, id="eficacia"),
        pytest.param({"problema": ""}, id="problema-vacio"),
        pytest.param({"problema": "x" * 201}, id="problema-largo"),
        pytest.param({"problema": None}, id="sin-problema"),
        pytest.param({"fecha": None}, id="sin-fecha"),
        pytest.param({"aplicador_id": None}, id="sin-aplicador"),
        pytest.param({"equipo_id": None}, id="sin-equipo"),
        pytest.param({"observaciones": "x" * 2001}, id="observaciones-largas"),
        pytest.param({"fecha_registro": date(2026, 3, 14)}, id="registro-anterior-a-la-fecha"),
        pytest.param({"version": 0}, id="version-cero"),
        pytest.param({"aplicador_id": str(uuid.uuid4())}, id="aplicador-inexistente"),
        pytest.param({"asesor_id": str(uuid.uuid4())}, id="asesor-inexistente"),
        pytest.param({"equipo_id": str(uuid.uuid4())}, id="equipo-inexistente"),
        pytest.param({"explotacion_id": str(uuid.uuid4())}, id="explotacion-inexistente"),
    ],
)
def test_req01_la_base_rechaza_tratamientos_no_validos(
    filas: Filas, cambios: dict[str, Any]
) -> None:
    with pytest.raises(IntegrityError):
        filas.insertar("tratamiento", filas.tratamiento | cambios)


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"superficie_tratada": 0}, id="superficie-cero"),
        pytest.param({"superficie_tratada": Decimal("0.004")}, id="superficie-que-se-redondea-a-0"),
        pytest.param({"superficie_tratada": -1}, id="superficie-negativa"),
        pytest.param({"cultivo_especie": None}, id="sin-especie"),
        pytest.param({"cultivo_variedad": None}, id="sin-variedad"),
        pytest.param({"parcela_id": str(uuid.uuid4())}, id="parcela-inexistente"),
        pytest.param({"tratamiento_id": str(uuid.uuid4())}, id="tratamiento-inexistente"),
    ],
)
def test_req04_la_base_rechaza_parcelas_tratadas_no_validas(
    filas: Filas, cambios: dict[str, Any]
) -> None:
    filas.insertar("tratamiento", filas.tratamiento)
    with pytest.raises(IntegrityError):
        filas.insertar("tratamiento_parcela", filas.parcela | cambios)


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"cantidad": 0}, id="cantidad-cero"),
        pytest.param({"cantidad": -2}, id="cantidad-negativa"),
        pytest.param({"unidad_medida": "l"}, id="unidad-l-minuscula"),
        pytest.param({"unidad_medida": "g"}, id="unidad-g"),
        pytest.param({"unidad_medida": None}, id="sin-unidad"),
        pytest.param({"producto_id": str(uuid.uuid4())}, id="producto-inexistente"),
    ],
)
def test_req04_la_base_rechaza_productos_aplicados_no_validos(
    filas: Filas, cambios: dict[str, Any]
) -> None:
    filas.insertar("tratamiento", filas.tratamiento)
    with pytest.raises(IntegrityError):
        filas.insertar("tratamiento_producto", filas.producto | cambios)


def test_req03_cada_parcela_y_cada_producto_una_sola_vez_por_tratamiento(filas: Filas) -> None:
    filas.todo()
    with pytest.raises(IntegrityError):
        filas.insertar("tratamiento_parcela", filas.parcela)
    with pytest.raises(IntegrityError):
        filas.insertar("tratamiento_producto", filas.producto)


@pytest.mark.parametrize(
    "cambios",
    [
        pytest.param({"tipo": "borrado"}, id="tipo"),
        pytest.param({"version_base": None}, id="sin-version-base"),
        pytest.param({"datos_nuevos": None}, id="sin-datos-nuevos"),
        pytest.param({"realizado_en": None}, id="sin-realizado-en"),
        pytest.param({"recibido_en": None}, id="sin-recibido-en"),
        pytest.param({"tratamiento_id": str(uuid.uuid4())}, id="tratamiento-inexistente"),
    ],
)
def test_req01_la_base_rechaza_cambios_no_validos(filas: Filas, cambios: dict[str, Any]) -> None:
    filas.insertar("tratamiento", filas.tratamiento)
    with pytest.raises(IntegrityError):
        filas.insertar("cambio", filas.cambio | cambios)


@pytest.mark.parametrize(
    "tabla", ["tratamiento", "parcela", "persona", "equipo", "producto", "explotacion"]
)
def test_req01_las_claves_foraneas_no_dejan_borrar_en_cascada(filas: Filas, tabla: str) -> None:
    filas.todo()
    # La tabla sale de los parámetros de esta prueba, no de datos externos.
    with pytest.raises(DBAPIError), filas.bd.begin() as conexion:
        conexion.execute(text(f"DELETE FROM {tabla}"))  # noqa: S608


def test_req01_todas_las_claves_foraneas_son_restrict(filas: Filas, bd: Engine) -> None:
    reglas = consultar(
        bd,
        "SELECT conrelid::regclass::text tabla, conname, confdeltype FROM pg_constraint "
        "WHERE contype = 'f' AND conrelid::regclass::text IN "
        "('tratamiento', 'tratamiento_parcela', 'tratamiento_producto', 'cambio')",
    )
    assert {r.tabla for r in reglas} == {
        "tratamiento",
        "tratamiento_parcela",
        "tratamiento_producto",
        "cambio",
    }
    assert {r.confdeltype for r in reglas} == {"r"}


def test_req01_la_fecha_de_registro_no_es_una_columna_generada(filas: Filas, bd: Engine) -> None:
    """data-model: convertir un TIMESTAMPTZ a fecha no es inmutable; la calcula la API."""
    (columna,) = consultar(
        bd,
        "SELECT is_generated FROM information_schema.columns "
        "WHERE table_name = 'tratamiento' AND column_name = 'fecha_registro'",
    )
    assert columna.is_generated == "NEVER"
