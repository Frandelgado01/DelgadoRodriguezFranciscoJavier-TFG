// Datos del cuaderno leídos del dispositivo (T-42; REQ-01 y REQ-06): tratamientos locales y sincronizados, nombres de
// los elementos que usan (también los de baja, REQ-17) y registros rechazados con su motivo (R16).
import type { Esquemas } from "../../api/cliente";
import { baseActual } from "../../db/base";
import type { ErrorOperacion, OperacionCola, TratamientoLocal } from "../../db/esquema";
import type { ProductoNuevo, TratamientoNuevo } from "../../sync/cola";
import { productosQueEspera } from "../../sync/pendientes";

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
  /** Motivos por los que un tratamiento hay que corregirlo o descartarlo, por su id. */
  motivos: Map<string, ErrorOperacion[]>;
  productosRechazados: ProductoRechazado[];
}

/** Del más reciente al más antiguo; con la misma fecha, antes el que se anotó después. */
function masRecienteAntes(a: TratamientoCuaderno, b: TratamientoCuaderno): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
  return Date.parse(b.registradoEn) - Date.parse(a.registradoEn);
}

/** Motivos de los tratamientos rechazados y de los que esperan a un producto rechazado (R16). */
function motivosDe(operaciones: OperacionCola[]): Map<string, ErrorOperacion[]> {
  const motivos = new Map<string, ErrorOperacion[]>();
  for (const operacion of operaciones) {
    if (operacion.tipo !== "crear_tratamiento") continue;
    if (operacion.estado === "rechazada") motivos.set(operacion.entidadId, operacion.errores);
    const esperados = productosQueEspera(operacion, operaciones).map((o) => {
      const { nombreComercial } = o.cuerpo as ProductoNuevo;
      const mensaje =
        `Espera a un producto rechazado: «${nombreComercial}». Corrige el producto, o corrige o descarta este ` +
        "tratamiento.";
      return { campo: "", mensaje };
    });
    if (esperados.length > 0) motivos.set(operacion.entidadId, esperados);
  }
  return motivos;
}

export async function leerCuaderno(): Promise<DatosCuaderno> {
  const base = baseActual();
  const porId = async <T>(almacen: "parcelas" | "personas" | "equipos" | "productos") =>
    new Map((await base[almacen].toArray()).map((fila) => [fila.id, fila as unknown as T]));
  const [locales, parcelas, personas, equipos, productos, operaciones] = await Promise.all([
    base.tratamientos.toArray() as Promise<unknown> as Promise<TratamientoCuaderno[]>,
    porId<Esquemas["Parcela"]>("parcelas"),
    porId<Esquemas["Persona"]>("personas"),
    porId<Esquemas["Equipo"]>("equipos"),
    porId<Esquemas["Producto"]>("productos"),
    base.cola.toArray(),
  ]);
  return {
    tratamientos: locales.sort(masRecienteAntes),
    parcelas,
    personas,
    equipos,
    productos,
    motivos: motivosDe(operaciones),
    productosRechazados: operaciones
      .filter((o) => o.tipo === "crear_producto" && o.estado === "rechazada")
      .map((o) => ({ producto: o.cuerpo as ProductoNuevo, errores: o.errores })),
  };
}
