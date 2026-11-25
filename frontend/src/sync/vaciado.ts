// Envío de la cola de operaciones (T-40; REQ-06 y REQ-20; research R3 y R16).
//
// Se vacía en orden FIFO, una operación cada vez, al abrir la app, con el evento online, al encolar si hay red y
// cada 60 s mientras quede algo pendiente. Antes de cada envío se comprueba que la sesión es de la explotación de
// la base abierta. Una respuesta que se arregla sola (red, servidor, sesión) detiene el vaciado sin marcar nada; un
// rechazo se guarda con sus errores y se sigue con la siguiente. Sin Background Sync: igual en Android e iOS.
import { llamar, type Esquemas, type Resultado } from "../api/cliente";
import { baseAbierta, explotacionAbierta } from "../db/base";
import type { BaseLocal, ErrorOperacion, OperacionCola } from "../db/esquema";
import { aLocal, type TratamientoNuevo } from "./cola";
import { descargarMaestros } from "./maestros";

const CADA_MS = 60_000;

export type Motivo = "sin-conexion" | "servidor" | "sesion" | "otra-cuenta";
export type ResultadoVaciado = { estado: "vacia" } | { estado: "detenida"; motivo: Motivo };

const RUTAS = { crear_producto: "/productos", crear_tratamiento: "/tratamientos" } as const;

// --- Estado del último vaciado, para mostrarlo siempre ---

let ultimo: ResultadoVaciado = { estado: "vacia" };
const oyentes = new Set<() => void>();

export function ultimoVaciado(): ResultadoVaciado {
  return ultimo;
}

export function alCambiarVaciado(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

function anotar(resultado: ResultadoVaciado): ResultadoVaciado {
  ultimo = resultado;
  for (const oyente of oyentes) oyente();
  return resultado;
}

// --- Clasificación de las respuestas (R16) ---

type Clase = "aplicada" | "rechazada" | Motivo;

function clasificar(resultado: Resultado<unknown>): Clase {
  if (resultado.ok) return "aplicada";
  if (resultado.estado === 0) return "sin-conexion";
  if (resultado.estado === 401) return "sesion";
  if (resultado.estado === 408 || resultado.estado === 429 || resultado.estado >= 500) return "servidor";
  return "rechazada";
}

function erroresDe(resultado: Resultado<unknown>): ErrorOperacion[] {
  if (resultado.ok) return [];
  const errores = (resultado.error.errores ?? []).map(({ campo, mensaje }) => ({ campo, mensaje }));
  if (errores.length > 0) return errores;
  return [{ campo: "", mensaje: resultado.error.mensaje ?? "El servidor no ha aceptado este registro." }];
}

/** Comprueba que la sesión del servidor es de la explotación de la base; null si lo es. */
async function comprobarCuenta(explotacionId: string): Promise<Motivo | null> {
  const yo = await llamar<Esquemas["Cuenta"]>("GET", "/cuenta/yo");
  if (yo.ok) {
    // Un 200 que no es de la API (por ejemplo, la página de una wifi pública) no dice nada de la cuenta.
    const recibida = (yo.datos as Partial<Esquemas["Cuenta"]> | undefined)?.explotacionId;
    if (recibida === undefined) return "servidor";
    return recibida === explotacionId ? null : "otra-cuenta";
  }
  const clase = clasificar(yo);
  return clase === "aplicada" || clase === "rechazada" ? "servidor" : clase;
}

// --- Vaciado ---

/** Primera operación que se puede enviar: un tratamiento espera a que se creen sus productos (R16). */
async function siguiente(base: BaseLocal): Promise<OperacionCola | undefined> {
  const operaciones = await base.cola.orderBy("orden").toArray();
  const sinCrear = new Set(operaciones.filter((o) => o.tipo === "crear_producto").map((o) => o.entidadId));
  return operaciones.find((o) => {
    if (o.estado !== "pendiente" || !(o.tipo in RUTAS)) return false;
    if (o.tipo === "crear_producto") return true;
    return !(o.cuerpo as TratamientoNuevo).productos.some((linea) => sinCrear.has(linea.productoId));
  });
}

/** La API devuelve el registro creado; un 200 con otra cosa no demuestra que se haya guardado. */
function traeElRegistro(datos: unknown, operacion: OperacionCola): boolean {
  return (datos as { id?: unknown } | undefined)?.id === operacion.entidadId;
}

async function aplicar(base: BaseLocal, operacion: OperacionCola, datos: unknown): Promise<void> {
  await base.transaction("rw", [base.cola, base.tratamientos, base.productos], async () => {
    await base.cola.delete(operacion.orden as number);
    if (operacion.tipo === "crear_tratamiento") {
      await base.tratamientos.put(aLocal(datos as Esquemas["Tratamiento"], "sincronizado"));
    } else {
      await base.productos.put(datos as Esquemas["Producto"]);
    }
  });
}

async function rechazar(base: BaseLocal, operacion: OperacionCola, resultado: Resultado<unknown>): Promise<void> {
  await base.transaction("rw", [base.cola, base.tratamientos], async () => {
    await base.cola.put({
      ...operacion,
      estado: "rechazada",
      errores: erroresDe(resultado),
      codigoRechazo: resultado.estado,
    });
    if (operacion.tipo === "crear_tratamiento") {
      await base.tratamientos.update(operacion.entidadId, { estadoSincronizacion: "rechazado" });
    }
  });
}

/** Operaciones aplicadas en el vaciado en curso; con alguna, después se descargan los datos del servidor. */
let aplicadas = 0;

async function vaciar(): Promise<ResultadoVaciado> {
  // La misma base de principio a fin, aunque entre tanto cambie la sesión.
  const base = baseAbierta();
  const explotacionId = explotacionAbierta();
  if (base === null || explotacionId === null) return { estado: "vacia" };
  for (let operacion = await siguiente(base); operacion; operacion = await siguiente(base)) {
    const motivo = await comprobarCuenta(explotacionId);
    if (motivo !== null) return { estado: "detenida", motivo };
    const enviada = { ...operacion, intentos: operacion.intentos + 1 };
    await base.cola.put(enviada);
    const ruta = RUTAS[enviada.tipo as keyof typeof RUTAS];
    const resultado = await llamar("POST", ruta, enviada.cuerpo);
    const clase = clasificar(resultado);
    if (resultado.ok) {
      if (!traeElRegistro(resultado.datos, enviada)) return { estado: "detenida", motivo: "servidor" };
      await aplicar(base, enviada, resultado.datos);
      aplicadas += 1;
    } else if (clase === "rechazada") await rechazar(base, enviada, resultado);
    else if (clase !== "aplicada") return { estado: "detenida", motivo: clase };
  }
  return { estado: "vacia" };
}

let enCurso: Promise<ResultadoVaciado> | null = null;
let repetir = false;

async function vaciarHastaElFinal(): Promise<ResultadoVaciado> {
  let resultado: ResultadoVaciado;
  do {
    repetir = false;
    try {
      resultado = await vaciar();
    } catch {
      // La base se cerró a medias (cierre de sesión) o no se pudo escribir: la operación sigue en la cola y, si
      // el servidor la aplicó, el reintento lo reconoce (R4).
      resultado = { estado: "detenida", motivo: "servidor" };
    }
  } while (repetir);
  return anotar(resultado);
}

/** Vacía la cola. Si ya se está vaciando, se apunta a ese vaciado y pide otra vuelta por si hay algo nuevo. */
export function vaciarCola(): Promise<ResultadoVaciado> {
  if (enCurso !== null) {
    repetir = true;
    return enCurso;
  }
  enCurso = vaciarHastaElFinal().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

// --- Descarga de los datos del servidor tras vaciar la cola ---

/** Descarga las copias locales; antes comprueba la cuenta, para no guardar datos de otra (R16). */
export async function descargarDatos(): Promise<void> {
  const explotacionId = explotacionAbierta();
  if (explotacionId === null || (await comprobarCuenta(explotacionId)) !== null) return;
  if (explotacionAbierta() !== explotacionId) return;
  await descargarMaestros();
}

/** Vacía la cola y, si se ha enviado algo o se pide, descarga los datos del servidor. */
export async function sincronizar(descargar = false): Promise<void> {
  const resultado = await vaciarCola();
  const hayCambios = aplicadas > 0;
  if (resultado.estado !== "vacia" || !(descargar || hayCambios)) return;
  aplicadas = 0;
  try {
    await descargarDatos();
  } catch {
    // La base se cerró a medias: se descargará al volver a entrar.
  }
}

async function sincronizarSiHayPendientes(): Promise<void> {
  const pendientes = (await baseAbierta()?.cola.where("estado").equals("pendiente").count()) ?? 0;
  if (pendientes > 0) await sincronizar();
}

/** Pone en marcha los disparadores con la app abierta. Devuelve la función que los detiene. */
export function iniciarSincronizacion(): () => void {
  // Los datos sin enviar solo están en el dispositivo: se pide al navegador que no los borre (R3).
  void navigator.storage?.persist?.();
  const alVolverLaRed = () => void sincronizar(true);
  window.addEventListener("online", alVolverLaRed);
  const reloj = setInterval(() => void sincronizarSiHayPendientes(), CADA_MS);
  void sincronizar(true);
  return () => {
    window.removeEventListener("online", alVolverLaRed);
    clearInterval(reloj);
  };
}
