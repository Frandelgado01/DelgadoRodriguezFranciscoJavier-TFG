// Bases locales de la app (T-19 y T-79; research R16): la del dispositivo y la de la explotación de la sesión.
//
// Sin sesión no hay ninguna base de explotación abierta. Quien lee o escribe datos pide la base abierta y trabaja
// con ella hasta terminar, aunque entre tanto cambie la sesión. Las pruebas usan fake-indexeddb.
import { BaseDispositivo, BaseLocal, NOMBRE_BASE } from "./esquema";

export const dispositivo = new BaseDispositivo();

let abierta: { explotacionId: string; base: BaseLocal } | null = null;

function nombreBase(explotacionId: string): string {
  return `${NOMBRE_BASE}-${explotacionId}`;
}

/** Abre la base de la explotación y cierra la de cualquier otra. */
export function abrirBase(explotacionId: string): BaseLocal {
  if (abierta?.explotacionId === explotacionId) return abierta.base;
  cerrarBase();
  const base = new BaseLocal(nombreBase(explotacionId));
  abierta = { explotacionId, base };
  return base;
}

export function cerrarBase(): void {
  abierta?.base.close();
  abierta = null;
}

/** Base de la explotación de la sesión, o null si no hay sesión. */
export function baseAbierta(): BaseLocal | null {
  return abierta?.base ?? null;
}

/** Explotación de la base abierta, o null si no hay sesión. */
export function explotacionAbierta(): string | null {
  return abierta?.explotacionId ?? null;
}

/** Base de la explotación de la sesión, para las páginas que solo se muestran con sesión. */
export function baseActual(): BaseLocal {
  if (abierta === null) throw new Error("No hay ninguna sesión abierta en este dispositivo.");
  return abierta.base;
}

/** Deja de ofrecer la base abierta, sin cerrarla: nadie puede guardar ya en ella. Devuelve la que había. */
export function soltarBase(): BaseLocal | null {
  const base = abierta?.base ?? null;
  abierta = null;
  return base;
}
