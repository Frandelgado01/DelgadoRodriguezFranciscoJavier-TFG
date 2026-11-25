// @vitest-environment jsdom
// Pruebas de la base local por explotación (T-78; REQ-06 y REQ-20; research R16).
//
// Cada explotación tiene su propia base IndexedDB, cuaderno-<explotacionId>; la base cuaderno solo guarda la sesión
// del dispositivo. Así dos cuentas en el mismo móvil no mezclan sus datos (historia 1, escenario 8).
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dexie } from "dexie";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { abrirBase, baseAbierta, dispositivo } from "../../src/db/base";
import { BaseDispositivo, type EstadoOperacion } from "../../src/db/esquema";
import { CerrarSesion } from "../../src/paginas/cuenta/CerrarSesion";
import { Explotacion } from "../../src/paginas/explotacion/Explotacion";
import { guardarSesion, leerSesion } from "../../src/sesion";
import { guardarTratamiento, type TratamientoNuevo } from "../../src/sync/cola";
import { vaciarDispositivo } from "../ayudas";

const A = { correo: "ana@example.com", explotacionId: "6d1f2a90-0000-4000-8000-00000000000a" };
const B = { correo: "luis@example.com", explotacionId: "6d1f2a90-0000-4000-8000-00000000000b" };
const BASE_A = `cuaderno-${A.explotacionId}`;
const BASE_B = `cuaderno-${B.explotacionId}`;

const PARCELA = {
  id: "p1",
  numeroOrden: 1,
  nombre: "Viña de Ana",
  sigpac: { provincia: 13, municipio: 53, agregado: 0, zona: 0, poligono: 12, parcela: 345, recinto: 1 },
  superficie: 4.2,
  estado: "activa" as const,
};

function simularFetch(responder: (clave: string) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opciones: RequestInit) => responder(`${opciones.method} ${url}`)),
  );
}

const sinConexion = () => {
  throw new TypeError("Failed to fetch");
};

function operacion(estado: EstadoOperacion) {
  return {
    idOperacion: crypto.randomUUID(),
    tipo: "crear_tratamiento" as const,
    entidadId: "t1",
    versionBase: null,
    cuerpo: {},
    creadaEn: "2026-03-15T10:00:00Z",
    intentos: 0,
    estado,
    errores: [],
  };
}

async function sembrarA() {
  await guardarSesion(A);
  const base = abrirBase(A.explotacionId);
  await base.parcelas.put(PARCELA);
  await base.tratamientos.put({
    id: "t1",
    fecha: "2026-03-10",
    estadoSincronizacion: "pendiente",
    parcelaIds: ["p1"],
    productoIds: [],
  });
  return base;
}

async function salir(confirmando: boolean) {
  simularFetch(() => new Response(null, { status: 204 }));
  render(createElement(CerrarSesion));
  await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  if (confirmando) {
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar sesión sin borrar los registros" }));
  }
  await waitFor(() => expect(window.location.pathname).toBe("/entrar"));
  cleanup();
}

beforeEach(async () => {
  await vaciarDispositivo();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("una base por explotación (REQ-06, REQ-20)", () => {
  it("entrar abre la base de esa explotación y sin sesión no hay ninguna abierta", async () => {
    expect(baseAbierta()).toBeNull();
    await guardarSesion(A);
    expect(baseAbierta()?.name).toBe(BASE_A);
    await guardarSesion(B);
    expect(baseAbierta()?.name).toBe(BASE_B);
  });

  it("al abrir la app con una sesión guardada se abre la base de su explotación", async () => {
    await dispositivo.meta.put({ clave: "sesion", valor: A });
    expect(await leerSesion()).toEqual(A);
    expect(baseAbierta()?.name).toBe(BASE_A);
  });

  it("si otra pestaña cambia la sesión, al volver a leerla se abre la base de la otra cuenta", async () => {
    await sembrarA();
    await dispositivo.meta.put({ clave: "sesion", valor: B });
    expect(await leerSesion()).toEqual(B);
    expect(baseAbierta()?.name).toBe(BASE_B);
    expect(await baseAbierta()?.tratamientos.count()).toBe(0);
  });

  it("escenario 8: los datos de A no se leen con la sesión de B", async () => {
    await sembrarA();
    await guardarSesion(B);
    const base = baseAbierta();
    expect(await base?.parcelas.count()).toBe(0);
    expect(await base?.tratamientos.count()).toBe(0);
    expect(await base?.cola.count()).toBe(0);
  });

  it.each([
    ["con conexión", () => new Response("[]", { headers: { "Content-Type": "application/json" } })],
    ["sin conexión", sinConexion],
  ])("escenario 8: B no ve en pantalla los datos de A (%s)", async (_caso, responder) => {
    await sembrarA();
    await guardarSesion(B);
    simularFetch(responder);
    render(createElement(Explotacion));
    expect(await screen.findByText("Aún no has dado de alta ninguna parcela.")).toBeTruthy();
    expect(screen.queryByText(/Viña de Ana/)).toBeNull();
  });

  it("A sigue viendo sin conexión los datos que guardó en el dispositivo", async () => {
    await sembrarA();
    await guardarSesion(B);
    await guardarSesion(A);
    simularFetch(sinConexion);
    render(createElement(Explotacion));
    expect(await screen.findByText("Parcela 1 · Viña de Ana")).toBeTruthy();
  });
});

describe("al salir (REQ-06, REQ-20; R16)", () => {
  it("con la cola vacía elimina la base de esa cuenta y no toca la de otra", async () => {
    await guardarSesion(B);
    await abrirBase(B.explotacionId).parcelas.put({ ...PARCELA, nombre: "De Luis" });
    await sembrarA();
    await salir(false);

    expect(await Dexie.exists(BASE_A)).toBe(false);
    expect(await Dexie.exists(BASE_B)).toBe(true);
    expect(baseAbierta()).toBeNull();
    expect(await leerSesion()).toBeNull();
    await guardarSesion(B);
    expect(await baseAbierta()?.parcelas.count()).toBe(1);
  });

  it.each(["pendiente", "rechazada"] as const)(
    "con una operación %s avisa y, si sale igualmente, conserva la base para cuando vuelva la misma cuenta",
    async (estado) => {
      const base = await sembrarA();
      await base.cola.add(operacion(estado));
      render(createElement(CerrarSesion));
      await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
      expect(await screen.findByText(/Tienes 1 registro sin enviar/)).toBeTruthy();
      expect(await leerSesion()).toEqual(A);
      cleanup();

      await salir(true);
      expect(await leerSesion()).toBeNull();
      expect(baseAbierta()).toBeNull();
      expect(await Dexie.exists(BASE_A)).toBe(true);

      await guardarSesion(B);
      expect(await baseAbierta()?.cola.count()).toBe(0);
      await guardarSesion(A);
      expect(await baseAbierta()?.cola.count()).toBe(1);
      expect(await baseAbierta()?.tratamientos.count()).toBe(1);
    },
  );
});

describe("guardar mientras se cierra la sesión (REQ-06)", () => {
  const NUEVO: TratamientoNuevo = {
    id: "t-tardio",
    registradoEn: "2026-03-15T10:30:00Z",
    fecha: "2026-03-15",
    problema: "Mildiu",
    aplicadorId: "per-1",
    asesorId: null,
    equipoId: "equ-1",
    parcelas: [],
    productos: [],
    eficacia: null,
    observaciones: null,
  };

  it("REQ-06: un tratamiento guardado con el cierre en curso no se pierde y sigue en la cola al volver a entrar", async () => {
    await guardarSesion(A);
    let soltar: (respuesta: Response) => void = () => undefined;
    const retenida = new Promise<Response>((resolver) => {
      soltar = resolver;
    });
    const llamadas: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opciones: RequestInit) => {
        llamadas.push(`${opciones.method} ${url}`);
        if (opciones.method === "DELETE") return retenida;
        return new Response("{}", { status: 401, headers: { "Content-Type": "application/json" } });
      }),
    );
    render(createElement(CerrarSesion));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(llamadas).toContain("DELETE /api/sesion"));

    await guardarTratamiento(NUEVO);
    soltar(new Response(null, { status: 204 }));
    await waitFor(() => expect(window.location.pathname).toBe("/entrar"));

    expect(await leerSesion()).toBeNull();
    expect(baseAbierta()).toBeNull();
    expect(await Dexie.exists(BASE_A)).toBe(true);
    await guardarSesion(A);
    expect(await baseAbierta()?.cola.toArray()).toMatchObject([{ entidadId: "t-tardio", estado: "pendiente" }]);
    expect(await baseAbierta()?.tratamientos.get("t-tardio")).toMatchObject({ estadoSincronizacion: "pendiente" });
  });
});

describe("base del dispositivo", () => {
  it("la base cuaderno solo guarda la sesión", async () => {
    await sembrarA();
    expect(dispositivo.name).toBe("cuaderno");
    expect(dispositivo.tables.map((tabla) => tabla.name)).toEqual(["meta"]);
    expect((await dispositivo.meta.toArray()).map((fila) => fila.clave)).toEqual(["sesion"]);
  });

  it("su versión 2 elimina los almacenes de datos que tenía y conserva la sesión", async () => {
    dispositivo.close();
    await Dexie.delete("cuaderno");
    const antigua = new Dexie("cuaderno");
    antigua.version(1).stores({
      parcelas: "id, estado",
      personas: "id, estado",
      equipos: "id, estado",
      productos: "id, estado",
      tratamientos: "id, fecha, estadoSincronizacion, *parcelaIds, *productoIds",
      cola: "++orden, &idOperacion, entidadId",
      meta: "clave",
    });
    await antigua.table("parcelas").put(PARCELA);
    await antigua.table("meta").put({ clave: "sesion", valor: A });
    antigua.close();

    const nueva = new BaseDispositivo();
    await nueva.open();
    expect(nueva.verno).toBe(2);
    expect([...nueva.backendDB().objectStoreNames]).toEqual(["meta"]);
    expect((await nueva.meta.get("sesion"))?.valor).toEqual(A);
    nueva.close();
  });
});
