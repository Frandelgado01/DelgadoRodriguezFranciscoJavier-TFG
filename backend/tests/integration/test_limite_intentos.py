"""Pruebas de REQ-22: límite de intentos de inicio de sesión (T-13; research R9).

5 fallos consecutivos con un mismo correo en 15 minutos → espera de 15 minutos con 429, aunque
la contraseña sea correcta; misma respuesta exista o no la cuenta; la recuperación sigue disponible
y un restablecimiento o un acceso correcto ponen el contador a cero. Incluye la comprobación de T-11
de que el restablecimiento borra la fila de `intento_acceso`.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from cuaderno.main import app
from cuaderno.servicios import cuentas
from tests.conftest import ClienteMailpit, RelojFijo
from tests.integration.test_cuenta_sesion import CONTRASENA, CORREO, crear_cuenta, iniciar_sesion
from tests.integration.test_recuperacion import NUEVA, confirmar, enlaces, solicitar, token_de

ERRONEA = "otra frase que no es la buena"
SIN_CUENTA = "nadie@example.com"


def mensaje_espera(minutos: int) -> str:
    unidad = "minuto" if minutos == 1 else "minutos"
    return f"Has fallado la contraseña 5 veces. Espera {minutos} {unidad} o recupera tu contraseña."


def fallar(cliente: TestClient, veces: int, correo: str = CORREO) -> list[int]:
    return [
        iniciar_sesion(cliente, correo=correo, contrasena=ERRONEA).status_code for _ in range(veces)
    ]


def filas_intento(bd: Engine) -> list[Any]:
    with bd.connect() as conexion:
        return list(conexion.execute(text("SELECT * FROM intento_acceso")).all())


@pytest.fixture
def cuenta(cliente: TestClient) -> None:
    crear_cuenta(cliente)
    cliente.cookies.clear()


@pytest.mark.usefixtures("cuenta")
def test_req22_al_quinto_fallo_se_rechaza_aunque_la_contrasena_sea_correcta(
    cliente: TestClient,
) -> None:
    assert fallar(cliente, 5) == [401] * 5

    respuesta = iniciar_sesion(cliente)
    assert respuesta.status_code == 429
    assert respuesta.headers["Retry-After"] == str(15 * 60)
    assert respuesta.json() == {"mensaje": mensaje_espera(15), "segundosRestantes": 15 * 60}
    assert not respuesta.headers.get_list("set-cookie")


@pytest.mark.usefixtures("cuenta")
def test_req22_el_mensaje_dice_cuanto_falta(cliente: TestClient, reloj: RelojFijo) -> None:
    fallar(cliente, 5)
    reloj.fijar(reloj.ahora() + timedelta(minutes=14, seconds=30))
    respuesta = iniciar_sesion(cliente)
    assert respuesta.status_code == 429
    assert respuesta.headers["Retry-After"] == "30"
    assert respuesta.json() == {"mensaje": mensaje_espera(1), "segundosRestantes": 30}


@pytest.mark.usefixtures("cuenta")
def test_req22_pasados_15_minutos_se_entra_y_el_contador_vuelve_a_cero(
    cliente: TestClient, reloj: RelojFijo, bd: Engine
) -> None:
    fallar(cliente, 5)
    reloj.fijar(reloj.ahora() + timedelta(minutes=15))
    assert iniciar_sesion(cliente).status_code == 204
    assert filas_intento(bd) == []
    # Con el contador a cero hacen falta otros 5 fallos para esperar.
    assert fallar(cliente, 4) == [401] * 4
    assert iniciar_sesion(cliente).status_code == 204


@pytest.mark.usefixtures("cuenta")
def test_req22_un_acceso_correcto_pone_el_contador_a_cero(cliente: TestClient) -> None:
    fallar(cliente, 4)
    assert iniciar_sesion(cliente).status_code == 204
    assert fallar(cliente, 4) == [401] * 4
    assert iniciar_sesion(cliente).status_code == 204


@pytest.mark.usefixtures("cuenta")
def test_req22_los_fallos_de_hace_mas_de_15_minutos_dejan_de_contar(
    cliente: TestClient, reloj: RelojFijo
) -> None:
    fallar(cliente, 4)
    reloj.fijar(reloj.ahora() + timedelta(minutes=16))
    # Este fallo abre una ventana nueva: cuenta como el primero.
    assert fallar(cliente, 4) == [401] * 4
    assert iniciar_sesion(cliente).status_code == 204


@pytest.mark.usefixtures("cuenta")
def test_req22_el_contador_es_por_correo_normalizado(cliente: TestClient) -> None:
    fallar(cliente, 3)
    fallar(cliente, 2, correo="  ANA@Example.com ")
    assert iniciar_sesion(cliente).status_code == 429


@pytest.mark.usefixtures("cuenta")
def test_req22_la_recuperacion_sigue_disponible_y_permite_entrar_enseguida(
    cliente: TestClient, mailpit: ClienteMailpit, bd: Engine
) -> None:
    fallar(cliente, 5)
    assert iniciar_sesion(cliente).status_code == 429

    assert solicitar(cliente).status_code == 202
    assert confirmar(cliente, token_de(enlaces(mailpit)[0])).status_code == 204
    # El restablecimiento borra la fila de intento_acceso (REQ-21, REQ-22).
    assert filas_intento(bd) == []
    assert iniciar_sesion(cliente, contrasena=NUEVA).status_code == 204


@pytest.mark.usefixtures("cuenta")
def test_req22_un_correo_sin_cuenta_recibe_exactamente_la_misma_respuesta(
    cliente: TestClient,
) -> None:
    assert fallar(cliente, 5, correo=SIN_CUENTA) == fallar(cliente, 5) == [401] * 5
    sin_cuenta = iniciar_sesion(cliente, correo=SIN_CUENTA, contrasena=ERRONEA)
    con_cuenta = iniciar_sesion(cliente, contrasena=CONTRASENA)
    assert sin_cuenta.status_code == con_cuenta.status_code == 429
    assert sin_cuenta.json() == con_cuenta.json()
    assert sin_cuenta.headers["Retry-After"] == con_cuenta.headers["Retry-After"]


@pytest.mark.usefixtures("cuenta")
def test_req22_durante_la_espera_no_se_verifica_la_contrasena(
    cliente: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fallar(cliente, 5)
    llamadas: list[str] = []
    original = cuentas._hasher.verify

    def verificar_contando(contrasena: str, hash_: str) -> bool:
        llamadas.append(contrasena)
        return original(contrasena, hash_)

    monkeypatch.setattr(cuentas._hasher, "verify", verificar_contando)
    assert iniciar_sesion(cliente).status_code == 429
    assert iniciar_sesion(cliente, correo=SIN_CUENTA, contrasena=ERRONEA).status_code == 401
    # Solo se verificó el intento del correo sin espera (con el hash ficticio).
    assert llamadas == [ERRONEA]


@pytest.mark.usefixtures("cuenta")
def test_req22_dos_peticiones_simultaneas_no_se_saltan_el_limite(cliente: TestClient) -> None:
    fallar(cliente, 4)

    def intentar(_: int) -> int:
        # Un cliente por hilo; comparten las dependencias sustituidas de la API.
        otro = TestClient(app, base_url="https://testserver")
        codigo: int = iniciar_sesion(otro, contrasena=ERRONEA).status_code
        return codigo

    with ThreadPoolExecutor(max_workers=4) as hilos:
        codigos = sorted(hilos.map(intentar, range(4)))
    # Solo una petición llega a verificar (el 5.º fallo); las demás encuentran la espera.
    assert codigos == [401, 429, 429, 429]


def test_req22_intento_acceso_no_guarda_contrasenas_ni_ip(bd: Engine) -> None:
    with bd.connect() as conexion:
        columnas = set(
            conexion.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'intento_acceso'"
                )
            ).scalars()
        )
    assert columnas == {
        "correo_normalizado",
        "fallos_consecutivos",
        "primer_fallo_en",
        "bloqueado_hasta",
    }
