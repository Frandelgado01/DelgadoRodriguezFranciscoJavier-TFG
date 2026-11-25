// Cola de operaciones sin aplicar (T-40; REQ-06; research R3, R4 y R16).
//
// Guardar escribe en el dispositivo y encola la operación en la misma transacción: si la app se cierra, o se ha
// guardado todo o nada. El envío lo hace vaciado.ts. Aquí están también corregir y descartar lo rechazado y lo que
// espera a un producto rechazado.
import type { Esquemas } from "../api/cliente";
import { baseAbierta, baseActual } from "../db/base";
import type { BaseLocal, EstadoSincronizacion, OperacionCola, TipoOperacion, TratamientoLocal } from "../db/esquema";
import { buscarCorregible } from "./pendientes";
import { sincronizar } from "./vaciado";

export type ParcelaTratadaNueva = Omit<Esquemas["ParcelaTratadaNueva"], "productoSemilla"> & {
  productoSemilla: string | null;
};
export type ProductoAplicadoNuevo = Esquemas["ProductoAplicadoNuevo"];

/** Cuerpo de POST /tratamientos, con los opcionales a null. */
export interface TratamientoNuevo {
  id: string;
  registradoEn: string;
  fecha: string;
  problema: string;
  aplicadorId: string;
  asesorId: string | null;
  equipoId: string;
  parcelas: ParcelaTratadaNueva[];
  productos: ProductoAplicadoNuevo[];
  eficacia: "buena" | "regular" | "mala" | null;
  observaciones: string | null;
}

/** Cuerpo de POST /productos. */
export interface ProductoNuevo {
  id: string;
  nombreComercial: string;
  numeroRegistro: string;
}

export interface Cuenta {
  pendientes: number;
  rechazadas: number;
}

/** Copia local de un tratamiento, con los índices de sus parcelas y productos. */
export function aLocal(
  tratamiento: TratamientoNuevo | Esquemas["Tratamiento"],
  estadoSincronizacion: EstadoSincronizacion,
): TratamientoLocal {
  return {
    ...tratamiento,
    estadoSincronizacion,
    parcelaIds: tratamiento.parcelas.map((linea) => linea.parcelaId),
    productoIds: tratamiento.productos.map((linea) => linea.productoId),
  };
}

function operacion(tipo: TipoOperacion, entidadId: string, cuerpo: unknown): OperacionCola {
  return {
    idOperacion: crypto.randomUUID(),
    tipo,
    entidadId,
    versionBase: null,
    cuerpo,
    creadaEn: new Date().toISOString(),
    intentos: 0,
    estado: "pendiente",
    errores: [],
  };
}

/** Envía lo encolado si hay red; si no, saldrá con el siguiente disparador (R3). */
function enviarSiHayRed(): void {
  if (navigator.onLine) void sincronizar();
}

export async function guardarTratamiento(tratamiento: TratamientoNuevo): Promise<void> {
  const base = baseActual();
  await base.transaction("rw", [base.tratamientos, base.cola], async () => {
    await base.tratamientos.put(aLocal(tratamiento, "pendiente"));
    await base.cola.add(operacion("crear_tratamiento", tratamiento.id, tratamiento));
  });
  enviarSiHayRed();
}

/** Da de alta un producto en el dispositivo: se puede elegir enseguida, también sin conexión (REQ-16). */
export async function guardarProducto(producto: ProductoNuevo): Promise<void> {
  const base = baseActual();
  await base.transaction("rw", [base.productos, base.cola], async () => {
    await base.productos.put({ ...producto, estado: "activa", fechaBaja: null });
    await base.cola.add(operacion("crear_producto", producto.id, producto));
  });
  enviarSiHayRed();
}

/**
 * Operación lista para volver a enviarse. Con el mismo id, porque el servidor nunca la aplicó; con uno nuevo si el
 * rechazo fue un 409 al crear, porque ese id ya existe con otro contenido (R16).
 */
async function reencolar<T extends { id: string }>(
  base: BaseLocal,
  entidadId: string,
  datos: Omit<T, "id">,
): Promise<T> {
  const anterior = await buscarCorregible(base, entidadId);
  if (anterior === undefined) throw new Error("Este registro no se puede corregir.");
  const id = anterior.codigoRechazo === 409 ? crypto.randomUUID() : entidadId;
  const cuerpo = { ...datos, id } as T;
  const reencolada: OperacionCola = { ...anterior, entidadId: id, cuerpo, estado: "pendiente", errores: [] };
  delete reencolada.codigoRechazo;
  await base.cola.put(reencolada);
  return cuerpo;
}

/** Corrige un tratamiento rechazado, o que espera a un producto rechazado, y lo vuelve a encolar. Devuelve su id. */
export async function corregirTratamiento(id: string, datos: TratamientoNuevo): Promise<string> {
  const base = baseActual();
  const nuevo = await base.transaction("rw", [base.tratamientos, base.cola], async () => {
    const cuerpo = await reencolar<TratamientoNuevo>(base, id, datos);
    if (cuerpo.id !== id) await base.tratamientos.delete(id);
    await base.tratamientos.put(aLocal(cuerpo, "pendiente"));
    return cuerpo.id;
  });
  enviarSiHayRed();
  return nuevo;
}

/** Cambia el id de un producto en los tratamientos sin enviar que lo usan. */
async function sustituirProducto(base: BaseLocal, anterior: string, nuevo: string): Promise<void> {
  for (const usada of await tratamientosQueUsan(base, anterior)) {
    const cuerpo = usada.cuerpo as TratamientoNuevo;
    const productos = cuerpo.productos.map((linea) =>
      linea.productoId === anterior ? { ...linea, productoId: nuevo } : linea,
    );
    const cambiado = { ...cuerpo, productos };
    await base.cola.put({ ...usada, cuerpo: cambiado });
    const local = await base.tratamientos.get(usada.entidadId);
    await base.tratamientos.put(aLocal(cambiado, local?.estadoSincronizacion ?? "pendiente"));
  }
}

/** Corrige el alta rechazada de un producto y la vuelve a encolar. Devuelve su id, que puede ser nuevo. */
export async function corregirProducto(id: string, datos: Omit<ProductoNuevo, "id">): Promise<string> {
  const base = baseActual();
  const nuevo = await base.transaction("rw", [base.productos, base.tratamientos, base.cola], async () => {
    const cuerpo = await reencolar<ProductoNuevo>(base, id, datos);
    if (cuerpo.id !== id) {
      await base.productos.delete(id);
      await sustituirProducto(base, id, cuerpo.id);
    }
    await base.productos.put({ ...cuerpo, estado: "activa", fechaBaja: null });
    return cuerpo.id;
  });
  enviarSiHayRed();
  return nuevo;
}

async function tratamientosQueUsan(base: BaseLocal, productoId: string): Promise<OperacionCola[]> {
  return base.cola
    .filter(
      (o) =>
        o.tipo === "crear_tratamiento" &&
        (o.cuerpo as TratamientoNuevo).productos.some((linea) => linea.productoId === productoId),
    )
    .toArray();
}

export type ResultadoDescarte = { ok: true } | { ok: false; mensaje: string };

/**
 * Borra un registro rechazado, o que espera a un producto rechazado, y su copia local: nunca llegó al servidor (R16).
 * La página pide confirmación.
 */
export async function descartar(entidadId: string): Promise<ResultadoDescarte> {
  const base = baseActual();
  return base.transaction("rw", [base.productos, base.tratamientos, base.cola], async () => {
    const operacion = await buscarCorregible(base, entidadId);
    if (operacion?.orden === undefined) {
      return { ok: false, mensaje: "Solo se puede descartar un registro rechazado o que espera a un producto rechazado." };
    }
    if (operacion.tipo === "crear_producto") {
      if ((await tratamientosQueUsan(base, entidadId)).length > 0) {
        return {
          ok: false,
          mensaje:
            "Este producto lo usa un tratamiento sin enviar. Corrige o descarta antes ese tratamiento.",
        };
      }
      await base.productos.delete(entidadId);
    } else {
      await base.tratamientos.delete(entidadId);
    }
    await base.cola.delete(operacion.orden);
    return { ok: true };
  });
}

/** Operaciones de la cuenta abierta: pendientes de enviar y rechazadas. */
export async function contarOperaciones(): Promise<Cuenta> {
  const base = baseAbierta();
  if (base === null) return { pendientes: 0, rechazadas: 0 };
  const [pendientes, rechazadas] = await Promise.all([
    base.cola.where("estado").equals("pendiente").count(),
    base.cola.where("estado").equals("rechazada").count(),
  ]);
  return { pendientes, rechazadas };
}
