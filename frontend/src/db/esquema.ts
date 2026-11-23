// Esquema local de la PWA en IndexedDB con Dexie (T-16; data-model, "Almacenamiento local"; research R3).
//
// - parcelas, personas, equipos y productos: copia de los datos maestros para elegir y validar sin conexión.
// - tratamientos: los de la explotación, incluidos los guardados sin conexión, con su estado de sincronización.
// - cola: operaciones pendientes de enviar (outbox), en orden FIFO; idOperacion único (idempotencia, R4).
// - meta: última sincronización, explotación de la sesión, etc.
//
// Los tipos de cada almacén se completan con los de la API (tipos.ts) en las historias que los usan.
import { Dexie, type EntityTable } from "dexie";

export type EstadoMaestro = "activa" | "baja";
export type EstadoSincronizacion = "sincronizado" | "pendiente" | "conflicto";
export type TipoOperacion =
  | "crear_producto"
  | "crear_tratamiento"
  | "corregir_tratamiento"
  | "anular_tratamiento"
  | "resolver_conflicto";

export interface Maestro {
  id: string;
  estado: EstadoMaestro;
  [dato: string]: unknown;
}

export interface TratamientoLocal {
  id: string;
  fecha: string;
  estadoSincronizacion: EstadoSincronizacion;
  parcelaIds: string[];
  productoIds: string[];
  [dato: string]: unknown;
}

export interface OperacionCola {
  orden?: number;
  idOperacion: string;
  tipo: TipoOperacion;
  entidadId: string;
  versionBase: number | null;
  cuerpo: unknown;
  creadaEn: string;
  intentos: number;
}

export interface Meta {
  clave: string;
  valor: unknown;
}

export const NOMBRE_BASE = "cuaderno";

export class BaseLocal extends Dexie {
  parcelas!: EntityTable<Maestro, "id">;
  personas!: EntityTable<Maestro, "id">;
  equipos!: EntityTable<Maestro, "id">;
  productos!: EntityTable<Maestro, "id">;
  tratamientos!: EntityTable<TratamientoLocal, "id">;
  cola!: EntityTable<OperacionCola, "orden">;
  meta!: EntityTable<Meta, "clave">;

  constructor(nombre: string = NOMBRE_BASE) {
    super(nombre);
    this.version(1).stores({
      parcelas: "id, estado",
      personas: "id, estado",
      equipos: "id, estado",
      productos: "id, estado",
      tratamientos: "id, fecha, estadoSincronizacion, *parcelaIds, *productoIds",
      cola: "++orden, &idOperacion, entidadId",
      meta: "clave",
    });
  }
}
