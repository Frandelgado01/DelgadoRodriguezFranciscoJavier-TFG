// Datos que usa el formulario de registro, leídos del dispositivo (T-41; REQ-06), y conversión entre los valores del
// formulario (texto) y el cuerpo de POST /tratamientos.
import type { Esquemas } from "../../api/cliente";
import { baseActual } from "../../db/base";
import type { Maestro, OperacionCola } from "../../db/esquema";
import { fechaEnMadrid, hoyEnMadrid } from "../../dominio/fechas";
import type { TratamientoNuevo } from "../../sync/cola";
import { conComa, numero, texto, textoOpcional } from "../explotacion/formato";

export type Parcela = Esquemas["Parcela"] & Maestro;
export type Persona = Esquemas["Persona"] & Maestro;
export type Equipo = Esquemas["Equipo"] & Maestro;
export type Producto = Esquemas["Producto"] & Maestro;

export interface Catalogos {
  parcelas: Parcela[];
  aplicadores: Persona[];
  asesores: Persona[];
  equipos: Equipo[];
  productos: Producto[];
}

/** Elementos activos del dispositivo: los de baja no se ofrecen en tratamientos nuevos (REQ-17). */
export async function leerCatalogos(): Promise<Catalogos> {
  const base = baseActual();
  const activos = <T>(almacen: "parcelas" | "personas" | "equipos" | "productos") =>
    base[almacen].where("estado").equals("activa").toArray() as Promise<unknown> as Promise<T[]>;
  const [parcelas, personas, equipos, productos] = await Promise.all([
    activos<Parcela>("parcelas"),
    activos<Persona>("personas"),
    activos<Equipo>("equipos"),
    activos<Producto>("productos"),
  ]);
  const porNombre = (a: Persona, b: Persona) => a.nombre.localeCompare(b.nombre, "es");
  return {
    parcelas: parcelas.sort((a, b) => a.numeroOrden - b.numeroOrden),
    aplicadores: personas.filter((p) => p.tipo === "aplicador").sort(porNombre),
    asesores: personas.filter((p) => p.tipo === "asesor").sort(porNombre),
    equipos: equipos.sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es")),
    productos: productos.sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial, "es")),
  };
}

/** Operación rechazada de un tratamiento, o null si ya se corrigió o se descartó. */
export async function leerRechazada(id: string): Promise<OperacionCola | null> {
  const operaciones = await baseActual().cola.where("entidadId").equals(id).toArray();
  return operaciones.find((o) => o.estado === "rechazada" && o.tipo === "crear_tratamiento") ?? null;
}

export interface LineaParcela {
  clave: string;
  parcelaId: string;
  superficieTratada: string;
  cultivoEspecie: string;
  cultivoVariedad: string;
  productoSemilla: string;
}

export interface LineaProducto {
  clave: string;
  productoId: string;
  cantidad: string;
  unidadMedida: string;
}

export interface Valores {
  fecha: string;
  parcelas: LineaParcela[];
  problema: string;
  aplicadorId: string;
  asesorId: string;
  productos: LineaProducto[];
  equipoId: string;
  eficacia: string;
  observaciones: string;
}

export function parcelaVacia(): LineaParcela {
  return {
    clave: crypto.randomUUID(),
    parcelaId: "",
    superficieTratada: "",
    cultivoEspecie: "",
    cultivoVariedad: "",
    productoSemilla: "",
  };
}

export function productoVacio(): LineaProducto {
  return { clave: crypto.randomUUID(), productoId: "", cantidad: "", unidadMedida: "kg" };
}

export function valoresVacios(): Valores {
  return {
    fecha: hoyEnMadrid(),
    parcelas: [parcelaVacia()],
    problema: "",
    aplicadorId: "",
    asesorId: "",
    productos: [productoVacio()],
    equipoId: "",
    eficacia: "",
    observaciones: "",
  };
}

export function aValores(t: TratamientoNuevo): Valores {
  const parcelas = t.parcelas.map((linea) => ({
    clave: crypto.randomUUID(),
    parcelaId: linea.parcelaId,
    superficieTratada: conComa(linea.superficieTratada),
    cultivoEspecie: linea.cultivoEspecie,
    cultivoVariedad: linea.cultivoVariedad,
    productoSemilla: linea.productoSemilla ?? "",
  }));
  const productos = t.productos.map((linea) => ({
    clave: crypto.randomUUID(),
    productoId: linea.productoId,
    cantidad: conComa(linea.cantidad),
    unidadMedida: linea.unidadMedida,
  }));
  return {
    fecha: t.fecha,
    parcelas: parcelas.length > 0 ? parcelas : [parcelaVacia()],
    problema: t.problema,
    aplicadorId: t.aplicadorId,
    asesorId: t.asesorId ?? "",
    productos: productos.length > 0 ? productos : [productoVacio()],
    equipoId: t.equipoId,
    eficacia: t.eficacia ?? "",
    observaciones: t.observaciones ?? "",
  };
}

/** El id si está en la lista; si no (se dio de baja), vacío: hay que elegir otro. */
export function disponible(lista: { id: string }[], id: string): string {
  return lista.some((elemento) => elemento.id === id) ? id : "";
}

/** Datos del tratamiento con los nombres del contrato, aún sin validar. */
export function aDatos(v: Valores, c: Catalogos) {
  return {
    fecha: v.fecha,
    problema: texto(v.problema),
    aplicadorId: disponible(c.aplicadores, v.aplicadorId),
    asesorId: disponible(c.asesores, v.asesorId) || null,
    equipoId: disponible(c.equipos, v.equipoId),
    parcelas: v.parcelas.map((linea) => ({
      parcelaId: disponible(c.parcelas, linea.parcelaId),
      superficieTratada: numero(linea.superficieTratada),
      cultivoEspecie: texto(linea.cultivoEspecie),
      cultivoVariedad: texto(linea.cultivoVariedad),
      productoSemilla: textoOpcional(linea.productoSemilla),
    })),
    productos: v.productos.map((linea) => ({
      productoId: disponible(c.productos, linea.productoId),
      cantidad: numero(linea.cantidad),
      unidadMedida: linea.unidadMedida,
    })),
    eficacia: v.eficacia || null,
    observaciones: textoOpcional(v.observaciones),
  };
}

/**
 * Momento en que se anotó (R14). Al corregir un rechazo se conserva el primero, porque entonces se anotó; salvo que
 * se rechazara por él o que la fecha corregida sea posterior.
 */
export function momentoDelRegistro(rechazada: OperacionCola | null, fecha: string): string {
  const ahora = new Date().toISOString();
  if (rechazada === null) return ahora;
  const { registradoEn } = rechazada.cuerpo as TratamientoNuevo;
  const rechazado = rechazada.errores.some(({ campo }) => campo === "registradoEn");
  return rechazado || fechaEnMadrid(new Date(registradoEn)) < fecha ? ahora : registradoEn;
}
