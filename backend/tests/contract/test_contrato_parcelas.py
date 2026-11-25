"""Prueba de contrato de parcelas (T-20; REQ-14, research R7)."""

from tests.contract.contrato import comprobar_operaciones, openapi_generado


def test_req14_operaciones_de_parcelas_cumplen_el_contrato() -> None:
    operaciones = [
        ("GET", "/parcelas"),
        ("POST", "/parcelas"),
        ("PUT", "/parcelas/{id}"),
    ]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []


def test_req17_baja_de_parcelas_cumple_el_contrato() -> None:
    operaciones = [("POST", "/parcelas/{id}/baja")]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []
