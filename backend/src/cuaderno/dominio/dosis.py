"""Dosis por hectárea de los productos de un tratamiento (REQ-23; research R15).

El mismo cálculo está en `frontend/src/dominio/dosis.ts`; los dos pasan los casos de
`compartido/casos-validacion.json`. No se guarda: se calcula con la cantidad de cada producto y la
suma de las superficies tratadas. Aritmética entera, sin `float`.
"""

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from decimal import Decimal

DECIMALES_MINIMOS = 2


@dataclass(frozen=True)
class Dosis:
    """Dosis con sus decimales ya redondeados y su unidad (`kg/ha` o `L/ha`)."""

    por_hectarea: Decimal
    unidad: str


def _dividir(cantidad: Decimal, superficie: Decimal) -> Decimal:
    """Cociente al más próximo, con los empates hacia arriba y dos decimales.

    Si un resultado positivo quedara en 0,00, se aumentan los decimales hasta la primera cifra
    distinta de cero.
    """
    milesimas = int(cantidad.scaleb(3))  # NUMERIC(12,3)
    centesimas = int(superficie.scaleb(2))  # NUMERIC(10,2)
    decimales = DECIMALES_MINIMOS
    while True:
        # milésimas/1000 entre centésimas/100, en unidades de 10^-decimales.
        dividendo, divisor = milesimas * 10**decimales, centesimas * 10
        redondeado = (2 * dividendo + divisor) // (2 * divisor)
        if redondeado > 0 or milesimas <= 0:
            return Decimal(redondeado).scaleb(-decimales)
        decimales += 1


def calcular_dosis(
    productos: Iterable[tuple[Decimal, str]], superficies_tratadas: Sequence[Decimal]
) -> list[Dosis]:
    """Dosis de cada producto: su cantidad entre la superficie tratada total del tratamiento."""
    total = sum(superficies_tratadas, Decimal(0))
    return [Dosis(_dividir(cantidad, total), f"{unidad}/ha") for cantidad, unidad in productos]
