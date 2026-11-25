"""Pruebas de la utilidad de prueba de contrato (T-08; research R7, principio I)."""

from typing import Any

from tests.contract.contrato import cargar_contrato, comprobar_operaciones


def _generado(rutas: dict[str, dict[str, list[str]]]) -> dict[str, Any]:
    """OpenAPI mínimo con la forma del que genera FastAPI."""
    return {
        "paths": {
            ruta: {
                metodo: {"responses": {codigo: {"description": ""} for codigo in codigos}}
                for metodo, codigos in metodos.items()
            }
            for ruta, metodos in rutas.items()
        }
    }


def test_carga_el_contrato_de_la_funcionalidad_001() -> None:
    contrato = cargar_contrato()
    assert contrato["servers"] == [{"url": "/api"}]
    assert set(contrato["paths"]["/cuenta"]["post"]["responses"]) == {"201", "409", "422"}


def test_sin_diferencias_si_la_api_tiene_la_ruta_el_metodo_y_los_codigos() -> None:
    generado = _generado({"/cuenta": {"post": ["201", "409", "422"]}})
    assert comprobar_operaciones(generado, [("POST", "/cuenta")]) == []


def test_admite_codigos_de_mas_en_la_api() -> None:
    generado = _generado({"/sesion": {"delete": ["204", "401"]}})
    assert comprobar_operaciones(generado, [("DELETE", "/sesion")]) == []


def test_detecta_una_ruta_que_falta() -> None:
    diferencias = comprobar_operaciones(_generado({}), [("POST", "/cuenta")])
    assert diferencias == ["POST /cuenta: la API no tiene esta operación"]


def test_detecta_un_metodo_que_falta() -> None:
    generado = _generado({"/sesion": {"post": ["204", "401", "429"]}})
    diferencias = comprobar_operaciones(generado, [("DELETE", "/sesion")])
    assert diferencias == ["DELETE /sesion: la API no tiene esta operación"]


def test_detecta_codigos_de_estado_que_faltan() -> None:
    generado = _generado({"/cuenta": {"post": ["201", "422"]}})
    diferencias = comprobar_operaciones(generado, [("POST", "/cuenta")])
    assert diferencias == ["POST /cuenta: faltan los códigos 409"]


def test_avisa_si_la_operacion_pedida_no_esta_en_el_contrato() -> None:
    generado = _generado({"/inventada": {"get": ["200"]}})
    diferencias = comprobar_operaciones(generado, [("GET", "/inventada")])
    assert diferencias == ["GET /inventada: la operación no está en contracts/openapi.yaml"]
