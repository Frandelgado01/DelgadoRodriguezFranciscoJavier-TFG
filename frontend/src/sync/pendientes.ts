// Qué operación de la cola toca enviar (T-40 y T-83; research R3 y R16).
import type { BaseLocal, OperacionCola } from "../db/esquema";
import type { TratamientoNuevo } from "./cola";

/** Ruta de la API de cada operación. Las demás operaciones llegan en T-61. */
export const RUTAS = { crear_producto: "/productos", crear_tratamiento: "/tratamientos" } as const;

/** Primera operación que se puede enviar: un tratamiento espera a que se creen sus productos (R16). */
export async function siguiente(base: BaseLocal): Promise<OperacionCola | undefined> {
  const operaciones = await base.cola.orderBy("orden").toArray();
  const sinCrear = new Set(operaciones.filter((o) => o.tipo === "crear_producto").map((o) => o.entidadId));
  return operaciones.find((o) => {
    if (o.estado !== "pendiente" || !(o.tipo in RUTAS)) return false;
    if (o.tipo === "crear_producto") return true;
    return !(o.cuerpo as TratamientoNuevo).productos.some((linea) => sinCrear.has(linea.productoId));
  });
}

/** Altas de productos rechazadas que hacen esperar a un tratamiento pendiente; vacía si no espera a ninguna. */
export function productosQueEspera(operacion: OperacionCola, operaciones: OperacionCola[]): OperacionCola[] {
  if (operacion.tipo !== "crear_tratamiento" || operacion.estado !== "pendiente") return [];
  const usados = new Set((operacion.cuerpo as TratamientoNuevo).productos.map((linea) => linea.productoId));
  return operaciones.filter((o) => o.tipo === "crear_producto" && o.estado === "rechazada" && usados.has(o.entidadId));
}

/**
 * Operación que se puede corregir o descartar: la rechazada, o el tratamiento pendiente que espera a un producto
 * rechazado, que no se envía hasta que alguien lo arregle (R16). Los demás pendientes se envían solos.
 */
export async function buscarCorregible(base: BaseLocal, entidadId: string): Promise<OperacionCola | undefined> {
  const operaciones = await base.cola.toArray();
  return operaciones.find(
    (o) =>
      o.entidadId === entidadId && (o.estado === "rechazada" || productosQueEspera(o, operaciones).length > 0),
  );
}

/** Ids con alguna operación en la cola: su copia local manda sobre la del servidor. */
export async function idsEnCola(base: BaseLocal): Promise<Set<string>> {
  return new Set((await base.cola.toArray()).map((o) => o.entidadId));
}
