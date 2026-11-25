// Dosis por hectárea de los productos de un tratamiento (REQ-23; research R15).
//
// El mismo cálculo está en backend/src/cuaderno/dominio/dosis.py; los dos pasan los casos de
// compartido/casos-validacion.json. No se guarda: se calcula con la cantidad de cada producto y la suma de las
// superficies tratadas, también sin conexión. Aritmética entera con BigInt (milésimas de kg o L y centésimas de
// ha): sin number en la división ni en el redondeo.
import { escribirDecimal } from "./validacion";

export interface EntradaDosis {
  productos: { cantidad: number; unidadMedida: string }[];
  superficiesTratadas: number[];
}

export interface Dosis {
  /** Con coma decimal y sus decimales, como se muestra: "0,57". */
  dosisPorHectarea: string;
  /** "kg/ha" o "L/ha". */
  unidadDosis: string;
}

const DECIMALES_MINIMOS = 2;

/** Número como entero de 10^-decimales: 3,5 con 2 decimales → 350n. */
function aEntero(numero: number, decimales: number): bigint {
  const [entera = "0", fraccion = ""] = escribirDecimal(numero).split(".");
  return BigInt(entera + fraccion.slice(0, decimales).padEnd(decimales, "0"));
}

/** Entero de 10^-decimales con coma: 57n con 2 decimales → "0,57". */
function conComa(entero: bigint, decimales: number): string {
  const cifras = entero.toString().padStart(decimales + 1, "0");
  return `${cifras.slice(0, -decimales)},${cifras.slice(-decimales)}`;
}

/**
 * Cociente al más próximo, con los empates hacia arriba y dos decimales. Si un resultado positivo quedara en
 * 0,00, se aumentan los decimales hasta la primera cifra distinta de cero.
 */
function dividir(milesimas: bigint, centesimas: bigint): string {
  for (let decimales = DECIMALES_MINIMOS; ; decimales += 1) {
    const dividendo = milesimas * 10n ** BigInt(decimales);
    const divisor = centesimas * 10n;
    const redondeado = (2n * dividendo + divisor) / (2n * divisor);
    if (redondeado > 0n || milesimas <= 0n) return conComa(redondeado, decimales);
  }
}

/** Dosis de cada producto: su cantidad entre la superficie tratada total del tratamiento. */
export function calcularDosis({ productos, superficiesTratadas }: EntradaDosis): Dosis[] {
  const total = superficiesTratadas.reduce((suma, superficie) => suma + aEntero(superficie, 2), 0n);
  return productos.map(({ cantidad, unidadMedida }) => ({
    dosisPorHectarea: dividir(aEntero(cantidad, 3), total),
    unidadDosis: `${unidadMedida}/ha`,
  }));
}
