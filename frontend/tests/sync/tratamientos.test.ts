// @vitest-environment jsdom
// Pruebas de la descarga de los tratamientos a IndexedDB (T-82; REQ-06; research R3 y R16, data-model).
//
// Al entrar y tras vaciar la cola se descargan todas las páginas y se sustituyen las copias locales, salvo las que
// tienen operaciones en la cola. Una cola con solo operaciones rechazadas no impide descargar los datos maestros.
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { abrirBase, baseAbierta } from "../../src/db/base";
import type { BaseLocal, EstadoOperacion } from "../../src/db/esquema";
import { CerrarSesion } from "../../src/paginas/cuenta/CerrarSesion";
import { CrearCuenta } from "../../src/paginas/cuenta/CrearCuenta";
import { Entrar } from "../../src/paginas/cuenta/Entrar";
import { Explotacion } from "../../src/paginas/explotacion/Explotacion";
import { guardarSesion } from "../../src/sesion";
import { guardarTratamiento, type TratamientoNuevo } from "../../src/sync/cola";
import { descargarMaestros } from "../../src/sync/maestros";
import { descargarTratamientos } from "../../src/sync/tratamientos";
import { sincronizar, vaciarCola } from "../../src/sync/vaciado";
import { vaciarDispositivo } from "../ayudas";

const CUENTA = { correo: "ana@example.com", explotacionId: "6d1f2a90-0000-4000-8000-000000000001" };
const FRASE = "una frase larga de ejemplo";
const PARCELA = { id: "par-1", numeroOrden: 1, nombre: "Viña Grande", superficie: 4.2, estado: "activa" as const };
const PERSONA = { id: "per-1", nombre: "Juan Pérez", tipo: "aplicador", numeroCarne: "CM-1", estado: "activa" as const };
const EQUIPO = { id: "equ-1", descripcion: "Pulverizador", estado: "activa" as const };
const PRODUCTO = { id: "pro-1", nombreComercial: "Cobre", numeroRegistro: "ES-1", estado: "activa" as const };

function json(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
}

function nuevo(id: string, cambios: Partial<TratamientoNuevo> = {}): TratamientoNuevo {
  return {
    id,
    registradoEn: "2026-03-15T10:30:00Z",
    fecha: "2026-03-15",
    problema: "Mildiu",
    aplicadorId: PERSONA.id,
    asesorId: null,
    equipoId: EQUIPO.id,
    parcelas: [
      { parcelaId: PARCELA.id, superficieTratada: 3.5, cultivoEspecie: "Vitis", cultivoVariedad: "Airén", productoSemilla: null },
    ],
    productos: [{ productoId: PRODUCTO.id, cantidad: 2, unidadMedida: "kg" }],
    eficacia: null,
    observaciones: null,
    ...cambios,
  };
}

const delServidor = (id: string, cambios: Partial<TratamientoNuevo> = {}) => ({
  ...nuevo(id, cambios),
  version: 1,
  enConflicto: false,
});

type Guardado = ReturnType<typeof delServidor>;

/** API falsa con la lista por páginas de T-81 y los maestros con su estado. */
class Servidor {
  tratamientos: Guardado[] = [];
  maestros: Record<string, { id: string; estado: string }[]> = {
    parcelas: [PARCELA],
    personas: [PERSONA],
    equipos: [EQUIPO],
    productos: [PRODUCTO],
  };
  llamadas: string[] = [];
  fallos: Record<string, Response | Error> = {};
  /** Se ejecuta en cada petición, con la respuesta ya preparada y antes de darla. */
  alPedir: (clave: string) => Promise<void> = async () => undefined;

  constructor() {
    vi.stubGlobal("fetch", vi.fn(async (url: string, opciones: RequestInit) => this.atender(url, opciones)));
  }

  private async atender(url: string, opciones: RequestInit): Promise<Response> {
    const clave = `${opciones.method} ${url.replace(/^\/api/, "")}`;
    this.llamadas.push(clave);
    const fallo = this.fallos[clave];
    if (fallo instanceof Error) throw fallo;
    if (fallo) return fallo.clone();
    const respuesta = this.responder(url, opciones);
    await this.alPedir(clave);
    return respuesta;
  }

  private responder(url: string, opciones: RequestInit): Response {
    const direccion = new URL(url, "https://localhost");
    const ruta = direccion.pathname.replace(/^\/api\//, "");
    if (ruta === "sesion") return new Response(null, { status: 204 });
    if (ruta === "cuenta" || ruta === "cuenta/yo") return json(200, CUENTA);
    if (ruta === "tratamientos" && opciones.method === "POST") {
      const guardado = { ...(JSON.parse(String(opciones.body)) as TratamientoNuevo), version: 1, enConflicto: false };
      this.tratamientos.unshift(guardado);
      return json(201, guardado);
    }
    if (ruta === "tratamientos") {
      const pagina = Number(direccion.searchParams.get("pagina"));
      const tamano = Number(direccion.searchParams.get("tamano"));
      return json(200, {
        elementos: this.tratamientos.slice((pagina - 1) * tamano, pagina * tamano),
        total: this.tratamientos.length,
      });
    }
    const lista = this.maestros[ruta] ?? [];
    const conBajas = direccion.searchParams.get("incluir_bajas") === "true";
    return json(200, lista.filter((elemento) => conBajas || elemento.estado === "activa"));
  }
}

let servidor: Servidor;
let base: BaseLocal;

async function encolar(tipo: "crear_tratamiento" | "crear_producto", cuerpo: { id: string }, estado: EstadoOperacion) {
  await base.cola.add({
    idOperacion: crypto.randomUUID(),
    tipo,
    entidadId: cuerpo.id,
    versionBase: null,
    cuerpo,
    creadaEn: "2026-03-15T10:00:00Z",
    intentos: 0,
    estado,
    errores: [],
  });
}

async function ponerLocal(id: string, estadoSincronizacion: "sincronizado" | "pendiente" | "rechazado") {
  await base.tratamientos.put({ ...nuevo(id, { problema: "Local" }), estadoSincronizacion, parcelaIds: [], productoIds: [] });
}

const locales = async () =>
  Object.fromEntries((await base.tratamientos.toArray()).map((t) => [t.id, [t.estadoSincronizacion, t["problema"]]]));

beforeEach(async () => {
  await vaciarDispositivo();
  servidor = new Servidor();
  await guardarSesion(CUENTA);
  base = abrirBase(CUENTA.explotacionId);
});

afterEach(async () => {
  cleanup();
  await sincronizar();
  vi.unstubAllGlobals();
});

describe("descarga de los tratamientos (REQ-06)", () => {
  it("sustituye las copias locales por las del servidor, con sus índices", async () => {
    await ponerLocal("viejo", "sincronizado");
    await ponerLocal("t1", "sincronizado");
    servidor.tratamientos = [delServidor("t1"), delServidor("t2")];
    expect(await descargarTratamientos()).toEqual({ estado: "descargados" });
    expect(await locales()).toEqual({ t1: ["sincronizado", "Mildiu"], t2: ["sincronizado", "Mildiu"] });
    expect(await base.tratamientos.where("parcelaIds").equals(PARCELA.id).count()).toBe(2);
    expect(await base.tratamientos.where("productoIds").equals(PRODUCTO.id).count()).toBe(2);
  });

  it("descarga todas las páginas", async () => {
    servidor.tratamientos = Array.from({ length: 450 }, (_, i) => delServidor(`t${i}`));
    await descargarTratamientos();
    expect(await base.tratamientos.count()).toBe(450);
    expect(servidor.llamadas.filter((l) => l.startsWith("GET /tratamientos"))).toEqual([
      "GET /tratamientos?pagina=1&tamano=200",
      "GET /tratamientos?pagina=2&tamano=200",
      "GET /tratamientos?pagina=3&tamano=200",
    ]);
  });

  it("si falla una página no toca ninguna copia", async () => {
    await ponerLocal("viejo", "sincronizado");
    servidor.tratamientos = Array.from({ length: 250 }, (_, i) => delServidor(`t${i}`));
    servidor.fallos["GET /tratamientos?pagina=2&tamano=200"] = new TypeError("Failed to fetch");
    expect((await descargarTratamientos()).estado).toBe("error");
    expect(await locales()).toEqual({ viejo: ["sincronizado", "Local"] });
  });

  it.each(["pendiente", "rechazada"] as const)(
    "conserva las copias con una operación %s en la cola, estén o no en el servidor",
    async (estado) => {
      const enEstado = estado === "pendiente" ? "pendiente" : "rechazado";
      for (const id of ["t1", "t2"]) {
        await ponerLocal(id, enEstado);
        await encolar("crear_tratamiento", nuevo(id), estado);
      }
      // t1 ya llegó al servidor, pero se perdió la respuesta.
      servidor.tratamientos = [delServidor("t1"), delServidor("t3")];
      await descargarTratamientos();
      expect(await locales()).toEqual({
        t1: [enEstado, "Local"],
        t2: [enEstado, "Local"],
        t3: ["sincronizado", "Mildiu"],
      });
    },
  );

  it("no borra un tratamiento que se guarda y se envía mientras se descarga la lista", async () => {
    servidor.tratamientos = [delServidor("t1")];
    let hecho = false;
    servidor.alPedir = async () => {
      if (hecho) return;
      hecho = true;
      await guardarTratamiento(nuevo("recien"));
      await vaciarCola();
    };
    await descargarTratamientos();
    expect(Object.keys(await locales()).sort()).toEqual(["recien", "t1"]);
  });

  it("descarga también los elementos de baja que usan los tratamientos, para poder mostrarlos", async () => {
    servidor.maestros["personas"] = [
      { ...PERSONA, estado: "baja" },
      { ...PERSONA, id: "per-2", estado: "baja" },
    ];
    servidor.maestros["productos"] = [{ ...PRODUCTO, estado: "baja" }];
    servidor.tratamientos = [delServidor("t1")];
    await descargarMaestros();
    await descargarTratamientos();
    expect(await base.personas.toArray()).toMatchObject([{ id: PERSONA.id, estado: "baja" }]);
    expect(await base.productos.toArray()).toMatchObject([{ id: PRODUCTO.id, estado: "baja" }]);

    // Siguen ahí después de otra descarga de los activos y no se ofrecen en la explotación.
    await descargarMaestros();
    expect(await base.personas.count()).toBe(1);
    servidor.fallos["GET /personas"] = new TypeError("Failed to fetch");
    render(createElement(Explotacion));
    expect(await screen.findByText("Aún no has dado de alta a nadie que aplique o asesore.")).toBeTruthy();
  });

  it("si todo está en el dispositivo no pide los elementos de baja", async () => {
    servidor.tratamientos = [delServidor("t1")];
    await descargarMaestros();
    await descargarTratamientos();
    expect(servidor.llamadas.filter((l) => l.includes("incluir_bajas"))).toEqual([]);
  });
});

describe("cuándo se descargan (REQ-06; R3)", () => {
  async function rellenar(boton: string) {
    await userEvent.type(screen.getByLabelText("Correo electrónico"), CUENTA.correo);
    await userEvent.type(screen.getByLabelText("Contraseña"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: boton }));
  }

  it("al entrar", async () => {
    servidor.tratamientos = [delServidor("t1")];
    render(createElement(Entrar));
    await rellenar("Entrar");
    await waitFor(async () => expect(Object.keys(await locales())).toEqual(["t1"]));
  });

  it("al crear la cuenta", async () => {
    render(createElement(CrearCuenta));
    await rellenar("Crear cuenta");
    await waitFor(() => expect(servidor.llamadas).toContain("GET /tratamientos?pagina=1&tamano=200"));
  });

  it("tras vaciar la cola", async () => {
    servidor.tratamientos = [delServidor("de-otro-movil")];
    await guardarTratamiento(nuevo("t1"));
    await waitFor(async () =>
      expect(await locales()).toEqual({
        "de-otro-movil": ["sincronizado", "Mildiu"],
        t1: ["sincronizado", "Mildiu"],
      }),
    );
  });

  it("al salir y volver a entrar se ven los tratamientos ya enviados", async () => {
    await guardarTratamiento(nuevo("t1"));
    await waitFor(async () => expect(await locales()).toEqual({ t1: ["sincronizado", "Mildiu"] }));
    await sincronizar();
    render(createElement(CerrarSesion));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(baseAbierta()).toBeNull());
    cleanup();

    render(createElement(Entrar));
    await rellenar("Entrar");
    await waitFor(async () => expect((await baseAbierta()?.tratamientos.get("t1"))?.["problema"]).toBe("Mildiu"));
    base = abrirBase(CUENTA.explotacionId);
  });
});

describe("datos maestros con operaciones en la cola (REQ-06, REQ-16; R16)", () => {
  const RECHAZADO = { id: "pro-9", nombreComercial: "Sin aceptar", numeroRegistro: "X" };

  it("una cola con solo operaciones rechazadas no impide descargarlos y conserva sus productos", async () => {
    await base.productos.put({ ...RECHAZADO, estado: "activa" });
    await encolar("crear_producto", RECHAZADO, "rechazada");
    expect(await descargarMaestros()).toEqual({ estado: "descargados" });
    expect((await base.productos.toArray()).map((p) => p.id).sort()).toEqual(["pro-1", "pro-9"]);
    expect((await base.parcelas.toArray()).map((p) => p.id)).toEqual(["par-1"]);
  });

  it("tampoco lo impide un tratamiento que espera a un producto rechazado", async () => {
    await base.productos.put({ ...RECHAZADO, estado: "activa" });
    await encolar("crear_producto", RECHAZADO, "rechazada");
    const espera = nuevo("t1", { productos: [{ productoId: "pro-9", cantidad: 1, unidadMedida: "kg" }] });
    await encolar("crear_tratamiento", espera, "pendiente");
    expect(await descargarMaestros()).toEqual({ estado: "descargados" });
    expect(await base.productos.get("pro-9")).toBeDefined();
  });

  it("con una operación que aún se puede enviar no se descargan", async () => {
    await encolar("crear_producto", RECHAZADO, "pendiente");
    servidor.fallos["GET /cuenta/yo"] = new TypeError("Failed to fetch");
    expect(await descargarMaestros()).toEqual({ estado: "cola-pendiente" });
  });

  it("no borra un elemento que se da de alta mientras se descargan las listas", async () => {
    const otro = { ...PARCELA, id: "par-2", numeroOrden: 2 };
    servidor.alPedir = async (clave) => {
      if (clave === "GET /parcelas") await base.parcelas.put(otro);
    };
    await descargarMaestros();
    expect((await base.parcelas.toArray()).map((p) => p.id).sort()).toEqual(["par-1", "par-2"]);
  });
});
