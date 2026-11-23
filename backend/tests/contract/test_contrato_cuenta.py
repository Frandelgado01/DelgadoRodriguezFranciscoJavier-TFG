"""Prueba de contrato de cuenta y sesión (T-09; REQ-20, research R7)."""

from tests.contract.contrato import comprobar_operaciones, openapi_generado


def test_req20_operaciones_de_cuenta_y_sesion_cumplen_el_contrato() -> None:
    operaciones = [
        ("POST", "/cuenta"),
        ("GET", "/cuenta/yo"),
        ("DELETE", "/sesion"),
    ]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []


def test_req20_iniciar_sesion_cumple_el_contrato_salvo_el_limite_de_intentos() -> None:
    # El 429 es de REQ-22 y llega con T-13 y T-14, que amplían esta prueba.
    diferencias = comprobar_operaciones(openapi_generado(), [("POST", "/sesion")])
    assert diferencias == ["POST /sesion: faltan los códigos 429"]


def test_req21_operaciones_de_recuperacion_cumplen_el_contrato() -> None:
    operaciones = [
        ("POST", "/cuenta/recuperacion"),
        ("POST", "/cuenta/recuperacion/confirmar"),
    ]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []
