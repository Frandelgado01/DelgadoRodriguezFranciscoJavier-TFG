// Ayudas comunes de las pruebas de la PWA que usan IndexedDB (fake-indexeddb).
import { Dexie } from "dexie";
import { abrirBase, cerrarBase, dispositivo } from "../src/db/base";
import type { BaseLocal } from "../src/db/esquema";

/** Deja el dispositivo como recién instalado: sin sesión y sin ninguna base de explotación. */
export async function vaciarDispositivo(): Promise<void> {
  cerrarBase();
  await dispositivo.delete();
  for (const nombre of await Dexie.getDatabaseNames()) await Dexie.delete(nombre);
  await dispositivo.open();
}

/** Dispositivo vacío con la base de la explotación abierta. */
export async function prepararBase(explotacionId: string): Promise<BaseLocal> {
  await vaciarDispositivo();
  return abrirBase(explotacionId);
}
