// @vitest-environment jsdom
// Pruebas de componentes del cuaderno (T-42 y T-77; REQ-01, REQ-06 y REQ-23, escenarios 6, 7, 9 y 10; research R15
// y R16).
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { abrirBase } from "../../src/db/base";
import type { BaseLocal, EstadoSincronizacion, OperacionCola } from "../../src/db/esquema";
import { Cuaderno } from "../../src/paginas/cuaderno/Cuaderno";
import { guardarSesion } from "../../src/sesion";
import { guardarTratamiento, type TratamientoNuevo } from "../../src/sync/cola";
import { sincronizar } from "../../src/sync/vaciado";
import { vaciarDispositivo } from "../ayudas";

const CUENTA = { correo: "ana@example.com", explotacionId: "6d1f2a90-0000-4000-8000-000000000001" };
const activa = { estado: "activa" as const, fechaBaja: null };
const PARCELA = { id: "par-1", numeroOrden: 1, nombre: "Viña Grande", superficie: 4.2, ...activa };
const OTRA = { id: "par-2", numeroOrden: 2, nombre: null, superficie: 2, ...activa };
const APLICADOR = { id: "per-1", nombre: "Juan Pérez", tipo: "aplicador", numeroCarne: "CM-13-0457", ...activa };
const ASESOR = { id: "per-2", nombre: "María López", tipo: "asesor", numeroCarne: "AS-0099", ...activa };
const EQUIPO = { id: "equ-1", descripcion: "Pulverizador", numeroRoma: "ES13", ...activa };
const PRODUCTO = { id: "pro-1", nombreComercial: "Cobre Nordox", numeroRegistro: "ES-00123", ...activa };
const AZUFRE = { id: "pro-2", nombreComercial: "Azufre líquido", numeroRegistro: "ES-00456", ...activa };

let base: BaseLocal;

function tratamiento(cambios: Partial<TratamientoNuevo> = {}): TratamientoNuevo {
  return {
    id: crypto.randomUUID(),
    registradoEn: "2026-03-15T10:30:00Z",
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
    ...cambios,
  };
}

async function poner(t: TratamientoNuevo, estadoSincronizacion: EstadoSincronizacion) {
  await base.tratamientos.put({
    ...t,
    estadoSincronizacion,
    parcelaIds: t.parcelas.map((linea) => linea.parcelaId),
    productoIds: t.productos.map((linea) => linea.productoId),
  });
  return t;
}

async function encolarRechazada(
  tipo: "crear_tratamiento" | "crear_producto",
  cuerpo: { id: string },
  errores: OperacionCola["errores"],
) {
  await base.cola.add({
    idOperacion: crypto.randomUUID(),
    tipo,
    entidadId: cuerpo.id,
    versionBase: null,
    cuerpo,
    creadaEn: "2026-03-15T10:00:00Z",
    intentos: 1,
    estado: "rechazada",
    errores,
    codigoRechazo: 422,
  });
}

/** Elemento de la lista de tratamientos con ese texto. */
async function elemento(texto: string) {
  const item = (await screen.findByText(texto)).closest("li");
  if (!item) throw new Error(`No hay ningún tratamiento con ${texto}`);
  return within(item);
}

async function abrirDetalle(texto: string) {
  const item = await elemento(texto);
  await userEvent.click(item.getByRole("button", { name: "Ver el detalle" }));
  return item;
}

/** Valor de un dato del detalle. */
function dato(item: Awaited<ReturnType<typeof elemento>>, nombre: string): string[] {
  return item.getAllByText(nombre).map((termino) => termino.nextElementSibling?.textContent ?? "");
}

beforeEach(async () => {
  await vaciarDispositivo();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))); // sin conexión
  await guardarSesion(CUENTA);
  base = abrirBase(CUENTA.explotacionId);
  await base.parcelas.bulkPut([PARCELA, OTRA]);
  await base.personas.bulkPut([APLICADOR, ASESOR]);
  await base.equipos.put(EQUIPO);
  await base.productos.bulkPut([PRODUCTO, AZUFRE]);
  window.history.replaceState(null, "", "/");
});

afterEach(async () => {
  cleanup();
  await sincronizar();
  vi.unstubAllGlobals();
});

describe("lista del cuaderno (REQ-01, REQ-06)", () => {
  it("sin tratamientos lo dice y ofrece registrar uno", async () => {
    render(<Cuaderno />);
    expect(await screen.findByText("Aún no has registrado ningún tratamiento.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Registrar un tratamiento" }).getAttribute("href")).toBe("/tratamiento/nuevo");
    expect(screen.getByRole("link", { name: "Datos de la explotación" }).getAttribute("href")).toBe("/explotacion");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  });

  it("muestra juntos los locales y los sincronizados, del más reciente al más antiguo, con su estado", async () => {
    await poner(tratamiento({ fecha: "2026-03-01", problema: "Oídio" }), "sincronizado");
    await poner(tratamiento({ fecha: "2026-03-15", problema: "Mildiu" }), "pendiente");
    await poner(tratamiento({ fecha: "2026-03-10", problema: "Polilla" }), "rechazado");
    await poner(tratamiento({ fecha: "2026-02-10", problema: "Araña roja" }), "conflicto");
    render(<Cuaderno />);
    await screen.findByText("15/03/2026 · Mildiu");
    const titulos = within(screen.getByRole("list", { name: "Tratamientos" }))
      .getAllByRole("listitem")
      .map((item) => within(item).getByRole("heading").textContent);
    expect(titulos).toEqual([
      "15/03/2026 · Mildiu",
      "10/03/2026 · Polilla",
      "01/03/2026 · Oídio",
      "10/02/2026 · Araña roja",
    ]);
    expect((await elemento("15/03/2026 · Mildiu")).getByText("Pendiente de sincronizar")).toBeTruthy();
    expect((await elemento("10/03/2026 · Polilla")).getByText("Rechazado")).toBeTruthy();
    expect((await elemento("01/03/2026 · Oídio")).getByText("Sincronizado")).toBeTruthy();
    expect((await elemento("10/02/2026 · Araña roja")).getByText("En conflicto")).toBeTruthy();
  });

  it("con la misma fecha va antes el que se anotó después", async () => {
    await poner(tratamiento({ problema: "Primero", registradoEn: "2026-03-15T08:00:00Z" }), "sincronizado");
    await poner(tratamiento({ problema: "Segundo", registradoEn: "2026-03-15T09:00:00Z" }), "sincronizado");
    render(<Cuaderno />);
    await screen.findByText("15/03/2026 · Primero");
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((titulo) => titulo.textContent);
    expect(titulos).toEqual(["15/03/2026 · Segundo", "15/03/2026 · Primero"]);
  });

  it("un tratamiento guardado sin conexión aparece enseguida", async () => {
    render(<Cuaderno />);
    await screen.findByText("Aún no has registrado ningún tratamiento.");
    await guardarTratamiento(tratamiento());
    expect(await screen.findByText("15/03/2026 · Mildiu")).toBeTruthy();
    expect(screen.getByText("Pendiente de sincronizar")).toBeTruthy();
  });

  it("la página del cuaderno es la de inicio, con el estado del envío a la vista", async () => {
    await poner(tratamiento(), "sincronizado");
    render(<App />);
    expect(await screen.findByText("15/03/2026 · Mildiu")).toBeTruthy();
    expect(screen.getByRole("status", { name: "Envío de registros" })).toBeTruthy();
  });
});

describe("detalle con los datos de la sección B (REQ-01)", () => {
  it("escenario 1: muestra todos los datos introducidos", async () => {
    await poner(
      tratamiento({
        asesorId: "per-2",
        eficacia: "buena",
        observaciones: "Sin viento",
        parcelas: [
          {
            parcelaId: "par-1",
            superficieTratada: 3.5,
            cultivoEspecie: "Vitis vinifera",
            cultivoVariedad: "Airén",
            productoSemilla: "Tebuconazol",
          },
        ],
      }),
      "pendiente",
    );
    render(<Cuaderno />);
    const item = await abrirDetalle("15/03/2026 · Mildiu");
    expect(dato(item, "Fecha")).toEqual(["15/03/2026"]);
    expect(dato(item, "Parcela")).toEqual(["Parcela 1 · Viña Grande"]);
    expect(dato(item, "Superficie tratada")).toEqual(["3,5 ha"]);
    expect(dato(item, "Cultivo")).toEqual(["Vitis vinifera, Airén"]);
    expect(dato(item, "Semilla tratada con")).toEqual(["Tebuconazol"]);
    expect(dato(item, "Plaga o problema")).toEqual(["Mildiu"]);
    expect(dato(item, "Aplicador")).toEqual(["Juan Pérez (carné CM-13-0457)"]);
    expect(dato(item, "Asesor")).toEqual(["María López (carné AS-0099)"]);
    expect(dato(item, "Producto")).toEqual(["Cobre Nordox (nº de registro ES-00123)"]);
    expect(dato(item, "Cantidad")).toEqual(["2 kg"]);
    expect(dato(item, "Equipo de aplicación")).toEqual(["Pulverizador (ROMA ES13)"]);
    expect(dato(item, "Eficacia")).toEqual(["Buena"]);
    expect(dato(item, "Observaciones")).toEqual(["Sin viento"]);
  });

  it("escenario 4: cada producto con su cantidad y cada parcela, por su número de orden, con su superficie", async () => {
    const linea = tratamiento().parcelas[0] as TratamientoNuevo["parcelas"][number];
    await poner(
      tratamiento({
        parcelas: [
          { ...linea, superficieTratada: 1.5 },
          { ...linea, parcelaId: "par-2", superficieTratada: 2 },
        ],
        productos: [
          { productoId: "pro-1", cantidad: 2, unidadMedida: "kg" },
          { productoId: "pro-2", cantidad: 1.5, unidadMedida: "L" },
        ],
      }),
      "sincronizado",
    );
    render(<Cuaderno />);
    const item = await abrirDetalle("15/03/2026 · Mildiu");
    expect(dato(item, "Parcela")).toEqual(["Parcela 1 · Viña Grande", "Parcela 2"]);
    expect(dato(item, "Superficie tratada")).toEqual(["1,5 ha", "2 ha"]);
    expect(dato(item, "Producto")).toEqual([
      "Cobre Nordox (nº de registro ES-00123)",
      "Azufre líquido (nº de registro ES-00456)",
    ]);
    expect(dato(item, "Cantidad")).toEqual(["2 kg", "1,5 L"]);
  });

  it("sin los datos opcionales no los inventa", async () => {
    await poner(tratamiento(), "sincronizado");
    render(<Cuaderno />);
    const item = await abrirDetalle("15/03/2026 · Mildiu");
    expect(dato(item, "Eficacia")).toEqual(["Sin valorar"]);
    expect(item.queryByText("Asesor")).toBeNull();
    expect(item.queryByText("Observaciones")).toBeNull();
    expect(item.queryByText("Semilla tratada con")).toBeNull();
  });

  it("sigue mostrando los elementos dados de baja (REQ-17)", async () => {
    await base.parcelas.put({ ...PARCELA, estado: "baja" });
    await poner(tratamiento(), "sincronizado");
    render(<Cuaderno />);
    const item = await abrirDetalle("15/03/2026 · Mildiu");
    expect(dato(item, "Parcela")).toEqual(["Parcela 1 · Viña Grande"]);
  });

  it("si un elemento no está en el dispositivo usa el número de orden del servidor o lo dice", async () => {
    await base.parcelas.clear();
    await base.personas.clear();
    const t = tratamiento();
    const parcelas = t.parcelas.map((linea) => ({ ...linea, numeroOrden: 7 })); // como las da el servidor
    await poner({ ...t, parcelas }, "sincronizado");
    render(<Cuaderno />);
    const item = await abrirDetalle("15/03/2026 · Mildiu");
    expect(dato(item, "Parcela")).toEqual(["Parcela 7"]);
    expect(dato(item, "Aplicador")).toEqual(["No disponible en este dispositivo"]);
  });

  it("se puede volver a cerrar", async () => {
    await poner(tratamiento(), "sincronizado");
    render(<Cuaderno />);
    const item = await abrirDetalle("15/03/2026 · Mildiu");
    await userEvent.click(item.getByRole("button", { name: "Ocultar el detalle" }));
    expect(item.queryByText("Aplicador")).toBeNull();
  });
});

describe("dosis por hectárea (REQ-23; R15)", () => {
  const linea = tratamiento().parcelas[0] as TratamientoNuevo["parcelas"][number];
  const MEZCLA: Partial<TratamientoNuevo> = {
    parcelas: [
      { ...linea, superficieTratada: 1.5 },
      { ...linea, parcelaId: "par-2", superficieTratada: 2 },
    ],
    productos: [
      { productoId: "pro-1", cantidad: 2, unidadMedida: "kg" },
      { productoId: "pro-2", cantidad: 1.5, unidadMedida: "L" },
    ],
  };

  it.each(["pendiente", "sincronizado", "rechazado"] as const)(
    "escenario 6: 2 kg en 3,5 ha son 0,57 kg/ha, también sin conexión (%s)",
    async (estado) => {
      await poner(tratamiento(), estado);
      render(<Cuaderno />);
      const item = await abrirDetalle("15/03/2026 · Mildiu");
      expect(dato(item, "Cantidad")).toEqual(["2 kg"]);
      expect(dato(item, "Dosis")).toEqual(["0,57 kg/ha"]);
    },
  );

  it("escenario 7: cada producto de la mezcla con la superficie tratada total", async () => {
    await poner(tratamiento(MEZCLA), "pendiente");
    render(<Cuaderno />);
    const item = await abrirDetalle("15/03/2026 · Mildiu");
    expect(dato(item, "Dosis")).toEqual(["0,57 kg/ha", "0,43 L/ha"]);
  });

  it("se calcula a partir de los datos: no usa una dosis guardada", async () => {
    const productos = [{ productoId: "pro-1", cantidad: 3.5, unidadMedida: "kg" as const, dosisPorHectarea: 9 }];
    await poner(tratamiento({ productos }), "sincronizado");
    render(<Cuaderno />);
    const item = await abrirDetalle("15/03/2026 · Mildiu");
    expect(dato(item, "Dosis")).toEqual(["1,00 kg/ha"]);
  });
});

describe("registros rechazados (REQ-06, escenarios 9 y 10; R16)", () => {
  const MOTIVO = "Esta parcela está de baja y no se puede usar en un tratamiento nuevo.";

  async function conRechazado() {
    const t = await poner(tratamiento({ problema: "Oídio" }), "rechazado");
    await encolarRechazada("crear_tratamiento", t, [{ campo: "parcelas.0.parcelaId", mensaje: MOTIVO }]);
    render(<Cuaderno />);
    return { t, item: await elemento("15/03/2026 · Oídio") };
  }

  it("escenario 9: muestran su motivo en lenguaje llano", async () => {
    const { item } = await conRechazado();
    expect(item.getByText(MOTIVO)).toBeTruthy();
  });

  it("escenario 10: se pueden corregir en el formulario", async () => {
    const { t, item } = await conRechazado();
    await userEvent.click(item.getByRole("link", { name: "Corregir" }));
    expect(window.location.pathname).toBe(`/tratamiento/${t.id}/corregir`);
  });

  it("escenario 10: descartar pide confirmación y lo borra del dispositivo", async () => {
    const { t, item } = await conRechazado();
    await userEvent.click(item.getByRole("button", { name: "Descartar" }));
    expect(item.getByText(/¿Descartar este registro\?/)).toBeTruthy();
    await userEvent.click(item.getByRole("button", { name: "Cancelar" }));
    expect(await base.tratamientos.get(t.id)).toBeDefined();

    await userEvent.click(item.getByRole("button", { name: "Descartar" }));
    await userEvent.click(item.getByRole("button", { name: "Sí, descartar" }));
    await waitFor(() => expect(screen.queryByText("15/03/2026 · Oídio")).toBeNull());
    expect(await base.tratamientos.count()).toBe(0);
    expect(await base.cola.count()).toBe(0);
  });

  it("los demás no se pueden corregir ni descartar", async () => {
    await poner(tratamiento(), "pendiente");
    await poner(tratamiento({ problema: "Polilla" }), "sincronizado");
    render(<Cuaderno />);
    await screen.findByText("15/03/2026 · Mildiu");
    expect(screen.queryByRole("link", { name: "Corregir" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Descartar" })).toBeNull();
  });
});

describe("productos rechazados (REQ-06, REQ-16; R16)", () => {
  const MALO = { id: "pro-9", nombreComercial: "Sin aceptar", numeroRegistro: "X" };

  async function conProductoRechazado() {
    await base.productos.put({ ...MALO, ...activa });
    await encolarRechazada("crear_producto", MALO, [{ campo: "numeroRegistro", mensaje: "No es válido." }]);
  }

  async function seccion() {
    return within(await screen.findByRole("region", { name: "Productos rechazados" }));
  }

  it("muestran su motivo y se corrigen con un formulario con sus datos", async () => {
    await conProductoRechazado();
    render(<Cuaderno />);
    const productos = await seccion();
    expect(productos.getByText(/Sin aceptar/)).toBeTruthy();
    expect(productos.getByText("No es válido.")).toBeTruthy();
    await userEvent.click(productos.getByRole("button", { name: "Corregir" }));
    expect(productos.getByLabelText("Nombre comercial")).toHaveProperty("value", "Sin aceptar");
    const registro = productos.getByLabelText("Número de registro");
    await userEvent.clear(registro);
    await userEvent.click(productos.getByRole("button", { name: "Guardar la corrección" }));
    expect(productos.getByText("Falta el número de registro.")).toBeTruthy();
    await userEvent.type(registro, "ES-00999");
    await userEvent.click(productos.getByRole("button", { name: "Guardar la corrección" }));

    await waitFor(() => expect(screen.queryByRole("region", { name: "Productos rechazados" })).toBeNull());
    expect(await base.cola.toArray()).toMatchObject([
      { entidadId: "pro-9", estado: "pendiente", cuerpo: { ...MALO, numeroRegistro: "ES-00999" } },
    ]);
    expect(await base.productos.get("pro-9")).toMatchObject({ numeroRegistro: "ES-00999" });
  });

  it("se descartan con confirmación", async () => {
    await conProductoRechazado();
    render(<Cuaderno />);
    const productos = await seccion();
    await userEvent.click(productos.getByRole("button", { name: "Descartar" }));
    await userEvent.click(productos.getByRole("button", { name: "Sí, descartar" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Productos rechazados" })).toBeNull());
    expect(await base.productos.get("pro-9")).toBeUndefined();
  });

  it("si lo usa un tratamiento sin enviar explica qué hay que hacer antes", async () => {
    await conProductoRechazado();
    vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
    await guardarTratamiento(tratamiento({ productos: [{ productoId: "pro-9", cantidad: 1, unidadMedida: "kg" }] }));
    render(<Cuaderno />);
    const productos = await seccion();
    await userEvent.click(productos.getByRole("button", { name: "Descartar" }));
    await userEvent.click(productos.getByRole("button", { name: "Sí, descartar" }));
    expect(await productos.findByText(/lo usa un tratamiento sin enviar/)).toBeTruthy();
    expect(await base.productos.get("pro-9")).toBeDefined();
    vi.restoreAllMocks();
  });

  it("sin productos rechazados no hay sección", async () => {
    render(<Cuaderno />);
    await screen.findByText("Aún no has registrado ningún tratamiento.");
    expect(screen.queryByRole("region", { name: "Productos rechazados" })).toBeNull();
  });
});
