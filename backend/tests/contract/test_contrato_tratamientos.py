"""Prueba de contrato de tratamientos (T-35; REQ-01, REQ-06, research R7)."""

from typing import Any

from tests.contract.contrato import comprobar_operaciones, openapi_generado


def test_req01_operaciones_de_registro_cumplen_el_contrato() -> None:
    operaciones = [("POST", "/tratamientos"), ("GET", "/tratamientos/{id}")]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []


def test_req23_la_dosis_es_un_campo_de_solo_lectura_de_la_respuesta() -> None:
    """La dosis está en la respuesta, marcada como de solo lectura, y no en la entrada."""
    generado = openapi_generado()
    esquemas = generado["components"]["schemas"]

    def producto(operacion: dict[str, Any]) -> dict[str, Any]:
        """Esquema de los productos del cuerpo o de la respuesta de una operación."""
        nombre = operacion["content"]["application/json"]["schema"]["$ref"].rsplit("/", 1)[1]
        lista = esquemas[nombre]["properties"]["productos"]["items"]["$ref"]
        propiedades: dict[str, Any] = esquemas[lista.rsplit("/", 1)[1]]["properties"]
        return propiedades

    registrar = generado["paths"]["/tratamientos"]["post"]
    ver = generado["paths"]["/tratamientos/{id}"]["get"]
    for respuesta in (registrar["responses"]["201"], ver["responses"]["200"]):
        propiedades = producto(respuesta)
        assert propiedades["dosisPorHectarea"]["type"] == "number"
        assert propiedades["dosisPorHectarea"]["readOnly"] is True
        assert propiedades["unidadDosis"]["enum"] == ["kg/ha", "L/ha"]
        assert propiedades["unidadDosis"]["readOnly"] is True
    assert "dosisPorHectarea" not in producto(registrar["requestBody"])
