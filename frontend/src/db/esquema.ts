// Esquema local de la PWA en IndexedDB con Dexie (T-16 y T-79; data-model, "Almacenamiento local"; research R3 y
// R16).
//
// - Base "cuaderno" (del dispositivo): solo la sesión abierta.
// - Base "cuaderno-<explotacionId>" (una por explotación, para que dos cuentas no mezclen sus datos):
//   - parcelas, personas, equipos y productos: copia de los datos maestros para elegir y validar sin conexión.
//   - tratamientos: los de la explotación, incluidos los guardados sin conexión, con su estado de sincronización.
//   - cola: operaciones sin aplicar (outbox), en orden FIFO; idOperacion único (idempotencia, R4). Las que el
//     servidor rechaza se quedan con su estado y sus errores hasta que se corrigen o se descartan (R16).
//   - meta: última sincronización.
import { Dexie, type EntityTable } from "dexie";

export type EstadoMaestro = "activa" | "baja";
export type EstadoSincronizacion = "sincronizado" | "pendiente" | "conflicto" | "rechazado";
export type EstadoOperacion = "pendiente" | "rechazada";
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

/** Mensaje llano de la API; `campo` vacío si no es de un campo concreto. */
export interface ErrorOperacion {
  campo: string;
  mensaje: string;
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
  estado: EstadoOperacion;
  errores: ErrorOperacion[];
  /** Código HTTP del rechazo: con un 409 al crear hace falta un id nuevo para corregirlo (R16). */
  codigoRechazo?: number;
}

export interface Meta {
  clave: string;
  valor: unknown;
}

export const NOMBRE_BASE = "cuaderno";

/** Base del dispositivo: la sesión abierta. */
export class BaseDispositivo extends Dexie {
  meta!: EntityTable<Meta, "clave">;

  constructor() {
    super(NOMBRE_BASE);
    this.version(1).stores({
      parcelas: "id, estado",
      personas: "id, estado",
      equipos: "id, estado",
      productos: "id, estado",
      tratamientos: "id, fecha, estadoSincronizacion, *parcelaIds, *productoIds",
      cola: "++orden, &idOperacion, entidadId",
      meta: "clave",
    });
    // Los datos pasan a la base de cada explotación; los almacenes que tenía esta se eliminan (R16).
    this.version(2)
      .stores({
        parcelas: null,
        personas: null,
        equipos: null,
        productos: null,
        tratamientos: null,
        cola: null,
        meta: "clave",
      })
      .upgrade((transaccion) => transaccion.table("meta").where("clave").notEqual("sesion").delete());
  }
}

/** Base de una explotación. */
export class BaseLocal extends Dexie {
  parcelas!: EntityTable<Maestro, "id">;
  personas!: EntityTable<Maestro, "id">;
  equipos!: EntityTable<Maestro, "id">;
  productos!: EntityTable<Maestro, "id">;
  tratamientos!: EntityTable<TratamientoLocal, "id">;
  cola!: EntityTable<OperacionCola, "orden">;
  meta!: EntityTable<Meta, "clave">;

  constructor(nombre: string) {
    super(nombre);
    this.version(1).stores({
      parcelas: "id, estado",
      personas: "id, estado",
      equipos: "id, estado",
      productos: "id, estado",
      tratamientos: "id, fecha, estadoSincronizacion, *parcelaIds, *productoIds",
      cola: "++orden, &idOperacion, entidadId, estado",
      meta: "clave",
    });
  }
}
