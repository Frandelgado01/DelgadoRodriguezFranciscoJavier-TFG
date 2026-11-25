// Cliente de la API (T-15; research R7, R8 y R11).
//
// La PWA y la API se sirven en el mismo origen (Caddy hace de proxy de /api), así que la cookie de sesión
// __Host-sesion viaja sola con credentials: "same-origin". La API solo acepta JSON (R9).
// Los tipos de los datos salen de tipos.ts, generado con openapi-typescript desde openapi.json.
import type { components } from "./tipos";

export type Esquemas = components["schemas"];

export type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Cuerpo de error de la API: `{mensaje}`, `ErrorValidacion` (422) o `EsperaAcceso` (429). */
export interface ErrorApi {
  mensaje?: string;
  errores?: { campo: string; mensaje: string; req?: string | null }[];
  segundosRestantes?: number;
}

export type Resultado<T> =
  | { ok: true; estado: number; datos: T }
  | { ok: false; estado: number; error: ErrorApi; cabeceras: Headers; sinConexion?: false }
  | { ok: false; estado: 0; error: ErrorApi; cabeceras: Headers; sinConexion: true };

const BASE = "/api";

async function leerCuerpo(respuesta: Response): Promise<unknown> {
  const tipo = respuesta.headers.get("Content-Type") ?? "";
  if (respuesta.status === 204 || !tipo.includes("application/json")) return undefined;
  return respuesta.json();
}

/** Llama a la API. No lanza excepciones: la falta de conexión se devuelve con estado 0. */
export async function llamar<T = unknown>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<Resultado<T>> {
  const opciones: RequestInit = {
    method: metodo,
    headers:
      cuerpo === undefined
        ? { Accept: "application/json" }
        : { Accept: "application/json", "Content-Type": "application/json" },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
    credentials: "same-origin",
  };
  let respuesta: Response;
  let datos: unknown;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, opciones);
    datos = await leerCuerpo(respuesta); // también falla si la conexión se corta a medias
  } catch {
    return {
      ok: false,
      estado: 0,
      sinConexion: true,
      cabeceras: new Headers(),
      error: { mensaje: "No hay conexión. Inténtalo cuando tengas cobertura." },
    };
  }
  if (respuesta.ok) return { ok: true, estado: respuesta.status, datos: datos as T };
  return {
    ok: false,
    estado: respuesta.status,
    cabeceras: respuesta.headers,
    error: (datos ?? {}) as ErrorApi,
  };
}
