// @vitest-environment jsdom
// Pruebas de componentes del formulario de registro (T-41; REQ-01 a REQ-06 y REQ-16; research R3 y R16).
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { abrirBase } from "../../src/db/base";
import type { BaseLocal } from "../../src/db/esquema";
import { Tratamiento } from "../../src/paginas/tratamiento/Tratamiento";
import { guardarSesion } from "../../src/sesion";
import { guardarProducto, guardarTratamiento, type TratamientoNuevo } from "../../src/sync/cola";
import { sincronizar } from "../../src/sync/vaciado";
import { vaciarDispositivo } from "../ayudas";

const CUENTA = { correo: "ana@example.com", explotacionId: "6d1f2a90-0000-4000-8000-000000000001" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const AHORA = new Date("2026-03-15T11:00:00Z");
const activa = { estado: "activa" as const, fechaBaja: null };

const PARCELA = {
  id: "par-1",
  numeroOrden: 1,
  nombre: "Viña Grande",
  superficie: 4.2,
  cultivoEspecie: "Vitis vinifera",
  cultivoVariedad: "Airén",
  ...activa,
};
const SIN_CULTIVO = {
  id: "par-2",
  numeroOrden: 2,
  nombre: null,
  superficie: 2,
  cultivoEspecie: null,
  cultivoVariedad: null,
  ...activa,
};
const DE_BAJA = { ...PARCELA, id: "par-3", numeroOrden: 3, nombre: "Vendida", estado: "baja" as const };
const APLICADOR = { id: "per-1", nombre: "Juan Pérez", tipo: "aplicador", numeroCarne: "CM-1", ...activa };
const ASESOR = { id: "per-2", nombre: "María López", tipo: "asesor", numeroCarne: "AS-1", ...activa };
const EQUIPO = { id: "equ-1", descripcion: "Pulverizador", numeroRoma: "ES13", ...activa };
const PRODUCTO = { id: "pro-1", nombreComercial: "Cobre Nordox", numeroRegistro: "ES-00123", ...activa };
const AZUFRE = { id: "pro-2", nombreComercial: "Azufre líquido", numeroRegistro: "ES-00456", ...activa };

let base: BaseLocal;

const opciones = (etiqueta: string, indice = 0) =>
  [...(screen.getAllByLabelText(etiqueta)[indice] as HTMLSelectElement).options].map((o) => o.text);

async function abrir(id?: string) {
  render(<Tratamiento id={id} />);
  await screen.findByLabelText("Fecha");
}

async function escribir(etiqueta: string, texto: string, indice = 0) {
  const campo = screen.getAllByLabelText(etiqueta)[indice] as HTMLElement;
  await userEvent.clear(campo);
  await userEvent.type(campo, texto);
}

async function elegir(etiqueta: string, texto: string, indice = 0) {
  await userEvent.selectOptions(screen.getAllByLabelText(etiqueta)[indice] as HTMLElement, texto);
}

const pulsar = (nombre: string) => userEvent.click(screen.getByRole("button", { name: nombre }));

/** Escenario 1 de la historia 1. */
async function rellenar() {
  await elegir("Parcela", "Parcela 1 · Viña Grande");
  await escribir("Superficie tratada (ha)", "3,5");
  await escribir("Plaga o problema a controlar", "Mildiu");
  await elegir("Aplicador", "Juan Pérez");
  await elegir("Producto", "Cobre Nordox (nº ES-00123)");
  await escribir("Cantidad", "2");
  await elegir("Equipo de aplicación", "Pulverizador (ROMA ES13)");
}

const enCola = () => base.cola.orderBy("orden").toArray();
const cuerpo = async () => (await enCola()).find((o) => o.tipo === "crear_tratamiento")?.cuerpo as TratamientoNuevo;

/** Texto del error junto a un campo. */
function errorDe(etiqueta: string, indice = 0): string {
  const campo = screen.getAllByLabelText(etiqueta)[indice];
  return (campo?.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id))
    .filter((nodo) => nodo?.getAttribute("role") === "alert")
    .map((nodo) => nodo?.textContent)
    .join("");
}

beforeEach(async () => {
  vi.useFakeTimers({ now: AHORA, toFake: ["Date"] });
  await vaciarDispositivo();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))); // sin conexión
  await guardarSesion(CUENTA);
  base = abrirBase(CUENTA.explotacionId);
  await base.parcelas.bulkPut([SIN_CULTIVO, PARCELA, DE_BAJA]);
  await base.personas.bulkPut([APLICADOR, ASESOR]);
  await base.equipos.put(EQUIPO);
  await base.productos.bulkPut([PRODUCTO, AZUFRE]);
  window.history.replaceState(null, "", "/tratamiento/nuevo");
});

afterEach(async () => {
  cleanup();
  await sincronizar();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("registrar un tratamiento (REQ-01, REQ-06)", () => {
  it("escenario 1 sin conexión: guarda en el dispositivo, encola y vuelve al cuaderno", async () => {
    await abrir();
    expect(screen.getByLabelText("Fecha")).toHaveProperty("value", "2026-03-15");
    await rellenar();
    await pulsar("Guardar el tratamiento");

    await waitFor(() => expect(window.location.pathname).toBe("/"));
    const guardado = await cuerpo();
    expect(guardado).toEqual({
      id: guardado.id,
      registradoEn: AHORA.toISOString(),
      fecha: "2026-03-15",
      problema: "Mildiu",
      aplicadorId: "per-1",
      asesorId: null,
      equipoId: "equ-1",
      parcelas: [
        {
          parcelaId: "par-1",
          superficieTratada: 3.5,
          cultivoEspecie: "Vitis vinifera",
          cultivoVariedad: "Airén",
          productoSemilla: null,
        },
      ],
      productos: [{ productoId: "pro-1", cantidad: 2, unidadMedida: "kg" }],
      eficacia: null,
      observaciones: null,
    });
    expect(guardado.id).toMatch(UUID);
    expect(await base.tratamientos.get(guardado.id)).toMatchObject({ estadoSincronizacion: "pendiente" });
  });

  it("guarda también los datos opcionales", async () => {
    await abrir();
    await rellenar();
    await escribir("Fecha", "2026-03-10");
    await elegir("Asesor (opcional)", "María López");
    await escribir("Producto de tratamiento de la semilla (opcional)", "Tebuconazol");
    await elegir("Eficacia (opcional)", "Regular");
    await escribir("Observaciones (opcional)", "Sin viento");
    await pulsar("Guardar el tratamiento");
    await waitFor(async () => expect(await enCola()).toHaveLength(1));
    expect(await cuerpo()).toMatchObject({
      fecha: "2026-03-10",
      asesorId: "per-2",
      eficacia: "regular",
      observaciones: "Sin viento",
    });
    expect((await cuerpo()).parcelas[0]?.productoSemilla).toBe("Tebuconazol");
  });

  it("la fecha propuesta es la de hoy en Madrid aunque en UTC sea ayer", async () => {
    vi.setSystemTime(new Date("2026-06-30T22:30:00Z"));
    await abrir();
    expect(screen.getByLabelText("Fecha")).toHaveProperty("value", "2026-07-01");
  });

  it("se llega desde el cuaderno y la página tiene su dirección", async () => {
    window.history.replaceState(null, "", "/");
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: "Registrar un tratamiento" }));
    expect(window.location.pathname).toBe("/tratamiento/nuevo");
    expect(await screen.findByRole("heading", { level: 1, name: "Registrar un tratamiento" })).toBeTruthy();
  });
});

describe("listas sin conexión (REQ-01, REQ-06, REQ-17)", () => {
  it("ofrece solo los elementos activos, con las parcelas por su número de orden", async () => {
    await abrir();
    expect(opciones("Parcela")).toEqual(["Elige una parcela", "Parcela 1 · Viña Grande", "Parcela 2"]);
    expect(opciones("Aplicador")).toEqual(["Elige quién lo aplicó", "Juan Pérez"]);
    expect(opciones("Asesor (opcional)")).toEqual(["Sin asesor", "María López"]);
    expect(opciones("Equipo de aplicación")).toEqual(["Elige un equipo", "Pulverizador (ROMA ES13)"]);
    expect(opciones("Producto")).toEqual([
      "Elige un producto",
      "Azufre líquido (nº ES-00456)",
      "Cobre Nordox (nº ES-00123)",
    ]);
    expect(opciones("Unidad")).toEqual(["kg", "L"]);
    expect(opciones("Eficacia (opcional)")).toEqual(["Aún no la sé", "Buena", "Regular", "Mala"]);
  });

  it("si faltan parcelas, aplicadores o equipos lo dice y enlaza con los datos de la explotación", async () => {
    await base.equipos.clear();
    await abrir();
    expect(screen.getByText(/Antes de registrar un tratamiento/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Datos de la explotación" }).getAttribute("href")).toBe("/explotacion");
  });

  it("no pide la dosis por hectárea, que se calcula (REQ-23)", async () => {
    await abrir();
    expect(screen.queryByLabelText(/dosis/i)).toBeNull();
  });
});

describe("cultivo propuesto (REQ-05)", () => {
  it("al elegir la parcela propone su cultivo, que se puede cambiar", async () => {
    await abrir();
    await rellenar();
    expect(screen.getByLabelText("Especie")).toHaveProperty("value", "Vitis vinifera");
    expect(screen.getByLabelText("Variedad")).toHaveProperty("value", "Airén");
    await escribir("Variedad", "Tempranillo");
    await pulsar("Guardar el tratamiento");
    await waitFor(async () => expect(await enCola()).toHaveLength(1));
    expect((await cuerpo()).parcelas[0]).toMatchObject({ cultivoVariedad: "Tempranillo" });
  });

  it("al cambiar de parcela propone el cultivo de la nueva", async () => {
    await abrir();
    await elegir("Parcela", "Parcela 1 · Viña Grande");
    await elegir("Parcela", "Parcela 2");
    expect(screen.getByLabelText("Especie")).toHaveProperty("value", "");
  });
});

describe("varias parcelas y mezcla de productos (REQ-03, escenario 4)", () => {
  it("añade y quita parcelas y productos", async () => {
    await abrir();
    await rellenar();
    await pulsar("Añadir otra parcela");
    await elegir("Parcela", "Parcela 2", 1);
    await escribir("Superficie tratada (ha)", "1,25", 1);
    await escribir("Especie", "Triticum aestivum", 1);
    await escribir("Variedad", "Cabal", 1);
    await pulsar("Añadir otro producto");
    await elegir("Producto", "Azufre líquido (nº ES-00456)", 1);
    await escribir("Cantidad", "1,5", 1);
    await elegir("Unidad", "L", 1);
    await pulsar("Añadir otro producto");
    await userEvent.click(screen.getAllByRole("button", { name: "Quitar este producto" })[2] as HTMLElement);
    await pulsar("Guardar el tratamiento");

    await waitFor(async () => expect(await enCola()).toHaveLength(1));
    const guardado = await cuerpo();
    expect(guardado.parcelas.map((p) => [p.parcelaId, p.superficieTratada, p.cultivoVariedad])).toEqual([
      ["par-1", 3.5, "Airén"],
      ["par-2", 1.25, "Cabal"],
    ]);
    expect(guardado.productos).toEqual([
      { productoId: "pro-1", cantidad: 2, unidadMedida: "kg" },
      { productoId: "pro-2", cantidad: 1.5, unidadMedida: "L" },
    ]);
  });

  it("con una sola línea no se puede quitar", async () => {
    await abrir();
    expect(screen.queryByRole("button", { name: "Quitar esta parcela" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Quitar este producto" })).toBeNull();
  });
});

describe("avisos antes de guardar (REQ-02, REQ-04)", () => {
  it("escenario 2: señala junto a su campo cada dato que falta y no guarda", async () => {
    await abrir();
    await pulsar("Guardar el tratamiento");
    expect(await screen.findByText("Revisa los datos marcados.")).toBeTruthy();
    expect(errorDe("Parcela")).toBe("Elige la parcela.");
    expect(errorDe("Superficie tratada (ha)")).toBe("Falta la superficie tratada.");
    expect(errorDe("Especie")).toBe("Falta la especie del cultivo.");
    expect(errorDe("Plaga o problema a controlar")).toBe("Falta la plaga o el problema que querías controlar.");
    expect(errorDe("Aplicador")).toBe("Falta quién aplicó el producto.");
    expect(errorDe("Producto")).toBe("Elige el producto.");
    expect(errorDe("Cantidad")).toBe("Falta la cantidad de producto.");
    expect(errorDe("Equipo de aplicación")).toBe("Falta el equipo de aplicación.");
    expect(await enCola()).toEqual([]);
    expect(await base.tratamientos.count()).toBe(0);
  });

  it("escenario 3: rechaza una superficie mayor que la de la parcela y dice la máxima", async () => {
    await abrir();
    await rellenar();
    await escribir("Superficie tratada (ha)", "5");
    await pulsar("Guardar el tratamiento");
    await waitFor(() =>
      expect(errorDe("Superficie tratada (ha)")).toBe(
        "La superficie tratada (5 ha) es mayor que la de la parcela (4,2 ha).",
      ),
    );
    expect(await enCola()).toEqual([]);

    await escribir("Superficie tratada (ha)", "4,2");
    await pulsar("Guardar el tratamiento");
    await waitFor(async () => expect(await enCola()).toHaveLength(1));
  });

  it("rechaza una fecha futura, una cantidad que no es un número y una superficie con 3 decimales", async () => {
    await abrir();
    await rellenar();
    await escribir("Fecha", "2026-03-16");
    await escribir("Cantidad", "dos");
    await escribir("Superficie tratada (ha)", "3,505");
    await pulsar("Guardar el tratamiento");
    await waitFor(() => expect(errorDe("Fecha")).toBe("La fecha no puede ser posterior a hoy."));
    expect(errorDe("Cantidad")).toBe("La cantidad tiene que ser un número.");
    expect(errorDe("Superficie tratada (ha)")).toMatch(/2 decimales/);
    expect(await enCola()).toEqual([]);
  });

  it("guardar dos veces seguidas no crea dos tratamientos", async () => {
    await abrir();
    await rellenar();
    await userEvent.dblClick(screen.getByRole("button", { name: "Guardar el tratamiento" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(await enCola()).toHaveLength(1);
  });
});

describe("producto nuevo desde el formulario (REQ-16, REQ-06)", () => {
  async function abrirAlta() {
    await abrir();
    await rellenar();
    await pulsar("Dar de alta un producto nuevo");
    return within(screen.getByRole("group", { name: "Producto nuevo" }));
  }

  it("lo da de alta sin conexión ni salir del formulario, lo elige y lo encola antes", async () => {
    const alta = await abrirAlta();
    await userEvent.type(alta.getByLabelText("Nombre comercial"), "Mildiu Stop");
    await userEvent.type(alta.getByLabelText("Número de registro"), "ES-00999");
    await userEvent.click(alta.getByRole("button", { name: "Dar de alta" }));
    await waitFor(() => expect(opciones("Producto")).toContain("Mildiu Stop (nº ES-00999)"));
    const elegido = (await base.productos.toArray()).find((p) => p["nombreComercial"] === "Mildiu Stop");
    await waitFor(() => expect(screen.getByLabelText("Producto")).toHaveProperty("value", elegido?.id));
    // Lo demás sigue como estaba.
    expect(screen.getByLabelText("Plaga o problema a controlar")).toHaveProperty("value", "Mildiu");

    await pulsar("Guardar el tratamiento");
    await waitFor(async () => expect(await enCola()).toHaveLength(2));
    expect((await enCola()).map((o) => o.tipo)).toEqual(["crear_producto", "crear_tratamiento"]);
    expect((await cuerpo()).productos).toEqual([{ productoId: elegido?.id, cantidad: 2, unidadMedida: "kg" }]);
  });

  it("avisa si ya hay uno con el mismo número de registro y deja usar el que hay", async () => {
    const alta = await abrirAlta();
    await userEvent.type(alta.getByLabelText("Nombre comercial"), "Otro cobre");
    await userEvent.type(alta.getByLabelText("Número de registro"), " es-00456 ");
    await userEvent.click(alta.getByRole("button", { name: "Dar de alta" }));
    expect(await alta.findByText(/Ya tienes «Azufre líquido» con ese número de registro/)).toBeTruthy();
    expect(await enCola()).toEqual([]);

    await userEvent.click(alta.getByRole("button", { name: "Usar «Azufre líquido»" }));
    expect(screen.getByLabelText("Producto")).toHaveProperty("value", "pro-2");
    expect(screen.queryByRole("group", { name: "Producto nuevo" })).toBeNull();
    expect(await enCola()).toEqual([]);
  });

  it("si se insiste, lo da de alta igualmente", async () => {
    const alta = await abrirAlta();
    await userEvent.type(alta.getByLabelText("Nombre comercial"), "Otro azufre");
    await userEvent.type(alta.getByLabelText("Número de registro"), "ES-00456");
    await userEvent.click(alta.getByRole("button", { name: "Dar de alta" }));
    await userEvent.click(await alta.findByRole("button", { name: "Dar de alta igualmente" }));
    await waitFor(async () => expect(await enCola()).toMatchObject([{ tipo: "crear_producto" }]));
  });

  it("pide los dos datos y respeta su longitud", async () => {
    const alta = await abrirAlta();
    await userEvent.click(alta.getByRole("button", { name: "Dar de alta" }));
    expect(alta.getByText("Falta el nombre comercial.")).toBeTruthy();
    expect(alta.getByText("Falta el número de registro.")).toBeTruthy();
    await userEvent.type(alta.getByLabelText("Nombre comercial"), "Cobre");
    await userEvent.type(alta.getByLabelText("Número de registro"), "x".repeat(31));
    await userEvent.click(alta.getByRole("button", { name: "Dar de alta" }));
    expect(alta.getByText("Puede tener como mucho 30 caracteres.")).toBeTruthy();
    expect(await enCola()).toEqual([]);
  });
});

describe("corregir un registro rechazado (REQ-06, escenario 10; R16)", () => {
  const RECHAZADO: TratamientoNuevo = {
    id: "aaaaaaaa-0000-4000-8000-000000000001",
    registradoEn: "2026-03-01T10:00:00.000Z",
    fecha: "2026-03-01",
    problema: "Oídio",
    aplicadorId: "per-1",
    asesorId: "per-2",
    equipoId: "equ-1",
    parcelas: [
      { parcelaId: "par-3", superficieTratada: 1.5, cultivoEspecie: "Vitis", cultivoVariedad: "Bobal", productoSemilla: "T" },
    ],
    productos: [{ productoId: "pro-2", cantidad: 1.5, unidadMedida: "L" }],
    eficacia: "buena",
    observaciones: "Con viento",
  };

  async function sembrar(errores: { campo: string; mensaje: string }[], codigoRechazo = 422, cambios = {}) {
    const datos = { ...RECHAZADO, ...cambios };
    await base.tratamientos.put({
      ...datos,
      estadoSincronizacion: "rechazado",
      parcelaIds: ["par-3"],
      productoIds: ["pro-2"],
    });
    await base.cola.add({
      idOperacion: crypto.randomUUID(),
      tipo: "crear_tratamiento",
      entidadId: datos.id,
      versionBase: null,
      cuerpo: datos,
      creadaEn: "2026-03-01T10:00:00Z",
      intentos: 1,
      estado: "rechazada",
      errores,
      codigoRechazo,
    });
  }
  async function sembrarProductoRechazado() {
    const malo = { id: "pro-9", nombreComercial: "Sin aceptar", numeroRegistro: "X" };
    await base.productos.put({ ...malo, ...activa });
    await base.cola.add({
      idOperacion: crypto.randomUUID(),
      tipo: "crear_producto",
      entidadId: malo.id,
      versionBase: null,
      cuerpo: malo,
      creadaEn: "2026-03-01T10:00:00Z",
      intentos: 1,
      estado: "rechazada",
      errores: [{ campo: "numeroRegistro", mensaje: "No es válido." }],
      codigoRechazo: 422,
    });
  }
  const DE_BAJA_ERROR = { campo: "parcelas.0.parcelaId", mensaje: "Esta parcela está de baja." };

  it("abre el formulario con sus datos y los errores junto a su campo", async () => {
    await sembrar([DE_BAJA_ERROR]);
    await abrir(RECHAZADO.id);
    expect(screen.getByRole("heading", { level: 1, name: "Corregir el tratamiento" })).toBeTruthy();
    expect(screen.getByLabelText("Fecha")).toHaveProperty("value", "2026-03-01");
    expect(screen.getByLabelText("Plaga o problema a controlar")).toHaveProperty("value", "Oídio");
    expect(screen.getByLabelText("Superficie tratada (ha)")).toHaveProperty("value", "1,5");
    expect(screen.getByLabelText("Variedad")).toHaveProperty("value", "Bobal");
    expect(screen.getByLabelText("Aplicador")).toHaveProperty("value", "per-1");
    expect(screen.getByLabelText("Asesor (opcional)")).toHaveProperty("value", "per-2");
    expect(screen.getByLabelText("Producto")).toHaveProperty("value", "pro-2");
    expect(screen.getByLabelText("Cantidad")).toHaveProperty("value", "1,5");
    expect(screen.getByLabelText("Unidad")).toHaveProperty("value", "L");
    expect(screen.getByLabelText("Eficacia (opcional)")).toHaveProperty("value", "buena");
    expect(screen.getByLabelText("Observaciones (opcional)")).toHaveProperty("value", "Con viento");
    expect(errorDe("Parcela")).toBe("Esta parcela está de baja.");
    // La parcela de baja no se ofrece: hay que elegir otra.
    expect(screen.getByLabelText("Parcela")).toHaveProperty("value", "");
  });

  it("al guardarlo lo vuelve a encolar con el mismo id y conserva cuándo se anotó", async () => {
    await sembrar([DE_BAJA_ERROR]);
    await abrir(RECHAZADO.id);
    await elegir("Parcela", "Parcela 1 · Viña Grande");
    await pulsar("Guardar la corrección");
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    const [operacion] = await enCola();
    expect(operacion).toMatchObject({ estado: "pendiente", entidadId: RECHAZADO.id, errores: [] });
    expect(operacion?.cuerpo).toMatchObject({ id: RECHAZADO.id, registradoEn: RECHAZADO.registradoEn });
    expect((operacion?.cuerpo as TratamientoNuevo).parcelas[0]?.parcelaId).toBe("par-1");
    expect(await base.tratamientos.get(RECHAZADO.id)).toMatchObject({ estadoSincronizacion: "pendiente" });
  });

  it("no deja guardar sin cambiar el elemento que ya no está disponible", async () => {
    await sembrar([DE_BAJA_ERROR]);
    await abrir(RECHAZADO.id);
    await pulsar("Guardar la corrección");
    await waitFor(() => expect(errorDe("Parcela")).toBe("Elige la parcela."));
    expect(await enCola()).toMatchObject([{ estado: "rechazada" }]);
  });

  it("si el rechazo fue por el momento del registro, usa el de ahora", async () => {
    await sembrar([{ campo: "registradoEn", mensaje: "Revisa la hora." }], 422, { parcelas: [] });
    await abrir(RECHAZADO.id);
    expect(screen.getByText("Revisa la hora.")).toBeTruthy();
    await elegir("Parcela", "Parcela 1 · Viña Grande");
    await escribir("Superficie tratada (ha)", "1");
    await pulsar("Guardar la corrección");
    await waitFor(async () => expect(await cuerpo()).toMatchObject({ registradoEn: AHORA.toISOString() }));
  });

  it("si la fecha corregida es posterior a cuando se anotó, usa el momento de ahora", async () => {
    await sembrar([DE_BAJA_ERROR]);
    await abrir(RECHAZADO.id);
    await elegir("Parcela", "Parcela 1 · Viña Grande");
    await escribir("Fecha", "2026-03-10");
    await pulsar("Guardar la corrección");
    await waitFor(async () =>
      expect(await cuerpo()).toMatchObject({ fecha: "2026-03-10", registradoEn: AHORA.toISOString() }),
    );
  });

  it("muestra arriba el motivo que no es de un campo y, con un 409, guarda con un id nuevo", async () => {
    await sembrar([{ campo: "", mensaje: "Ya existe otro tratamiento con este identificador." }], 409);
    await abrir(RECHAZADO.id);
    expect(screen.getByText("Ya existe otro tratamiento con este identificador.")).toBeTruthy();
    await elegir("Parcela", "Parcela 1 · Viña Grande");
    await pulsar("Guardar la corrección");
    await waitFor(async () => expect((await enCola())[0]?.estado).toBe("pendiente"));
    expect((await enCola())[0]?.entidadId).not.toBe(RECHAZADO.id);
  });

  it("REQ-06: abre también un pendiente que espera a un producto rechazado, para cambiar de producto", async () => {
    await sembrarProductoRechazado();
    const datos = { ...RECHAZADO, parcelas: RECHAZADO.parcelas.map((p) => ({ ...p, parcelaId: "par-1" })) };
    datos.productos = [{ productoId: "pro-9", cantidad: 1, unidadMedida: "kg" }];
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    await guardarTratamiento(datos);
    await abrir(RECHAZADO.id);
    expect(screen.getByLabelText("Producto")).toHaveProperty("value", "pro-9");
    await elegir("Producto", "Cobre Nordox (nº ES-00123)");
    await pulsar("Guardar la corrección");
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    const operacion = (await enCola()).find((o) => o.tipo === "crear_tratamiento");
    expect(operacion).toMatchObject({ entidadId: RECHAZADO.id, estado: "pendiente" });
    expect(await cuerpo()).toMatchObject({
      id: RECHAZADO.id,
      registradoEn: RECHAZADO.registradoEn,
      productos: [{ productoId: "pro-1" }],
    });
    vi.restoreAllMocks();
  });

  it("si ya no está rechazado lo dice y no muestra el formulario", async () => {
    render(<Tratamiento id="no-existe" />);
    expect(await screen.findByText(/ya no está rechazado/)).toBeTruthy();
    expect(screen.queryByLabelText("Fecha")).toBeNull();
  });

  it("se abre con su dirección", async () => {
    await sembrar([DE_BAJA_ERROR]);
    window.history.replaceState(null, "", `/tratamiento/${RECHAZADO.id}/corregir`);
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Corregir el tratamiento" })).toBeTruthy();
  });

  it("se puede usar un producto dado de alta sin conexión", async () => {
    await guardarProducto({ id: "pro-9", nombreComercial: "Recién dado de alta", numeroRegistro: "ES-9" });
    await sembrar([DE_BAJA_ERROR]);
    await abrir(RECHAZADO.id);
    expect(opciones("Producto")).toContain("Recién dado de alta (nº ES-9)");
  });
});
