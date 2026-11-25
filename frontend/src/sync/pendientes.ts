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

/** Ids con alguna operación en la cola: su copia local manda sobre la del servidor. */
export async function idsEnCola(base: BaseLocal): Promise<Set<string>> {
  return new Set((await base.cola.toArray()).map((o) => o.entidadId));
}
