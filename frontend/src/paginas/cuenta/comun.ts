// Piezas comunes de las páginas de cuenta.
import type { Resultado } from "../../api/cliente";

export const AYUDA_CONTRASENA =
  "Usa una frase que recuerdes bien, de 15 caracteres o más: por ejemplo, cuatro palabras con espacios.";

export type Errores = Record<string, string>;

/** Errores por campo de una respuesta 422 de la API. */
export function erroresDeCampo(resultado: Resultado<unknown>): Errores {
  if (resultado.ok) return {};
  return Object.fromEntries((resultado.error.errores ?? []).map((error) => [error.campo, error.mensaje]));
}

/** Mensaje general de un error de la API, en lenguaje llano. */
export function mensajeGeneral(resultado: Resultado<unknown>): string {
  if (resultado.ok) return "";
  return resultado.error.mensaje ?? "No se ha podido completar. Inténtalo de nuevo.";
}
