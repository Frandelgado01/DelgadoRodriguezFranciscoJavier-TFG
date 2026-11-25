// @vitest-environment jsdom
// Pruebas de la descarga de los datos maestros a IndexedDB (T-28; REQ-14, REQ-15 y REQ-16; research R3).
//
// Al iniciar sesión y tras vaciar la cola, la PWA sustituye sus copias de parcelas, personas, equipos y
// productos por las activas del servidor (data-model, "Almacenamiento local"). Si hay operaciones pendientes
// en la cola no las toca, para no perder un producto dado de alta sin conexión que aún no se ha enviado.
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BaseLocal } from "../../src/db/esquema";
import { CrearCuenta } from "../../src/paginas/cuenta/CrearCuenta";
import { Entrar } from "../../src/paginas/cuenta/Entrar";
import { CLAVE_DESCARGA, descargarMaestros } from "../../src/sync/maestros";
import { prepararBase } from "../ayudas";

const CUENTA = { correo: "ana@example.com", explotacionId: "6d1f2a90-0000-4000-8000-000000000001" };
const FRASE = "una frase larga de ejemplo";

const PARCELA = {
  id: "11111111-0000-4000-8000-000000000001",
  numeroOrden: 1,
  nombre: "Viña Grande",
  sigpac: { provincia: 13, municipio: 53, agregado: 0, zona: 0, poligono: 12, parcela: 345, recinto: 1 },
  superficie: 4.2,
  usoSigpac: "VI",
  aprovechamiento: "cultivo",
  cultivoLenoso: true,
  cultivoEspecie: "Vitis vinifera",
  cultivoVariedad: "Airén",
  sistemaExplotacion: "secano",
  sistemaRiego: null,
  protegido: false,
  tipoProteccion: null,
  sistemaCertificacion: null,
  marcoControlPlagas: null,
  estado: "activa",
  fechaBaja: null,
};
const PERSONA = {
  id: "22222222-0000-4000-8000-000000000001",
  nombre: "Juan Pérez",
  tipo: "aplicador",
  numeroCarne: "CM-13-0457",
  estado: "activa",
  fechaBaja: null,
};
const EQUIPO = {
  id: "33333333-0000-4000-8000-000000000001",
  descripcion: "Pulverizador hidráulico",
  fechaAdquisicionOInspeccion: "2025-05-20",
  numeroRoma: "ES130530000123",
  estado: "activa",
  fechaBaja: null,
};
const PRODUCTO = {
  id: "44444444-0000-4000-8000-000000000001",
  nombreComercial: "Cobre Nordox 75 WG",
  numeroRegistro: "ES-00123",
  estado: "activa",
  fechaBaja: null,
};

const ANTIGUO = { id: "99999999-0000-4000-8000-000000000009", estado: "activa", nombre: "Ya no está" };

let base: BaseLocal;

type Respuestas = Record<string, Response | Error>;

function json(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
}

function servidor(cambios: Respuestas = {}): Respuestas {
  return {
    "GET /api/parcelas": json(200, [PARCELA]),
    "GET /api/personas": json(200, [PERSONA]),
    "GET /api/equipos": json(200, [EQUIPO]),
    "GET /api/productos": json(200, [PRODUCTO]),
    ...cambios,
  };
}

/** Sustituye fetch: responde según "MÉTODO /api/ruta" y guarda las llamadas. */
function simularApi(respuestas: Respuestas) {
  const llamadas: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opciones: RequestInit) => {
      const clave = `${opciones.method} ${url}`;
      llamadas.push(clave);
      const respuesta = respuestas[clave];
      if (respuesta === undefined) throw new Error(`Llamada no prevista: ${clave}`);
      if (respuesta instanceof Error) throw respuesta;
      return respuesta.clone();
    }),
  );
  return llamadas;
}

async function copiasLocales() {
  return {
    parcelas: await base.parcelas.toArray(),
    personas: await base.personas.toArray(),
    equipos: await base.equipos.toArray(),
    productos: await base.productos.toArray(),
  };
}

async function sembrarCopiasAntiguas() {
  await base.parcelas.put(ANTIGUO);
  await base.personas.put(ANTIGUO);
  await base.equipos.put(ANTIGUO);
  await base.productos.put(ANTIGUO);
}

const ANTIGUAS = { parcelas: [ANTIGUO], personas: [ANTIGUO], equipos: [ANTIGUO], productos: [ANTIGUO] };
const DEL_SERVIDOR = { parcelas: [PARCELA], personas: [PERSONA], equipos: [EQUIPO], productos: [PRODUCTO] };

beforeEach(async () => {
  base = await prepararBase(CUENTA.explotacionId);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("descarga de los datos maestros (REQ-14, REQ-15, REQ-16)", () => {
  it("sustituye las copias locales por las activas del servidor", async () => {
    await sembrarCopiasAntiguas();
    const llamadas = simularApi(servidor());

    const resultado = await descargarMaestros();

    expect(resultado).toEqual({ estado: "descargados" });
    expect(await copiasLocales()).toEqual(DEL_SERVIDOR);
    // Solo las activas: los listados sin incluir_bajas.
    expect(llamadas.sort()).toEqual(["GET /api/equipos", "GET /api/parcelas", "GET /api/personas", "GET /api/productos"]);
  });

  it("anota cuándo se descargaron", async () => {
    simularApi(servidor());
    await descargarMaestros();
    const fila = await base.meta.get(CLAVE_DESCARGA);
    expect(typeof fila?.valor).toBe("string");
    expect(Number.isNaN(Date.parse(String(fila?.valor)))).toBe(false);
  });

  it("una lista vacía del servidor vacía la copia local", async () => {
    await sembrarCopiasAntiguas();
    simularApi(servidor({ "GET /api/productos": json(200, []) }));
    await descargarMaestros();
    expect((await copiasLocales()).productos).toEqual([]);
  });

  it.each([
    ["sin conexión", new TypeError("Failed to fetch")],
    ["sesión caducada (401)", json(401, { mensaje: "Inicia sesión para continuar." })],
    ["error del servidor (500)", json(500, { mensaje: "Error" })],
  ])("si falla alguna lista (%s) no toca ninguna copia local", async (_caso, fallo) => {
    await sembrarCopiasAntiguas();
    simularApi(servidor({ "GET /api/equipos": fallo }));

    const resultado = await descargarMaestros();

    expect(resultado.estado).toBe("error");
    expect(await copiasLocales()).toEqual(ANTIGUAS);
  });

  it("con operaciones pendientes en la cola no descarga ni toca las copias locales", async () => {
    await sembrarCopiasAntiguas();
    await base.cola.add({
      idOperacion: "55555555-0000-4000-8000-000000000001",
      tipo: "crear_producto",
      entidadId: ANTIGUO.id,
      versionBase: null,
      cuerpo: {},
      creadaEn: "2026-03-15T10:00:00Z",
      intentos: 0,
      estado: "pendiente",
      errores: [],
    });
    const llamadas = simularApi(servidor());

    expect(await descargarMaestros()).toEqual({ estado: "cola-pendiente" });
    expect(llamadas).toEqual([]);
    expect(await copiasLocales()).toEqual(ANTIGUAS);
  });
});

describe("al iniciar sesión se descargan los datos maestros", () => {
  it("al entrar", async () => {
    await sembrarCopiasAntiguas();
    simularApi(
      servidor({
        "POST /api/sesion": new Response(null, { status: 204 }),
        "GET /api/cuenta/yo": json(200, CUENTA),
      }),
    );
    render(createElement(Entrar));
    await userEvent.type(screen.getByLabelText("Correo electrónico"), CUENTA.correo);
    await userEvent.type(screen.getByLabelText("Contraseña"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(async () => expect(await copiasLocales()).toEqual(DEL_SERVIDOR));
  });

  it("al crear la cuenta", async () => {
    await sembrarCopiasAntiguas();
    simularApi(
      servidor({
        "POST /api/cuenta": json(201, CUENTA),
        "GET /api/parcelas": json(200, []),
        "GET /api/personas": json(200, []),
        "GET /api/equipos": json(200, []),
        "GET /api/productos": json(200, []),
      }),
    );
    render(createElement(CrearCuenta));
    await userEvent.type(screen.getByLabelText("Correo electrónico"), CUENTA.correo);
    await userEvent.type(screen.getByLabelText("Contraseña"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(async () =>
      expect(await copiasLocales()).toEqual({ parcelas: [], personas: [], equipos: [], productos: [] }),
    );
  });
});
