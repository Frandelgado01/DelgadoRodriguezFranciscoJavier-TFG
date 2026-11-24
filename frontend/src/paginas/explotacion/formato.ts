// Conversión entre los valores de los formularios (texto) y los datos de la API (T-29).

/** Texto opcional: vacío o solo espacios → null. */
export function textoOpcional(valor: string | boolean | undefined): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

export function texto(valor: string | boolean | undefined): string {
  return String(valor ?? "").trim();
}

/**
 * Número escrito por el agricultor, con coma o punto decimal. Si no es un número se envía tal cual, para que
 * la API responda con su mensaje junto al campo; vacío → null ("Falta este dato").
 */
export function numero(valor: string | boolean | undefined): number | string | null {
  const escrito = texto(valor);
  if (escrito === "") return null;
  const convertido = Number(escrito.replace(",", "."));
  return Number.isFinite(convertido) ? convertido : escrito;
}

/** Número con coma decimal, como se escribe en español. */
export function conComa(valor: number): string {
  return String(valor).replace(".", ",");
}

/** "2025-05-20" → "20/05/2025". */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
