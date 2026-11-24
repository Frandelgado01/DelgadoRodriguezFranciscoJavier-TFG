// Descarga de los datos maestros a IndexedDB (T-28; REQ-14, REQ-15 y REQ-16; research R3).
//
// Al iniciar sesión y tras vaciar la cola, la PWA sustituye sus copias de parcelas, personas, equipos y
// productos por las activas del servidor, para poder elegirlas y validar sin conexión (data-model,
// "Almacenamiento local"). Reglas:
// - Si hay operaciones pendientes en la cola no se toca nada: sustituir los productos borraría uno dado de
//   alta sin conexión que aún no se ha enviado. El envío de la cola llama a esta función al vaciarla.
// - Se sustituyen las cuatro copias a la vez o ninguna: si falla alguna lista se conservan las que había.
import { llamar, type Resultado } from "../api/cliente";
import { base } from "../db/base";
import type { Maestro } from "../db/esquema";

export const CLAVE_DESCARGA = "maestrosDescargadosEn";

const ALMACENES = ["parcelas", "personas", "equipos", "productos"] as const;

export type ResultadoDescarga =
  | { estado: "descargados" }
  | { estado: "cola-pendiente" }
  | { estado: "error"; resultado: Resultado<unknown> };

export async function descargarMaestros(): Promise<ResultadoDescarga> {
  if ((await base.cola.count()) > 0) return { estado: "cola-pendiente" };

  const resultados = await Promise.all(ALMACENES.map((almacen) => llamar<Maestro[]>("GET", `/${almacen}`)));
  const fallido = resultados.find((resultado) => !resultado.ok);
  if (fallido) return { estado: "error", resultado: fallido };

  const tablas = ALMACENES.map((almacen) => base[almacen]);
  return base.transaction("rw", [...tablas, base.cola, base.meta], async () => {
    // Una operación encolada mientras se descargaba también gana: se descargará al vaciar la cola.
    if ((await base.cola.count()) > 0) return { estado: "cola-pendiente" } as const;
    for (const [indice, tabla] of tablas.entries()) {
      const resultado = resultados[indice];
      await tabla.clear();
      if (resultado?.ok) await tabla.bulkPut(resultado.datos);
    }
    await base.meta.put({ clave: CLAVE_DESCARGA, valor: new Date().toISOString() });
    return { estado: "descargados" } as const;
  });
}
