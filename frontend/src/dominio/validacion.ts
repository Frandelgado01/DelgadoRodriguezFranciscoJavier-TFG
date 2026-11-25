// Reglas de validación compartidas con la API (research R8).
//
// La misma regla está en backend/src/cuaderno/dominio/validacion.py; las dos pasan los casos de
// compartido/casos-validacion.json. Cada regla devuelve null si el dato es válido o el error con el campo,
// un mensaje en lenguaje llano y el REQ-xx que la pide; la del tratamiento, la lista de sus errores.

export interface ErrorRegla {
  campo: string;
  mensaje: string;
  req: string;
}

export const CONTRASENA_MINIMA = 15;
export const CONTRASENA_MAXIMA = 128;
const CORREO_MAXIMO = 254;
const FORMATO_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;

/** Caracteres Unicode (puntos de código), como len() en Python; `length` cuenta unidades UTF-16. */
export function contarCaracteres(valor: string): number {
  return [...valor].length;
}

/** De 15 a 128 caracteres de cualquier tipo, sin reglas de composición (REQ-20; R9). */
export function validarContrasena(valor: string): ErrorRegla | null {
  const longitud = contarCaracteres(valor);
  if (longitud >= CONTRASENA_MINIMA && longitud <= CONTRASENA_MAXIMA) return null;
  return {
    campo: "contrasena",
    mensaje: "La contraseña debe tener entre 15 y 128 caracteres.",
    req: "REQ-20",
  };
}

/** Forma nombre@dominio.ext, sin espacios ni el carácter nulo y de 254 caracteres como mucho (REQ-20). */
export function validarCorreo(valor: string): ErrorRegla | null {
  const correo = valor.trim();
  const formato = FORMATO_CORREO.test(correo) && !correo.includes("\0");
  if (contarCaracteres(correo) <= CORREO_MAXIMO && formato) return null;
  return {
    campo: "correo",
    mensaje: "Escribe un correo electrónico válido, por ejemplo nombre@dominio.es.",
    req: "REQ-20",
  };
}

// --- Tratamiento (REQ-02 y REQ-04) ---

const PROBLEMA_MAXIMO = 200;
const CULTIVO_MAXIMO = 100;
const PRODUCTO_SEMILLA_MAXIMO = 150;
const OBSERVACIONES_MAXIMO = 2000;
const DECIMALES_SUPERFICIE = 2; // NUMERIC(10,2)
const DECIMALES_CANTIDAD = 3; // NUMERIC(12,3)
const CANTIDAD_TOPE = 1_000_000_000;
export const EFICACIAS = ["buena", "regular", "mala"] as const;
export const UNIDADES = ["kg", "L"] as const;
const FORMATO_FECHA = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export type Datos = Record<string, unknown>;

export interface EntradaTratamiento {
  /** Fecha de hoy en Europe/Madrid, "AAAA-MM-DD". */
  hoy: string;
  /** Superficie (ha) de cada parcela conocida, por su id. */
  superficies: Record<string, number>;
  /** Datos con los nombres del contrato (DatosTratamiento), quizá incompletos. */
  datos: Datos;
}

function error(campo: string, mensaje: string, req = "REQ-04"): ErrorRegla {
  return { campo, mensaje, req };
}

function falta(valor: unknown): boolean {
  return valor === null || valor === undefined || (typeof valor === "string" && valor.trim() === "");
}

/** Escritura decimal de un número, sin exponente (1e-7 → "0.0000001"). */
export function escribirDecimal(numero: number): string {
  const [mantisa = "", exponente] = String(numero).split("e");
  if (exponente === undefined) return mantisa;
  const [entera = "", fraccion = ""] = mantisa.replace("-", "").split(".");
  const punto = entera.length + Number(exponente);
  const cifras = entera + fraccion;
  let texto: string;
  if (punto <= 0) texto = `0.${"0".repeat(-punto)}${cifras}`;
  else if (punto >= cifras.length) texto = cifras.padEnd(punto, "0");
  else texto = `${cifras.slice(0, punto)}.${cifras.slice(punto)}`;
  return numero < 0 ? `-${texto}` : texto;
}

function contarDecimales(numero: number): number {
  return escribirDecimal(numero).split(".")[1]?.length ?? 0;
}

/** Número con coma decimal, como se escribe en español. */
export function enEspanol(numero: number): string {
  return escribirDecimal(numero).replace(".", ",");
}

function validarTexto(valor: unknown, campo: string, maximo: number, siFalta: string | null): ErrorRegla[] {
  if (falta(valor)) return siFalta === null ? [] : [error(campo, siFalta, "REQ-02")];
  if (contarCaracteres(String(valor).trim()) > maximo) {
    return [error(campo, `Puede tener como mucho ${maximo} caracteres.`)];
  }
  return [];
}

function existeFecha(texto: string): boolean {
  if (!FORMATO_FECHA.test(texto)) return false;
  const instante = new Date(`${texto}T00:00:00Z`);
  // "2026-02-30" se convierte en el 2 de marzo: no existe.
  return !Number.isNaN(instante.getTime()) && instante.toISOString().startsWith(texto);
}

function validarFecha(valor: unknown, hoy: string): ErrorRegla[] {
  if (falta(valor)) return [error("fecha", "Falta la fecha del tratamiento.", "REQ-02")];
  const texto = String(valor);
  if (!existeFecha(texto)) return [error("fecha", "La fecha no es válida.")];
  if (texto > hoy) return [error("fecha", "La fecha no puede ser posterior a hoy.")];
  return [];
}

function validarNumero(
  valor: unknown,
  campo: string,
  nombre: string,
  siFalta: string,
  decimales: number,
): ErrorRegla[] {
  if (falta(valor)) return [error(campo, siFalta, "REQ-02")];
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return [error(campo, `${nombre} tiene que ser un número.`)];
  }
  if (valor <= 0) return [error(campo, `${nombre} tiene que ser mayor que 0.`)];
  if (contarDecimales(valor) > decimales) {
    return [error(campo, `${nombre} puede tener como mucho ${decimales} decimales.`)];
  }
  return [];
}

function validarSuperficie(valor: unknown, campo: string, deLaParcela: number | undefined): ErrorRegla[] {
  const errores = validarNumero(
    valor,
    campo,
    "La superficie tratada",
    "Falta la superficie tratada.",
    DECIMALES_SUPERFICIE,
  );
  if (errores.length === 0 && deLaParcela !== undefined && (valor as number) > deLaParcela) {
    errores.push(
      error(
        campo,
        `La superficie tratada (${enEspanol(valor as number)} ha) es mayor que la de la parcela ` +
          `(${enEspanol(deLaParcela)} ha).`,
      ),
    );
  }
  return errores;
}

function validarCantidad(valor: unknown, campo: string): ErrorRegla[] {
  const errores = validarNumero(valor, campo, "La cantidad", "Falta la cantidad de producto.", DECIMALES_CANTIDAD);
  if (errores.length === 0 && (valor as number) >= CANTIDAD_TOPE) {
    errores.push(error(campo, `La cantidad tiene que ser menor que ${CANTIDAD_TOPE}.`));
  }
  return errores;
}

const TEXTOS_PARCELA: [campo: string, maximo: number, siFalta: string | null][] = [
  ["cultivoEspecie", CULTIVO_MAXIMO, "Falta la especie del cultivo."],
  ["cultivoVariedad", CULTIVO_MAXIMO, "Falta la variedad del cultivo."],
  ["productoSemilla", PRODUCTO_SEMILLA_MAXIMO, null],
];

function validarParcelas(lineas: Datos[], superficies: Record<string, number>): ErrorRegla[] {
  if (lineas.length === 0) return [error("parcelas", "Elige al menos una parcela tratada.", "REQ-02")];
  const vistas = new Set<unknown>();
  return lineas.flatMap((linea, i) => {
    const errores: ErrorRegla[] = [];
    const ruta = `parcelas.${i}`;
    const parcela = linea["parcelaId"];
    if (falta(parcela)) errores.push(error(`${ruta}.parcelaId`, "Elige la parcela.", "REQ-02"));
    else if (vistas.has(parcela)) errores.push(error(`${ruta}.parcelaId`, "Esta parcela está repetida."));
    vistas.add(parcela);
    errores.push(
      ...validarSuperficie(linea["superficieTratada"], `${ruta}.superficieTratada`, superficies[String(parcela)]),
    );
    for (const [campo, maximo, siFalta] of TEXTOS_PARCELA) {
      errores.push(...validarTexto(linea[campo], `${ruta}.${campo}`, maximo, siFalta));
    }
    return errores;
  });
}

function validarProductos(lineas: Datos[]): ErrorRegla[] {
  if (lineas.length === 0) return [error("productos", "Añade al menos un producto.", "REQ-02")];
  const vistos = new Set<unknown>();
  return lineas.flatMap((linea, i) => {
    const errores: ErrorRegla[] = [];
    const ruta = `productos.${i}`;
    const producto = linea["productoId"];
    if (falta(producto)) errores.push(error(`${ruta}.productoId`, "Elige el producto.", "REQ-02"));
    else if (vistos.has(producto)) {
      errores.push(
        error(`${ruta}.productoId`, "Este producto está repetido: suma las cantidades en una sola línea."),
      );
    }
    vistos.add(producto);
    errores.push(...validarCantidad(linea["cantidad"], `${ruta}.cantidad`));
    if (!(UNIDADES as readonly unknown[]).includes(linea["unidadMedida"])) {
      errores.push(error(`${ruta}.unidadMedida`, "La cantidad se anota en kg o en L."));
    }
    return errores;
  });
}

/** Datos obligatorios (REQ-02) y rechazos (REQ-04) de un tratamiento; lista vacía si es válido. */
export function validarTratamiento({ datos, hoy, superficies }: EntradaTratamiento): ErrorRegla[] {
  const errores = [
    ...validarFecha(datos["fecha"], hoy),
    ...validarParcelas((datos["parcelas"] as Datos[] | null | undefined) ?? [], superficies),
    ...validarTexto(
      datos["problema"],
      "problema",
      PROBLEMA_MAXIMO,
      "Falta la plaga o el problema que querías controlar.",
    ),
  ];
  if (falta(datos["aplicadorId"])) errores.push(error("aplicadorId", "Falta quién aplicó el producto.", "REQ-02"));
  errores.push(...validarProductos((datos["productos"] as Datos[] | null | undefined) ?? []));
  if (falta(datos["equipoId"])) errores.push(error("equipoId", "Falta el equipo de aplicación.", "REQ-02"));
  const eficacia = datos["eficacia"] ?? null;
  if (eficacia !== null && !(EFICACIAS as readonly unknown[]).includes(eficacia)) {
    errores.push(error("eficacia", "La eficacia tiene que ser buena, regular o mala."));
  }
  errores.push(...validarTexto(datos["observaciones"], "observaciones", OBSERVACIONES_MAXIMO, null));
  return errores;
}
