"""Prueba de contrato de tratamientos (T-35; REQ-01, REQ-06, research R7)."""

from tests.contract.contrato import comprobar_operaciones, openapi_generado


def test_req01_operaciones_de_registro_cumplen_el_contrato() -> None:
    operaciones = [("POST", "/tratamientos"), ("GET", "/tratamientos/{id}")]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []
