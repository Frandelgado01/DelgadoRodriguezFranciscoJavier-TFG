// Sesión guardada en el dispositivo (T-19; REQ-20; research R9).
//
// La cookie __Host-sesion es HttpOnly: la app no la ve. Para abrir el cuaderno sin conexión (REQ-06) guarda en
// IndexedDB la cuenta de la sesión al entrar y la borra al salir. Si la API responde 401, la cola se conserva y
// se pide volver a entrar (R3).
import { base } from "./db/base";

export interface SesionLocal {
  correo: string;
  explotacionId: string;
}

const CLAVE = "sesion";

export async function guardarSesion(sesion: SesionLocal): Promise<void> {
  await base.meta.put({ clave: CLAVE, valor: sesion });
}

export async function leerSesion(): Promise<SesionLocal | null> {
  const fila = await base.meta.get(CLAVE);
  return (fila?.valor as SesionLocal | undefined) ?? null;
}

export async function borrarSesion(): Promise<void> {
  await base.meta.delete(CLAVE);
}

/** Borra todos los datos del dispositivo (cierre de sesión con la cola vacía). */
export async function borrarDatosLocales(): Promise<void> {
  await base.transaction("rw", base.tables, async () => {
    await Promise.all(base.tables.map((tabla) => tabla.clear()));
  });
}

export async function operacionesPendientes(): Promise<number> {
  return base.cola.count();
}
