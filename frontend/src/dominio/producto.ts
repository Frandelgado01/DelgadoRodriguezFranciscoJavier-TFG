// Datos de un producto que se da de alta sin conexión (REQ-16): los dos obligatorios y con la longitud que admite la
// API, para que no lo rechace al enviarlo.
import { contarCaracteres } from "./validacion";

export interface DatosProducto {
  nombreComercial: string;
  numeroRegistro: string;
}

const LIMITES = {
  nombreComercial: { maximo: 150, siFalta: "Falta el nombre comercial." },
  numeroRegistro: { maximo: 30, siFalta: "Falta el número de registro." },
} as const;

/** Errores por campo; vacío si los datos son válidos. */
export function erroresDeProducto(datos: DatosProducto): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const campo of ["nombreComercial", "numeroRegistro"] as const) {
    const { maximo, siFalta } = LIMITES[campo];
    const longitud = contarCaracteres(datos[campo].trim());
    if (longitud === 0) errores[campo] = siFalta;
    else if (longitud > maximo) errores[campo] = `Puede tener como mucho ${maximo} caracteres.`;
  }
  return errores;
}
