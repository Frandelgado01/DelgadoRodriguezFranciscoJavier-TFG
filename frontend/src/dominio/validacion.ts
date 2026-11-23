// Reglas de validación compartidas con la API (research R8).
//
// La misma regla está en backend/src/cuaderno/dominio/validacion.py; las dos pasan los casos de
// compartido/casos-validacion.json. Cada regla devuelve null si el dato es válido o el error con el campo,
// un mensaje en lenguaje llano y el REQ-xx que la pide.

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

/** Forma nombre@dominio.ext, sin espacios dentro y de 254 caracteres como mucho (REQ-20). */
export function validarCorreo(valor: string): ErrorRegla | null {
  const correo = valor.trim();
  if (contarCaracteres(correo) <= CORREO_MAXIMO && FORMATO_CORREO.test(correo)) return null;
  return {
    campo: "correo",
    mensaje: "Escribe un correo electrónico válido, por ejemplo nombre@dominio.es.",
    req: "REQ-20",
  };
}
