// Datos del cuaderno leídos del dispositivo (T-42; REQ-01 y REQ-06): tratamientos locales y sincronizados, nombres de
// los elementos que usan (también los de baja, REQ-17) y registros rechazados con su motivo (R16).
import type { Esquemas } from "../../api/cliente";
import { baseActual } from "../../db/base";
import type { ErrorOperacion, TratamientoLocal } from "../../db/esquema";
import type { ProductoNuevo, TratamientoNuevo } from "../../sync/cola";

/** Tratamiento del dispositivo: los que vienen del servidor llevan además el número de orden de cada parcela. */
export type TratamientoCuaderno = TratamientoNuevo &
  Pick<TratamientoLocal, "estadoSincronizacion"> & {
    parcelas: (TratamientoNuevo["parcelas"][number] & { numeroOrden?: number })[];
  };

export interface ProductoRechazado {
  producto: ProductoNuevo;
  errores: ErrorOperacion[];
}

export interface DatosCuaderno {
  tratamientos: TratamientoCuaderno[];
  parcelas: Map<string, Esquemas["Parcela"]>;
  personas: Map<string, Esquemas["Persona"]>;
  equipos: Map<string, Esquemas["Equipo"]>;
  productos: Map<string, Esquemas["Producto"]>;
  /** Motivos del rechazo, por el id del tratamiento. */
  motivos: Map<string, ErrorOperacion[]>;
  productosRechazados: ProductoRechazado[];
}

/** Del más reciente al más antiguo; con la misma fecha, antes el que se anotó después. */
function masRecienteAntes(a: TratamientoCuaderno, b: TratamientoCuaderno): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
  return Date.parse(b.registradoEn) - Date.parse(a.registradoEn);
}

export async function leerCuaderno(): Promise<DatosCuaderno> {
  const base = baseActual();
  const porId = async <T>(almacen: "parcelas" | "personas" | "equipos" | "productos") =>
    new Map((await base[almacen].toArray()).map((fila) => [fila.id, fila as unknown as T]));
  const [locales, parcelas, personas, equipos, productos, rechazadas] = await Promise.all([
    base.tratamientos.toArray() as Promise<unknown> as Promise<TratamientoCuaderno[]>,
    porId<Esquemas["Parcela"]>("parcelas"),
    porId<Esquemas["Persona"]>("personas"),
    porId<Esquemas["Equipo"]>("equipos"),
    porId<Esquemas["Producto"]>("productos"),
    base.cola.where("estado").equals("rechazada").toArray(),
  ]);
  return {
    tratamientos: locales.sort(masRecienteAntes),
    parcelas,
    personas,
    equipos,
    productos,
    motivos: new Map(
      rechazadas.filter((o) => o.tipo === "crear_tratamiento").map((o) => [o.entidadId, o.errores]),
    ),
    productosRechazados: rechazadas
      .filter((o) => o.tipo === "crear_producto")
      .map((o) => ({ producto: o.cuerpo as ProductoNuevo, errores: o.errores })),
  };
}
