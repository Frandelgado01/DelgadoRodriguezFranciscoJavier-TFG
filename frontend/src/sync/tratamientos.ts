// Descarga de los tratamientos a IndexedDB (T-83; REQ-06; research R3 y R16, data-model).
//
// Al entrar y tras vaciar la cola se descargan todas las páginas y se sustituyen las copias locales, salvo las que
// tienen operaciones en la cola (pendientes o rechazadas). Si falla una página no se toca ninguna copia. También se
// guardan los elementos de baja que usan los tratamientos, para seguir mostrándolos (REQ-17).
import { llamar, type Esquemas, type Resultado } from "../api/cliente";
import { baseActual } from "../db/base";
import type { BaseLocal, Maestro } from "../db/esquema";
import { aLocal, type TratamientoNuevo } from "./cola";
import { ALMACENES } from "./maestros";
import { idsEnCola } from "./pendientes";

const TAMANO = 200; // el máximo del contrato

type Tratamiento = Esquemas["Tratamiento"];
type Almacen = (typeof ALMACENES)[number];
export type ResultadoTratamientos = { estado: "descargados" } | { estado: "error"; resultado: Resultado<unknown> };

async function pedirTodos(): Promise<Tratamiento[] | Resultado<unknown>> {
  const todos = new Map<string, Tratamiento>();
  for (let pagina = 1; ; pagina += 1) {
    const resultado = await llamar<Esquemas["PaginaTratamientos"]>(
      "GET",
      `/tratamientos?pagina=${pagina}&tamano=${TAMANO}`,
    );
    if (!resultado.ok) return resultado;
    const { elementos, total } = resultado.datos;
    for (const tratamiento of elementos) todos.set(tratamiento.id, tratamiento);
    if (elementos.length === 0 || pagina * TAMANO >= total) return [...todos.values()];
  }
}

/** Ids de los datos maestros que usan los tratamientos, por almacén. */
function usados(tratamientos: TratamientoNuevo[]): Record<Almacen, Set<string>> {
  return {
    parcelas: new Set(tratamientos.flatMap((t) => t.parcelas.map((linea) => linea.parcelaId))),
    personas: new Set(tratamientos.flatMap((t) => (t.asesorId ? [t.aplicadorId, t.asesorId] : [t.aplicadorId]))),
    equipos: new Set(tratamientos.map((t) => t.equipoId)),
    productos: new Set(tratamientos.flatMap((t) => t.productos.map((linea) => linea.productoId))),
  };
}

/** Guarda los elementos que usan los tratamientos del dispositivo y no están en él, porque se dieron de baja. */
async function completarBajas(base: BaseLocal): Promise<void> {
  const locales = (await base.tratamientos.toArray()) as unknown as TratamientoNuevo[];
  const porAlmacen = usados(locales);
  for (const almacen of ALMACENES) {
    const tabla = base[almacen];
    const presentes = new Set(await tabla.toCollection().primaryKeys());
    const faltan = new Set([...porAlmacen[almacen]].filter((id) => !presentes.has(id)));
    if (faltan.size === 0) continue;
    const resultado = await llamar<Maestro[]>("GET", `/${almacen}?incluir_bajas=true`);
    if (resultado.ok) await tabla.bulkPut(resultado.datos.filter(({ id }) => faltan.has(id)));
  }
}

export async function descargarTratamientos(): Promise<ResultadoTratamientos> {
  // La misma base de principio a fin, aunque entre tanto cambie la sesión (R16).
  const base = baseActual();
  // Uno que se envíe mientras se descarga no está en las páginas ya leídas: no se borra.
  const alEmpezar = await base.tratamientos.where("estadoSincronizacion").equals("sincronizado").primaryKeys();
  const recibidos = await pedirTodos();
  if (!Array.isArray(recibidos)) return { estado: "error", resultado: recibidos };

  await base.transaction("rw", [base.tratamientos, base.cola], async () => {
    const protegidos = await idsEnCola(base);
    await base.tratamientos.bulkDelete(alEmpezar.filter((id) => !protegidos.has(id)));
    await base.tratamientos.bulkPut(
      recibidos.filter(({ id }) => !protegidos.has(id)).map((t) => aLocal(t, "sincronizado")),
    );
  });
  await completarBajas(base);
  return { estado: "descargados" };
}
