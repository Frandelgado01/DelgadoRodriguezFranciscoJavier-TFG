"""Prueba de contrato de productos (T-24; REQ-16, REQ-06, research R7)."""

from tests.contract.contrato import comprobar_operaciones, openapi_generado


def test_req16_operaciones_de_productos_cumplen_el_contrato() -> None:
    operaciones = [("GET", "/productos"), ("POST", "/productos")]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []


def test_req17_baja_de_productos_cumple_el_contrato() -> None:
    operaciones = [("POST", "/productos/{id}/baja")]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []
