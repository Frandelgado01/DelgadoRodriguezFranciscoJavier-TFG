// Sesión guardada en el dispositivo (T-19 y T-79; REQ-20; research R9 y R16).
//
// La cookie __Host-sesion es HttpOnly: la app no la ve. Para abrir el cuaderno sin conexión (REQ-06) guarda en
// la base del dispositivo la cuenta de la sesión al entrar y la borra al salir. Los datos están en la base de su
// explotación, que se abre con la sesión. Si la API responde 401, la cola se conserva y se pide volver a entrar (R3).
import { abrirBase, baseAbierta, cerrarBase, dispositivo, soltarBase } from "./db/base";

export interface SesionLocal {
  correo: string;
  explotacionId: string;
}

const CLAVE = "sesion";

export async function guardarSesion(sesion: SesionLocal): Promise<void> {
  await dispositivo.meta.put({ clave: CLAVE, valor: sesion });
  abrirBase(sesion.explotacionId);
}

/** Sesión del dispositivo; abre la base de su explotación (otra pestaña pudo cambiar de cuenta). */
export async function leerSesion(): Promise<SesionLocal | null> {
  const fila = await dispositivo.meta.get(CLAVE);
  const sesion = (fila?.valor as SesionLocal | undefined) ?? null;
  if (sesion) abrirBase(sesion.explotacionId);
  else cerrarBase();
  return sesion;
}

/** Cierra la sesión y conserva los datos de la cuenta: solo los vuelve a ver ella al entrar (R16). */
export async function borrarSesion(): Promise<void> {
  await dispositivo.meta.delete(CLAVE);
  cerrarBase();
}

/**
 * Cierra la sesión y elimina los datos de la cuenta (salir con la cola vacía). La cola se vuelve a contar cuando ya
 * nadie puede guardar en la base: si se guardó algo mientras se cerraba la sesión, se conserva para la misma cuenta.
 */
export async function borrarDatosLocales(): Promise<void> {
  const base = soltarBase();
  await dispositivo.meta.delete(CLAVE);
  if (base === null) return;
  if ((await base.cola.count()) > 0) base.close();
  else await base.delete();
}

/** Operaciones sin aplicar de la cuenta, pendientes o rechazadas. */
export async function operacionesSinAplicar(): Promise<number> {
  return (await baseAbierta()?.cola.count()) ?? 0;
}
