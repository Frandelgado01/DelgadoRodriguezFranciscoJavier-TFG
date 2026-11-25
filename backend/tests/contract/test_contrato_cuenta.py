"""Prueba de contrato de cuenta y sesión (T-09; REQ-20, research R7)."""

from tests.contract.contrato import comprobar_operaciones, openapi_generado


def test_req20_operaciones_de_cuenta_y_sesion_cumplen_el_contrato() -> None:
    operaciones = [
        ("POST", "/cuenta"),
        ("GET", "/cuenta/yo"),
        ("DELETE", "/sesion"),
    ]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []


def test_req20_req22_iniciar_sesion_cumple_el_contrato_con_el_429() -> None:
    assert comprobar_operaciones(openapi_generado(), [("POST", "/sesion")]) == []


def test_req22_el_429_de_iniciar_sesion_lleva_retry_after_y_espera_acceso() -> None:
    respuesta = openapi_generado()["paths"]["/sesion"]["post"]["responses"]["429"]
    assert "Retry-After" in respuesta["headers"]
    esquema = respuesta["content"]["application/json"]["schema"]
    assert esquema == {"$ref": "#/components/schemas/EsperaAcceso"}


def test_req21_operaciones_de_recuperacion_cumplen_el_contrato() -> None:
    operaciones = [
        ("POST", "/cuenta/recuperacion"),
        ("POST", "/cuenta/recuperacion/confirmar"),
    ]
    assert comprobar_operaciones(openapi_generado(), operaciones) == []
