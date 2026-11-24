"""Prueba de contrato de personas y equipos (T-22; REQ-15, research R7)."""

from tests.contract.contrato import comprobar_operaciones, openapi_generado


def test_req15_operaciones_de_personas_y_equipos_cumplen_el_contrato() -> None:
    operaciones = [
        ("GET", "/personas"),
        ("POST", "/personas"),
        ("PUT", "/personas/{id}"),
        ("GET", "/equipos"),
        ("POST", "/equipos"),
        ("PUT", "/equipos/{id}"),
    ]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []


def test_req17_baja_de_personas_y_equipos_cumple_el_contrato() -> None:
    operaciones = [("POST", "/personas/{id}/baja"), ("POST", "/equipos/{id}/baja")]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []
