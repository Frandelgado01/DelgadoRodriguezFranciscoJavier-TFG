// @vitest-environment jsdom
// Pruebas de la cola sin conexión (T-39; REQ-06 y REQ-20; research R3, R4 y R16; SC-003).
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EstadoCola } from "../../src/componentes/EstadoCola";
import { abrirBase } from "../../src/db/base";
import type { BaseLocal, OperacionCola } from "../../src/db/esquema";
import { guardarSesion } from "../../src/sesion";
import {
  contarOperaciones,
  corregirProducto,
  corregirTratamiento,
  descartar,
  guardarProducto,
  guardarTratamiento,
  type ProductoNuevo,
  type TratamientoNuevo,
} from "../../src/sync/cola";
import { iniciarSincronizacion, sincronizar, vaciarCola } from "../../src/sync/vaciado";
import { vaciarDispositivo } from "../ayudas";

const A = { correo: "ana@example.com", explotacionId: "6d1f2a90-0000-4000-8000-00000000000a" };
const B = { correo: "luis@example.com", explotacionId: "6d1f2a90-0000-4000-8000-00000000000b" };
const PARCELA_ID = "11111111-0000-4000-8000-000000000001";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function json(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
}

interface Llamada {
  clave: string;
  cuerpo: Record<string, unknown> | undefined;
}

/** API falsa con las reglas de idempotencia del contrato. */
class Servidor {
  sesion: typeof A | null = A;
  conRed = true;
  productos = new Map<string, unknown>();
  tratamientos = new Map<string, Record<string, unknown>>();
  llamadas: Llamada[] = [];
  /** Respuesta a un POST en lugar de la normal; undefined deja pasar. */
  antes: (llamada: Llamada) => Response | Error | undefined = () => undefined;
  /** Pierde la respuesta después de aplicar el POST, como un corte de cobertura. */
  perderRespuesta = 0;

  constructor() {
    vi.stubGlobal("fetch", vi.fn(async (url: string, opciones: RequestInit) => this.atender(url, opciones)));
  }

  envios(): Llamada[] {
    return this.llamadas.filter((l) => l.clave.startsWith("POST"));
  }

  private atender(url: string, opciones: RequestInit): Response {
    const llamada: Llamada = {
      clave: `${opciones.method} ${url.replace(/^\/api/, "").replace(/\?.*$/, "")}`,
      cuerpo: opciones.body ? (JSON.parse(String(opciones.body)) as Record<string, unknown>) : undefined,
    };
    this.llamadas.push(llamada);
    if (!this.conRed) throw new TypeError("Failed to fetch");
    if (this.sesion === null) return json(401, { mensaje: "Inicia sesión para continuar." });
    if (llamada.clave === "GET /cuenta/yo") return json(200, this.sesion);
    if (llamada.clave === "GET /tratamientos") {
      const elementos = [...this.tratamientos.values()];
      return json(200, { elementos, total: elementos.length });
    }
    if (llamada.clave === "GET /productos") return json(200, [...this.productos.values()]);
    if (llamada.clave.startsWith("GET")) return json(200, []);
    const forzada = this.antes(llamada);
    if (forzada instanceof Error) throw forzada;
    if (forzada) return forzada;
    const respuesta = this.crear(llamada);
    if (this.perderRespuesta > 0) {
      this.perderRespuesta -= 1;
      throw new TypeError("Failed to fetch");
    }
    return respuesta;
  }

  private crear({ clave, cuerpo }: Llamada): Response {
    const id = String(cuerpo?.["id"]);
    const almacen = clave === "POST /productos" ? this.productos : this.tratamientos;
    const existia = almacen.has(id);
    const guardado =
      clave === "POST /productos"
        ? { ...cuerpo, estado: "activa", fechaBaja: null }
        : { ...cuerpo, version: 1, enConflicto: false };
    if (!existia) (almacen as Map<string, unknown>).set(id, guardado);
    return json(existia ? 200 : 201, almacen.get(id));
  }
}

let servidor: Servidor;
let base: BaseLocal;
let detener: (() => void) | null = null;

function tratamiento(cambios: Partial<TratamientoNuevo> = {}): TratamientoNuevo {
  return {
    id: crypto.randomUUID(),
    registradoEn: "2026-03-15T10:30:00.000Z",
    fecha: "2026-03-15",
    problema: "Mildiu",
    aplicadorId: "22222222-0000-4000-8000-000000000001",
    asesorId: null,
    equipoId: "33333333-0000-4000-8000-000000000001",
    parcelas: [
      {
        parcelaId: PARCELA_ID,
        superficieTratada: 3.5,
        cultivoEspecie: "Vitis vinifera",
        cultivoVariedad: "Airén",
        productoSemilla: null,
      },
    ],
    productos: [{ productoId: "44444444-0000-4000-8000-000000000001", cantidad: 2, unidadMedida: "kg" }],
    eficacia: null,
    observaciones: null,
    ...cambios,
  };
}

function producto(cambios: Partial<ProductoNuevo> = {}): ProductoNuevo {
  return { id: crypto.randomUUID(), nombreComercial: "Cobre Nordox 75 WG", numeroRegistro: "ES-00123", ...cambios };
}

function conProducto(p: ProductoNuevo) {
  return tratamiento({ productos: [{ productoId: p.id, cantidad: 2, unidadMedida: "kg" }] });
}

const cola = (): Promise<OperacionCola[]> => base.cola.orderBy("orden").toArray();
const estado = async (id: string) => (await base.tratamientos.get(id))?.estadoSincronizacion;

/** Guarda sin red, para decidir después cuándo se envía. */
async function sinRed(accion: () => Promise<unknown>) {
  servidor.conRed = false;
  await accion();
  await vaciarCola();
  servidor.conRed = true;
  servidor.llamadas = [];
}

const rechazo422 = (campo: string, mensaje: string) => json(422, { errores: [{ campo, mensaje, req: "REQ-17" }] });

beforeEach(async () => {
  await vaciarDispositivo();
  servidor = new Servidor();
  await guardarSesion(A);
  base = abrirBase(A.explotacionId);
});

afterEach(async () => {
  detener?.();
  detener = null;
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  servidor.conRed = false;
  await sincronizar(true); // espera a que acabe una sincronización a medias antes de cerrar la base
  vi.unstubAllGlobals();
});

describe("guardar sin conexión (REQ-06, escenario 5)", () => {
  it("el tratamiento queda pendiente y su operación en la cola con su propio UUID", async () => {
    servidor.conRed = false;
    const t = tratamiento();
    await guardarTratamiento(t);

    const local = await base.tratamientos.get(t.id);
    expect(local).toMatchObject({
      ...t,
      estadoSincronizacion: "pendiente",
      parcelaIds: [PARCELA_ID],
      productoIds: ["44444444-0000-4000-8000-000000000001"],
    });
    const [operacion] = await cola();
    expect(operacion).toMatchObject({
      tipo: "crear_tratamiento",
      entidadId: t.id,
      versionBase: null,
      cuerpo: t,
      estado: "pendiente",
      errores: [],
    });
    expect(operacion?.idOperacion).toMatch(UUID);
    expect(operacion?.idOperacion).not.toBe(t.id);
  });

  it("el producto nuevo se puede elegir enseguida y su alta queda en la cola", async () => {
    servidor.conRed = false;
    const p = producto();
    await guardarProducto(p);
    expect(await base.productos.get(p.id)).toEqual({ ...p, estado: "activa", fechaBaja: null });
    expect(await cola()).toMatchObject([{ tipo: "crear_producto", entidadId: p.id, cuerpo: p, estado: "pendiente" }]);
  });

  it("al volver la red se envía, queda sincronizado y la cola vacía", async () => {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.envios()).toEqual([{ clave: "POST /tratamientos", cuerpo: t }]);
    expect(await estado(t.id)).toBe("sincronizado");
    expect((await base.tratamientos.get(t.id))?.["version"]).toBe(1);
    expect(await cola()).toEqual([]);
  });
});

describe("vaciado en orden (REQ-06; R3)", () => {
  it("envía en orden FIFO, una operación cada vez", async () => {
    const p = producto();
    const t1 = conProducto(p);
    const t2 = tratamiento();
    await sinRed(async () => {
      await guardarProducto(p);
      await guardarTratamiento(t1);
      await guardarTratamiento(t2);
    });
    await vaciarCola();
    expect(servidor.envios().map((l) => l.cuerpo?.["id"])).toEqual([p.id, t1.id, t2.id]);
  });

  it("dos vaciados a la vez no envían dos veces lo mismo", async () => {
    await sinRed(() => guardarTratamiento(tratamiento()));
    await Promise.all([vaciarCola(), vaciarCola()]);
    expect(servidor.envios()).toHaveLength(1);
  });

  it("un fallo de red detiene el vaciado sin perder nada", async () => {
    const uno = tratamiento();
    const dos = tratamiento();
    await sinRed(async () => {
      await guardarTratamiento(uno);
      await guardarTratamiento(dos);
    });
    servidor.antes = (l) => (l.cuerpo?.["id"] === dos.id ? new TypeError("Failed to fetch") : undefined);
    expect(await vaciarCola()).toEqual({ estado: "detenida", motivo: "sin-conexion" });
    expect(await estado(uno.id)).toBe("sincronizado");
    expect(await estado(dos.id)).toBe("pendiente");
    expect((await cola()).map((o) => o.entidadId)).toEqual([dos.id]);

    servidor.antes = () => undefined;
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.tratamientos.size).toBe(2);
  });

  it("un reintento de una creación ya aplicada (200) no duplica nada", async () => {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    servidor.perderRespuesta = 1;
    expect(await vaciarCola()).toEqual({ estado: "detenida", motivo: "sin-conexion" });
    expect(await estado(t.id)).toBe("pendiente");
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.tratamientos.size).toBe(1);
    expect(await base.tratamientos.count()).toBe(1);
    expect(await estado(t.id)).toBe("sincronizado");
  });

  it.each([
    ["una página web", () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } })],
    ["otro registro", () => json(200, { id: "otro" })],
    ["un cuerpo cortado", () => new Response('{"id": "', { status: 201, headers: { "Content-Type": "application/json" } })],
  ])("una respuesta correcta que no trae el registro (%s) no se da por aplicada", async (_caso, respuesta) => {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    servidor.antes = respuesta;
    expect((await vaciarCola()).estado).toBe("detenida");
    expect(await estado(t.id)).toBe("pendiente");
    expect(await cola()).toMatchObject([{ entidadId: t.id, estado: "pendiente" }]);
  });

  it("un 401 conserva la cola y pide iniciar sesión", async () => {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    servidor.sesion = null;
    expect(await vaciarCola()).toEqual({ estado: "detenida", motivo: "sesion" });
    expect(servidor.envios()).toEqual([]);
    expect(await estado(t.id)).toBe("pendiente");
    expect(await cola()).toHaveLength(1);
  });

  it("un 401 al enviar también conserva la cola sin marcar la operación", async () => {
    await sinRed(() => guardarTratamiento(tratamiento()));
    servidor.antes = () => json(401, { mensaje: "Inicia sesión para continuar." });
    expect(await vaciarCola()).toEqual({ estado: "detenida", motivo: "sesion" });
    expect(await cola()).toMatchObject([{ estado: "pendiente", errores: [] }]);
  });

  it("SC-003: 20 tratamientos sin conexión se sincronizan sin pérdida ni duplicados", async () => {
    const todos = Array.from({ length: 20 }, () => tratamiento());
    await sinRed(async () => {
      for (const t of todos) await guardarTratamiento(t);
    });
    expect(await contarOperaciones()).toEqual({ pendientes: 20, rechazadas: 0 });
    // Con cortes: se pierden respuestas por el camino y se reintenta.
    for (const fallo of [1, 1, 1]) {
      servidor.perderRespuesta = fallo;
      await vaciarCola();
    }
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect([...servidor.tratamientos.keys()].sort()).toEqual(todos.map((t) => t.id).sort());
    expect(await base.tratamientos.where("estadoSincronizacion").equals("sincronizado").count()).toBe(20);
    expect(await contarOperaciones()).toEqual({ pendientes: 0, rechazadas: 0 });
  });
});

describe("disparadores (REQ-06; R3)", () => {
  it("al abrir la app", async () => {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    detener = iniciarSincronizacion();
    await waitFor(async () => expect(await estado(t.id)).toBe("sincronizado"));
  });

  it("con el evento online", async () => {
    const t = tratamiento();
    servidor.conRed = false;
    detener = iniciarSincronizacion();
    await guardarTratamiento(t);
    await vaciarCola();
    servidor.conRed = true;
    window.dispatchEvent(new Event("online"));
    await waitFor(async () => expect(await estado(t.id)).toBe("sincronizado"));
  });

  it("al encolar si hay red", async () => {
    const t = tratamiento();
    await guardarTratamiento(t);
    await waitFor(async () => expect(await estado(t.id)).toBe("sincronizado"));
  });

  it("al encolar sin red no lo intenta", async () => {
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    await guardarTratamiento(tratamiento());
    expect(servidor.llamadas).toEqual([]);
  });

  it("cada 60 s mientras la cola no está vacía", async () => {
    const cada: { accion: () => void; ms: number }[] = [];
    vi.spyOn(globalThis, "setInterval").mockImplementation(((accion: () => void, ms: number) => {
      cada.push({ accion, ms });
      return 0;
    }) as unknown as typeof setInterval);
    const t = tratamiento();
    servidor.conRed = false;
    detener = iniciarSincronizacion();
    await guardarTratamiento(t);
    await vaciarCola();
    servidor.conRed = true;
    const reloj = cada.find(({ ms }) => ms === 60_000);
    expect(reloj).toBeDefined();
    reloj?.accion();
    vi.mocked(globalThis.setInterval).mockRestore();
    await waitFor(async () => expect(await estado(t.id)).toBe("sincronizado"));
    await sincronizar(true);

    servidor.llamadas = [];
    reloj?.accion();
    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(servidor.llamadas).toEqual([]);
  });

  it("dos sincronizaciones seguidas no descargan a la vez, y la segunda espera a la primera", async () => {
    let enMarcha = 0;
    let aLaVez = 0;
    const atender = globalThis.fetch;
    vi.stubGlobal("fetch", async (url: string, opciones: RequestInit) => {
      const descarga = url === "/api/parcelas";
      if (descarga) enMarcha += 1;
      aLaVez = Math.max(aLaVez, enMarcha);
      await new Promise((resolver) => setTimeout(resolver, 10));
      if (descarga) enMarcha -= 1;
      return atender(url, opciones);
    });
    const primera = sincronizar(true);
    await sincronizar(true);
    expect(aLaVez).toBe(1);
    servidor.llamadas = [];
    await primera;
    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(servidor.llamadas).toEqual([]);
  });

  it("al detenerla deja de responder a los disparadores", async () => {
    detener = iniciarSincronizacion();
    detener();
    await sincronizar();
    await sinRed(() => guardarTratamiento(tratamiento()));
    window.dispatchEvent(new Event("online"));
    await new Promise((resolver) => setTimeout(resolver, 50));
    expect(servidor.envios()).toEqual([]);
  });

  it("pide almacenamiento persistente para que el navegador no borre los datos", async () => {
    const persistir = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window.navigator, "storage", { value: { persist: persistir }, configurable: true });
    detener = iniciarSincronizacion();
    expect(persistir).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(window.navigator, "storage");
  });
});

describe("cuentas (REQ-06 y REQ-20, escenario 8; R16)", () => {
  it("antes de cada envío pide la cuenta de la sesión", async () => {
    await sinRed(async () => {
      await guardarTratamiento(tratamiento());
      await guardarTratamiento(tratamiento());
    });
    await vaciarCola();
    const relevantes = servidor.llamadas
      .map((l) => l.clave)
      .filter((clave) => clave === "GET /cuenta/yo" || clave.startsWith("POST"));
    expect(relevantes.slice(0, 4)).toEqual([
      "GET /cuenta/yo",
      "POST /tratamientos",
      "GET /cuenta/yo",
      "POST /tratamientos",
    ]);
  });

  it("si la sesión es de otra explotación no envía nada, conserva la cola y pide entrar", async () => {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    servidor.sesion = B;
    expect(await vaciarCola()).toEqual({ estado: "detenida", motivo: "otra-cuenta" });
    expect(servidor.envios()).toEqual([]);
    expect(await estado(t.id)).toBe("pendiente");
    expect(await cola()).toHaveLength(1);
  });

  it("si la cuenta cambia entre dos envíos, el segundo no sale", async () => {
    const uno = tratamiento();
    const dos = tratamiento();
    await sinRed(async () => {
      await guardarTratamiento(uno);
      await guardarTratamiento(dos);
    });
    servidor.antes = () => {
      servidor.sesion = B;
      return undefined;
    };
    expect(await vaciarCola()).toEqual({ estado: "detenida", motivo: "otra-cuenta" });
    expect([...servidor.tratamientos.keys()]).toEqual([uno.id]);
  });

  it("los registros de A no se envían con la cuenta B y sí cuando A vuelve a entrar", async () => {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    servidor.sesion = B;
    await guardarSesion(B);
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.envios()).toEqual([]);

    servidor.sesion = A;
    await guardarSesion(A);
    base = abrirBase(A.explotacionId);
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect([...servidor.tratamientos.keys()]).toEqual([t.id]);
  });

  it("sin sesión en el dispositivo no hace nada", async () => {
    await vaciarDispositivo();
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.llamadas).toEqual([]);
    await guardarSesion(A);
    base = abrirBase(A.explotacionId);
  });
});

describe("rechazos (REQ-06, escenarios 9 y 10; R16)", () => {
  async function conRechazado(respuesta: () => Response = () => rechazo422("parcelas.0.parcelaId", "Está de baja.")) {
    const malo = tratamiento();
    const bueno = tratamiento();
    await sinRed(async () => {
      await guardarTratamiento(malo);
      await guardarTratamiento(bueno);
    });
    servidor.antes = (l) => (l.cuerpo?.["id"] === malo.id ? respuesta() : undefined);
    await vaciarCola();
    return { malo, bueno };
  }

  it("escenario 9: un 422 deja la operación rechazada con sus errores y se envía la siguiente", async () => {
    const { malo, bueno } = await conRechazado();
    expect(await estado(malo.id)).toBe("rechazado");
    expect(await estado(bueno.id)).toBe("sincronizado");
    expect(await cola()).toMatchObject([
      {
        entidadId: malo.id,
        estado: "rechazada",
        errores: [{ campo: "parcelas.0.parcelaId", mensaje: "Está de baja." }],
        codigoRechazo: 422,
      },
    ]);
    expect(await contarOperaciones()).toEqual({ pendientes: 0, rechazadas: 1 });
  });

  it("una operación rechazada no se vuelve a enviar sola", async () => {
    await conRechazado();
    servidor.llamadas = [];
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.envios()).toEqual([]);
  });

  it.each([
    [409, { mensaje: "Ya existe otro tratamiento con este identificador." }],
    [404, {}],
    [415, { mensaje: "Solo JSON." }],
  ])("un %s al crear también es un rechazo, con un mensaje llano", async (codigo, cuerpo) => {
    const { malo, bueno } = await conRechazado(() => json(codigo, cuerpo));
    expect(await estado(malo.id)).toBe("rechazado");
    expect(await estado(bueno.id)).toBe("sincronizado");
    const [operacion] = await cola();
    expect(operacion?.codigoRechazo).toBe(codigo);
    expect(operacion?.errores).toHaveLength(1);
    expect(operacion?.errores[0]?.campo).toBe("");
    expect(operacion?.errores[0]?.mensaje).toBeTruthy();
  });

  it.each([408, 429, 500, 502, 503])("un %s detiene el vaciado sin marcar nada", async (codigo) => {
    const { malo, bueno } = await conRechazado(() => json(codigo, { mensaje: "x" }));
    expect(await estado(malo.id)).toBe("pendiente");
    expect(await estado(bueno.id)).toBe("pendiente");
    expect((await cola()).map((o) => o.estado)).toEqual(["pendiente", "pendiente"]);
    expect(await vaciarCola()).toEqual({ estado: "detenida", motivo: "servidor" });
  });

  it("escenario 10: corregir lo vuelve a poner pendiente con el mismo id y se envía", async () => {
    const { malo } = await conRechazado();
    servidor.antes = () => undefined;
    const [antes] = await cola();
    const id = await corregirTratamiento(malo.id, { ...malo, problema: "Oídio" });
    expect(id).toBe(malo.id);
    await waitFor(async () => expect(await estado(malo.id)).toBe("sincronizado"));
    expect(servidor.tratamientos.get(malo.id)).toMatchObject({ problema: "Oídio" });
    expect(antes?.estado).toBe("rechazada");
    expect(await cola()).toEqual([]);
  });

  it("escenario 10: al corregir sin conexión queda pendiente y sin errores", async () => {
    const { malo } = await conRechazado();
    servidor.conRed = false;
    await corregirTratamiento(malo.id, { ...malo, problema: "Oídio" });
    await vaciarCola();
    const [operacion] = await cola();
    expect(operacion).toMatchObject({ entidadId: malo.id, estado: "pendiente", errores: [] });
    expect(operacion?.codigoRechazo).toBeUndefined();
    expect(await estado(malo.id)).toBe("pendiente");
    expect((await base.tratamientos.get(malo.id))?.["problema"]).toBe("Oídio");
  });

  it("si el rechazo fue un 409 al crear, corregir genera un id nuevo", async () => {
    const { malo } = await conRechazado(() => json(409, { mensaje: "Ya existe." }));
    const id = await corregirTratamiento(malo.id, { ...malo, problema: "Oídio" });
    expect(id).toMatch(UUID);
    expect(id).not.toBe(malo.id);
    await waitFor(async () => expect(await estado(id)).toBe("sincronizado"));
    expect(await base.tratamientos.get(malo.id)).toBeUndefined();
    expect(servidor.tratamientos.get(id)).toMatchObject({ id, problema: "Oídio" });
  });

  it("no se puede corregir como rechazado un tratamiento que no lo está", async () => {
    const t = tratamiento();
    await guardarTratamiento(t);
    await waitFor(async () => expect(await estado(t.id)).toBe("sincronizado"));
    await expect(corregirTratamiento(t.id, t)).rejects.toThrow();
  });

  it("escenario 10: descartar borra la operación y su copia, y nunca llega al servidor", async () => {
    const { malo, bueno } = await conRechazado();
    servidor.llamadas = [];
    expect(await descartar(malo.id)).toEqual({ ok: true });
    expect(await base.tratamientos.get(malo.id)).toBeUndefined();
    expect(await cola()).toEqual([]);
    expect(servidor.envios()).toEqual([]);
    expect([...servidor.tratamientos.keys()]).toEqual([bueno.id]);
  });

  it("solo se descarta lo rechazado: lo pendiente y lo enviado se quedan", async () => {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    expect((await descartar(t.id)).ok).toBe(false);
    expect(await cola()).toHaveLength(1);
    await vaciarCola();
    expect((await descartar(t.id)).ok).toBe(false);
    expect(await estado(t.id)).toBe("sincronizado");
  });
});

describe("otra pestaña cambia la cola durante el envío (REQ-06, escenario 10)", () => {
  /** Hace algo mientras la petición está en curso, como lo haría otra pestaña, y después responde. */
  function durante(clave: string, accion: () => Promise<unknown>) {
    const atender = globalThis.fetch;
    let hecho = false;
    vi.stubGlobal("fetch", async (url: string, opciones: RequestInit) => {
      if (!hecho && `${opciones.method} ${url}` === clave) {
        hecho = true;
        await accion();
      }
      return atender(url, opciones);
    });
  }

  async function encolada() {
    const t = tratamiento();
    await sinRed(() => guardarTratamiento(t));
    return t;
  }

  it("REQ-06: si la quita mientras se comprueba la cuenta, no se envía ni se vuelve a crear", async () => {
    await encolada();
    durante("GET /api/cuenta/yo", () => base.cola.clear());
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.envios()).toEqual([]);
    expect(await cola()).toEqual([]);
  });

  it("REQ-06: si la rechaza mientras se comprueba la cuenta, no se envía y conserva su rechazo", async () => {
    await encolada();
    const errores = [{ campo: "fecha", mensaje: "La fecha no es válida." }];
    durante("GET /api/cuenta/yo", () => base.cola.toCollection().modify({ estado: "rechazada", errores }));
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.envios()).toEqual([]);
    expect(await cola()).toMatchObject([{ estado: "rechazada", errores }]);
  });

  it("REQ-06: si la cambia mientras se comprueba la cuenta, se envía lo que hay ahora", async () => {
    const t = await encolada();
    const cambiado = { ...t, problema: "Oídio" };
    durante("GET /api/cuenta/yo", () => base.cola.toCollection().modify({ cuerpo: cambiado }));
    await vaciarCola();
    expect(servidor.envios()).toEqual([{ clave: "POST /tratamientos", cuerpo: cambiado }]);
  });

  it("REQ-06: si la quita durante el envío, un rechazo no la vuelve a crear", async () => {
    const t = await encolada();
    servidor.antes = () => rechazo422("fecha", "La fecha no es válida.");
    durante("POST /api/tratamientos", async () => {
      await base.cola.clear();
      await base.tratamientos.update(t.id, { estadoSincronizacion: "sincronizado" });
    });
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(await cola()).toEqual([]);
    expect(await estado(t.id)).toBe("sincronizado");
  });

  it("REQ-06: si otra pestaña ya la marcó rechazada durante el envío, se conserva aquel rechazo", async () => {
    await encolada();
    const errores = [{ campo: "problema", mensaje: "El de la otra pestaña." }];
    servidor.antes = () => rechazo422("fecha", "La fecha no es válida.");
    durante("POST /api/tratamientos", () => base.cola.toCollection().modify({ estado: "rechazada", errores }));
    await vaciarCola();
    expect(await cola()).toMatchObject([{ estado: "rechazada", errores }]);
  });
});

describe("productos rechazados (REQ-06, REQ-16; R16)", () => {
  async function conAltaRechazada(respuesta: () => Response) {
    const p = producto();
    const t = conProducto(p);
    const otro = tratamiento();
    await sinRed(async () => {
      await guardarProducto(p);
      await guardarTratamiento(t);
      await guardarTratamiento(otro);
    });
    servidor.antes = (l) => (l.clave === "POST /productos" && l.cuerpo?.["id"] === p.id ? respuesta() : undefined);
    await vaciarCola();
    return { p, t, otro };
  }
  const mal = () => rechazo422("numeroRegistro", "Puede tener como mucho 30 caracteres.");

  it("un tratamiento que usa un producto con el alta rechazada no se envía y los demás sí", async () => {
    const { t, otro } = await conAltaRechazada(mal);
    expect([...servidor.tratamientos.keys()]).toEqual([otro.id]);
    expect(await estado(t.id)).toBe("pendiente");
    expect(await contarOperaciones()).toEqual({ pendientes: 1, rechazadas: 1 });
  });

  it("al corregir el alta se envían el producto y el tratamiento", async () => {
    const { p, t } = await conAltaRechazada(mal);
    servidor.antes = () => undefined;
    const id = await corregirProducto(p.id, { nombreComercial: "Cobre", numeroRegistro: "ES-9" });
    expect(id).toBe(p.id);
    await waitFor(async () => expect(await estado(t.id)).toBe("sincronizado"));
    expect(servidor.productos.get(p.id)).toMatchObject({ numeroRegistro: "ES-9" });
    expect(await base.productos.get(p.id)).toMatchObject({ numeroRegistro: "ES-9", nombreComercial: "Cobre" });
  });

  it("si el alta se rechazó con un 409, el tratamiento pasa a usar el id nuevo del producto", async () => {
    const { p, t } = await conAltaRechazada(() => json(409, { mensaje: "Ya existe." }));
    const id = await corregirProducto(p.id, { nombreComercial: "Cobre", numeroRegistro: "ES-9" });
    expect(id).not.toBe(p.id);
    await waitFor(async () => expect(await estado(t.id)).toBe("sincronizado"));
    const enviado = servidor.tratamientos.get(t.id) as { productos: { productoId: string }[] };
    expect(enviado.productos.map((linea) => linea.productoId)).toEqual([id]);
    expect((await base.tratamientos.get(t.id))?.productoIds).toEqual([id]);
    expect(await base.productos.get(p.id)).toBeUndefined();
  });

  it("no se descarta un producto que usa un tratamiento sin enviar, ni siquiera rechazado", async () => {
    const { p, t } = await conAltaRechazada(mal);
    const resultado = await descartar(p.id);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toMatch(/tratamiento/);
    expect(await base.productos.get(p.id)).toBeDefined();
    expect(await cola()).toHaveLength(2);
    expect(await estado(t.id)).toBe("pendiente");
  });

  it("REQ-06: se descarta el tratamiento que espera al producto rechazado y después el producto", async () => {
    const { p, t, otro } = await conAltaRechazada(mal);
    servidor.llamadas = [];
    expect(await descartar(t.id)).toEqual({ ok: true });
    expect(await base.tratamientos.get(t.id)).toBeUndefined();
    expect(await descartar(p.id)).toEqual({ ok: true });
    expect(await base.productos.get(p.id)).toBeUndefined();
    expect(await cola()).toEqual([]);
    expect(servidor.envios()).toEqual([]);
    expect([...servidor.tratamientos.keys()]).toEqual([otro.id]);
  });

  it("REQ-06: el que espera se corrige cambiando de producto, conserva su id y se envía", async () => {
    const { p, t, otro } = await conAltaRechazada(mal);
    const id = await corregirTratamiento(t.id, { ...tratamiento(), id: t.id, problema: "Con otro producto" });
    expect(id).toBe(t.id);
    await waitFor(async () => expect(await estado(t.id)).toBe("sincronizado"));
    expect(servidor.tratamientos.get(t.id)).toMatchObject({ id: t.id, problema: "Con otro producto" });
    expect([...servidor.tratamientos.keys()].sort()).toEqual([otro.id, t.id].sort());
    // El producto sigue rechazado y ya se puede descartar.
    expect(await cola()).toMatchObject([{ entidadId: p.id, estado: "rechazada" }]);
    expect(await descartar(p.id)).toEqual({ ok: true });
  });

  it("REQ-06: al corregirlo sin cambiar de producto sigue pendiente", async () => {
    const { p, t } = await conAltaRechazada(mal);
    await corregirTratamiento(t.id, { ...conProducto(p), id: t.id, problema: "Oídio" });
    await vaciarCola();
    expect(await estado(t.id)).toBe("pendiente");
    expect((await cola()).find((o) => o.entidadId === t.id)).toMatchObject({
      estado: "pendiente",
      cuerpo: { problema: "Oídio" },
    });
  });

  it("REQ-06: el que espera a un producto solo pendiente no se puede corregir ni descartar", async () => {
    const p = producto();
    const t = conProducto(p);
    await sinRed(async () => {
      await guardarProducto(p);
      await guardarTratamiento(t);
    });
    expect((await descartar(t.id)).ok).toBe(false);
    await expect(corregirTratamiento(t.id, t)).rejects.toThrow();
    expect(await cola()).toHaveLength(2);
  });

  it("se descarta si ningún tratamiento sin enviar lo usa", async () => {
    const p = producto();
    await sinRed(() => guardarProducto(p));
    servidor.antes = mal;
    await vaciarCola();
    expect(await descartar(p.id)).toEqual({ ok: true });
    expect(await base.productos.get(p.id)).toBeUndefined();
    expect(await cola()).toEqual([]);
  });

  it("un tratamiento corregido con un producto dado de alta después espera a que se cree", async () => {
    const malo = tratamiento();
    await sinRed(() => guardarTratamiento(malo));
    servidor.antes = () => rechazo422("productos.0.productoId", "Está de baja.");
    await vaciarCola();
    const p = producto();
    servidor.antes = () => undefined;
    await sinRed(async () => {
      await guardarProducto(p);
      await corregirTratamiento(malo.id, { ...conProducto(p), id: malo.id });
    });
    expect(await vaciarCola()).toEqual({ estado: "vacia" });
    expect(servidor.envios().map((l) => l.clave)).toEqual(["POST /productos", "POST /tratamientos"]);
  });
});

describe("contador siempre visible (REQ-06; R16)", () => {
  it("distingue los pendientes y los rechazados y se actualiza", async () => {
    render(createElement(EstadoCola));
    expect(await screen.findByText("Todo enviado")).toBeTruthy();
    const malo = tratamiento();
    await sinRed(async () => {
      await guardarTratamiento(malo);
      await guardarTratamiento(tratamiento());
      await guardarTratamiento(tratamiento());
    });
    expect(await screen.findByText("3 registros pendientes de enviar")).toBeTruthy();

    servidor.antes = (l) =>
      l.cuerpo?.["id"] === malo.id ? rechazo422("fecha", "La fecha no es válida.") : new TypeError("Failed to fetch");
    await vaciarCola();
    expect(await screen.findByText("2 registros pendientes de enviar")).toBeTruthy();
    expect(screen.getByText("1 registro rechazado")).toBeTruthy();
  });

  it("pide entrar cuando la sesión ha caducado o es de otra cuenta, sin perder la cola", async () => {
    render(createElement(EstadoCola));
    await sinRed(() => guardarTratamiento(tratamiento()));
    servidor.sesion = null;
    await vaciarCola();
    expect(await screen.findByText(/Vuelve a entrar para enviar/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe("/entrar");

    servidor.sesion = B;
    await vaciarCola();
    expect(await screen.findByText(/otra cuenta/)).toBeTruthy();

    servidor.sesion = A;
    await vaciarCola();
    expect(await screen.findByText("Todo enviado")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Entrar" })).toBeNull();
  });
});
