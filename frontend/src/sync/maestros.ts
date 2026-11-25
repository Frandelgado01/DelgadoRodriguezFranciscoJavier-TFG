// Descarga de los datos maestros a IndexedDB (T-28 y T-83; REQ-14, REQ-15 y REQ-16; research R3 y R16).
//
// Al iniciar sesión y tras vaciar la cola, la PWA sustituye sus copias de parcelas, personas, equipos y
// productos por las activas del servidor, para poder elegirlas y validar sin conexión (data-model,
// "Almacenamiento local"). Reglas:
// - Si queda algo por enviar en la cola no se toca nada: el envío llama a esta función al vaciarla. Lo rechazado, y lo
//   que espera a un producto rechazado, no lo impide: se conservan los productos con el alta en la cola.
// - Se sustituyen las cuatro copias a la vez o ninguna: si falla alguna lista se conservan las que había.
// - No se borra lo que no estaba al empezar (se dio de alta durante la descarga) ni lo que está de baja, que se
//   guarda para mostrar los tratamientos que lo usan (tratamientos.ts).
import { llamar, type Resultado } from "../api/cliente";
import { baseActual } from "../db/base";
import type { Maestro } from "../db/esquema";
import { idsEnCola, siguiente } from "./pendientes";

export const CLAVE_DESCARGA = "maestrosDescargadosEn";

export const ALMACENES = ["parcelas", "personas", "equipos", "productos"] as const;

export type ResultadoDescarga =
  | { estado: "descargados" }
  | { estado: "cola-pendiente" }
  | { estado: "error"; resultado: Resultado<unknown> };

export async function descargarMaestros(): Promise<ResultadoDescarga> {
  // La misma base de principio a fin, aunque entre tanto cambie la sesión (R16).
  const base = baseActual();
  if (await siguiente(base)) return { estado: "cola-pendiente" };
  const tablas = ALMACENES.map((almacen) => base[almacen]);
  const alEmpezar = await Promise.all(tablas.map((tabla) => tabla.where("estado").equals("activa").primaryKeys()));

  const resultados = await Promise.all(ALMACENES.map((almacen) => llamar<Maestro[]>("GET", `/${almacen}`)));
  const fallido = resultados.find((resultado) => !resultado.ok);
  if (fallido) return { estado: "error", resultado: fallido };

  return base.transaction("rw", [...tablas, base.cola, base.meta], async () => {
    // Una operación encolada mientras se descargaba también gana: se descargará al vaciar la cola.
    if (await siguiente(base)) return { estado: "cola-pendiente" } as const;
    const protegidos = await idsEnCola(base);
    for (const [indice, tabla] of tablas.entries()) {
      const resultado = resultados[indice];
      await tabla.bulkDelete((alEmpezar[indice] ?? []).filter((id) => !protegidos.has(id)));
      if (resultado?.ok) await tabla.bulkPut(resultado.datos.filter(({ id }) => !protegidos.has(id)));
    }
    await base.meta.put({ clave: CLAVE_DESCARGA, valor: new Date().toISOString() });
    return { estado: "descargados" } as const;
  });
}
