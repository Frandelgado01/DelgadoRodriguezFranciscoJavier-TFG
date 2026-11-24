// @vitest-environment jsdom
// Pruebas de componentes de las páginas de datos de la explotación (T-29; REQ-14, REQ-15, REQ-16 y REQ-17).
//
// Con conexión: listar, dar de alta, modificar y dar de baja parcelas, personas, equipos y productos. Las parcelas
// se identifican por su número de orden y su nombre; el formulario pide aprovechamiento y "cultivo leñoso", con
// especie y variedad obligatorias si se marca; los rechazos de la API salen junto al campo.
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { base } from "../../src/db/base";
import { Explotacion } from "../../src/paginas/explotacion/Explotacion";
import { guardarSesion } from "../../src/sesion";

type Elemento = Record<string, unknown> & { id: string; estado: string };
type Recurso = "parcelas" | "personas" | "equipos" | "productos";

interface Llamada {
  metodo: string;
  ruta: string;
  cuerpo: unknown;
}

function json(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
}

/** API falsa en memoria con las reglas del contrato que usan las páginas. */
class ServidorFalso {
  datos: Record<Recurso, Elemento[]> = { parcelas: [], personas: [], equipos: [], productos: [] };
  llamadas: Llamada[] = [];
  /** Respuesta forzada para la próxima petición que no sea GET. */
  siguiente: Response | Error | null = null;
  sinConexion = false;
  private contador = 0;

  constructor() {
    vi.stubGlobal("fetch", vi.fn(async (url: string, opciones: RequestInit) => this.atender(url, opciones)));
  }

  cambios(): Llamada[] {
    return this.llamadas.filter((l) => l.metodo !== "GET");
  }

  private atender(url: string, opciones: RequestInit): Response {
    const metodo = opciones.method ?? "GET";
    const ruta = url.replace(/^\/api/, "");
    const cuerpo = opciones.body ? (JSON.parse(String(opciones.body)) as Record<string, unknown>) : undefined;
    this.llamadas.push({ metodo, ruta, cuerpo });
    if (this.sinConexion) throw new TypeError("Failed to fetch");
    if (metodo !== "GET" && this.siguiente) {
      const forzada = this.siguiente;
      this.siguiente = null;
      if (forzada instanceof Error) throw forzada;
      return forzada;
    }
    const [, recurso, id, accion] = ruta.split("/") as [string, Recurso, string?, string?];
    const lista = this.datos[recurso];
    if (metodo === "GET") return json(200, lista.filter((e) => e.estado === "activa"));
    if (metodo === "POST" && id === undefined) {
      this.contador += 1;
      const nuevo: Elemento = {
        id: `00000000-0000-4000-8000-${String(this.contador).padStart(12, "0")}`,
        ...cuerpo,
        estado: "activa",
        fechaBaja: null,
      };
      if (recurso === "parcelas") nuevo["numeroOrden"] = lista.length + 1;
      lista.push(nuevo);
      return json(201, nuevo);
    }
    const elemento = lista.find((e) => e.id === id);
    if (!elemento) return json(404, { mensaje: "No existe en tu explotación." });
    if (metodo === "PUT") Object.assign(elemento, cuerpo);
    if (accion === "baja") Object.assign(elemento, { estado: "baja", fechaBaja: "2026-03-15" });
    return json(200, elemento);
  }
}

const PARCELA: Elemento = {
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

let servidor: ServidorFalso;

function seccion(nombre: string) {
  return within(screen.getByRole("region", { name: nombre }));
}

function elemento(nombre: string, texto: string) {
  const item = seccion(nombre).getByText(texto).closest("li");
  if (!item) throw new Error(`No hay elemento ${texto}`);
  return within(item);
}

async function escribir(etiqueta: string, texto: string, ambito: Pick<typeof screen, "getByLabelText"> = screen) {
  const campo = ambito.getByLabelText(etiqueta);
  await userEvent.clear(campo);
  await userEvent.type(campo, texto);
}

beforeEach(async () => {
  await base.delete();
  await base.open();
  servidor = new ServidorFalso();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("parcelas (REQ-14)", () => {
  it("se listan por su número de orden, con el nombre si lo tienen", async () => {
    servidor.datos.parcelas = [PARCELA, { ...PARCELA, id: "p2", numeroOrden: 2, nombre: null }];
    render(<Explotacion />);
    expect(await seccion("Parcelas").findByText("Parcela 1 · Viña Grande")).toBeTruthy();
    expect(seccion("Parcelas").getByText("Parcela 2")).toBeTruthy();
    expect(seccion("Parcelas").getAllByText(/SIGPAC 13:53:0:0:12:345:1 · 4,2 ha/)).toHaveLength(2);
  });

  it("da de alta una parcela leñosa con todos sus datos y la guarda en el dispositivo", async () => {
    render(<Explotacion />);
    await userEvent.click(await seccion("Parcelas").findByRole("button", { name: "Añadir parcela" }));
    const formulario = within(screen.getByRole("form", { name: "Nueva parcela" }));

    await escribir("Nombre (opcional)", "Viña Grande", formulario);
    for (const [etiqueta, valor] of [
      ["Provincia", "13"],
      ["Municipio", "53"],
      ["Agregado", "0"],
      ["Zona", "0"],
      ["Polígono", "12"],
      ["Parcela", "345"],
      ["Recinto", "1"],
    ] as const) {
      await escribir(etiqueta, valor, formulario);
    }
    await escribir("Superficie (ha)", "4,2", formulario);
    await escribir("Uso SIGPAC", "VI", formulario);
    await userEvent.selectOptions(formulario.getByLabelText("Aprovechamiento"), "cultivo");
    await userEvent.click(formulario.getByLabelText("Cultivo leñoso"));
    await escribir("Especie", "Vitis vinifera", formulario);
    await escribir("Variedad", "Airén", formulario);
    await escribir("Marco de control de plagas (opcional)", "Gestión integrada de plagas", formulario);
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));

    expect(await seccion("Parcelas").findByText("Parcela 1 · Viña Grande")).toBeTruthy();
    expect(servidor.cambios()).toEqual([
      {
        metodo: "POST",
        ruta: "/parcelas",
        cuerpo: {
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
          marcoControlPlagas: "Gestión integrada de plagas",
        },
      },
    ]);
    expect(screen.queryByRole("form", { name: "Nueva parcela" })).toBeNull();
    expect((await base.parcelas.toArray()).map((p) => p["nombre"])).toEqual(["Viña Grande"]);
  });

  it("especie y variedad son obligatorias solo si el cultivo es leñoso, y leñoso solo en cultivos", async () => {
    render(<Explotacion />);
    await userEvent.click(await seccion("Parcelas").findByRole("button", { name: "Añadir parcela" }));
    const formulario = within(screen.getByRole("form", { name: "Nueva parcela" }));

    expect(formulario.getByLabelText("Especie (opcional)")).toHaveProperty("required", false);
    await userEvent.click(formulario.getByLabelText("Cultivo leñoso"));
    expect(formulario.getByLabelText("Especie")).toHaveProperty("required", true);
    expect(formulario.getByLabelText("Variedad")).toHaveProperty("required", true);

    await userEvent.selectOptions(formulario.getByLabelText("Aprovechamiento"), "pastos");
    expect(formulario.queryByLabelText("Cultivo leñoso")).toBeNull();
  });

  it("pide el sistema de riego en regadío y el tipo de protección si está protegido", async () => {
    render(<Explotacion />);
    await userEvent.click(await seccion("Parcelas").findByRole("button", { name: "Añadir parcela" }));
    const formulario = within(screen.getByRole("form", { name: "Nueva parcela" }));

    expect(formulario.queryByLabelText("Sistema de riego")).toBeNull();
    await userEvent.selectOptions(formulario.getByLabelText("Sistema de explotación"), "regadio");
    expect(formulario.getByLabelText("Sistema de riego")).toBeTruthy();

    expect(formulario.queryByLabelText("Tipo de protección")).toBeNull();
    await userEvent.click(formulario.getByLabelText("Cultivo protegido (invernadero, malla…)"));
    expect(formulario.getByLabelText("Tipo de protección")).toBeTruthy();
  });

  it("muestra los rechazos de la API junto a su campo", async () => {
    render(<Explotacion />);
    await userEvent.click(await seccion("Parcelas").findByRole("button", { name: "Añadir parcela" }));
    const formulario = within(screen.getByRole("form", { name: "Nueva parcela" }));
    await userEvent.click(formulario.getByLabelText("Cultivo leñoso"));
    servidor.siguiente = json(422, {
      errores: [
        { campo: "cultivoEspecie", mensaje: "En un cultivo leñoso hay que indicar la especie.", req: "REQ-14" },
        { campo: "sigpac.recinto", mensaje: "Tiene que ser 1 o más.", req: null },
      ],
    });
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));

    const especie = await formulario.findByLabelText("Especie");
    await waitFor(() => expect(especie.getAttribute("aria-invalid")).toBe("true"));
    const descripcion = especie.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(descripcion)?.textContent).toBe("En un cultivo leñoso hay que indicar la especie.");
    expect(formulario.getByLabelText("Recinto").getAttribute("aria-invalid")).toBe("true");
    expect(formulario.getByText("Tiene que ser 1 o más.")).toBeTruthy();
  });

  it("explica en lenguaje llano una referencia SIGPAC repetida (409)", async () => {
    render(<Explotacion />);
    await userEvent.click(await seccion("Parcelas").findByRole("button", { name: "Añadir parcela" }));
    const formulario = within(screen.getByRole("form", { name: "Nueva parcela" }));
    servidor.siguiente = json(409, { mensaje: "Ya tienes una parcela activa con esa referencia SIGPAC." });
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));
    expect(await formulario.findByText("Ya tienes una parcela activa con esa referencia SIGPAC.")).toBeTruthy();
  });

  it("modifica una parcela con sus datos ya rellenos", async () => {
    servidor.datos.parcelas = [{ ...PARCELA }];
    render(<Explotacion />);
    await seccion("Parcelas").findByText("Parcela 1 · Viña Grande");
    await userEvent.click(elemento("Parcelas", "Parcela 1 · Viña Grande").getByRole("button", { name: "Modificar" }));
    const formulario = within(screen.getByRole("form", { name: "Modificar la parcela 1" }));
    expect(formulario.getByLabelText("Especie")).toHaveProperty("value", "Vitis vinifera");
    expect(formulario.getByLabelText("Superficie (ha)")).toHaveProperty("value", "4,2");

    await escribir("Superficie (ha)", "3,75", formulario);
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));

    expect(await seccion("Parcelas").findByText(/3,75 ha/)).toBeTruthy();
    const [cambio] = servidor.cambios();
    expect(cambio?.metodo).toBe("PUT");
    expect(cambio?.ruta).toBe(`/parcelas/${PARCELA.id}`);
    expect(cambio?.cuerpo).toMatchObject({ superficie: 3.75, cultivoEspecie: "Vitis vinifera", nombre: "Viña Grande" });
    expect(cambio?.cuerpo).not.toHaveProperty("numeroOrden");
  });

  it("da de baja una parcela tras confirmarlo y deja de ofrecerla", async () => {
    servidor.datos.parcelas = [{ ...PARCELA }];
    await base.parcelas.put({ ...PARCELA });
    render(<Explotacion />);
    await seccion("Parcelas").findByText("Parcela 1 · Viña Grande");
    const item = elemento("Parcelas", "Parcela 1 · Viña Grande");
    await userEvent.click(item.getByRole("button", { name: "Dar de baja" }));
    expect(servidor.cambios()).toEqual([]);
    await userEvent.click(item.getByRole("button", { name: "Sí, dar de baja" }));

    await waitFor(() => expect(seccion("Parcelas").queryByText("Parcela 1 · Viña Grande")).toBeNull());
    expect(servidor.cambios()).toEqual([{ metodo: "POST", ruta: `/parcelas/${PARCELA.id}/baja`, cuerpo: undefined }]);
    expect(await base.parcelas.count()).toBe(0);
  });
});

describe("personas y equipos (REQ-15)", () => {
  it("da de alta un aplicador con su número de carné y sin otros datos personales", async () => {
    render(<Explotacion />);
    await userEvent.click(await seccion("Aplicadores y asesores").findByRole("button", { name: "Añadir persona" }));
    const formulario = within(screen.getByRole("form", { name: "Nueva persona" }));
    await escribir("Nombre", "Juan Pérez", formulario);
    await userEvent.selectOptions(formulario.getByLabelText("Tipo"), "aplicador");
    await escribir("Número de carné", "CM-13-0457", formulario);
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));

    expect(await seccion("Aplicadores y asesores").findByText("Juan Pérez")).toBeTruthy();
    expect(seccion("Aplicadores y asesores").getByText("Aplicador · carné CM-13-0457")).toBeTruthy();
    expect(servidor.cambios()[0]?.cuerpo).toEqual({ nombre: "Juan Pérez", tipo: "aplicador", numeroCarne: "CM-13-0457" });
  });

  it("modifica y da de baja a una persona", async () => {
    servidor.datos.personas = [
      { id: "pe1", nombre: "María López", tipo: "asesor", numeroCarne: "AS-1", estado: "activa", fechaBaja: null },
    ];
    render(<Explotacion />);
    await seccion("Aplicadores y asesores").findByText("María López");
    await userEvent.click(elemento("Aplicadores y asesores", "María López").getByRole("button", { name: "Modificar" }));
    const formulario = within(screen.getByRole("form", { name: "Modificar a María López" }));
    await escribir("Número de carné", "AS-2", formulario);
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));
    expect(await seccion("Aplicadores y asesores").findByText("Asesor · carné AS-2")).toBeTruthy();

    const item = elemento("Aplicadores y asesores", "María López");
    await userEvent.click(item.getByRole("button", { name: "Dar de baja" }));
    await userEvent.click(item.getByRole("button", { name: "Sí, dar de baja" }));
    await waitFor(() => expect(seccion("Aplicadores y asesores").queryByText("María López")).toBeNull());
  });

  it("da de alta un equipo con número ROMA y muestra el rechazo de la fecha junto al campo", async () => {
    render(<Explotacion />);
    await userEvent.click(await seccion("Equipos de aplicación").findByRole("button", { name: "Añadir equipo" }));
    const formulario = within(screen.getByRole("form", { name: "Nuevo equipo" }));
    await escribir("Descripción", "Pulverizador hidráulico", formulario);
    await escribir("Fecha de adquisición o de la última inspección", "2027-01-01", formulario);
    await escribir("Número ROMA o referencia censal (si procede)", "ES130530000123", formulario);
    servidor.siguiente = json(422, {
      errores: [
        {
          campo: "fechaAdquisicionOInspeccion",
          mensaje: "La fecha de adquisición o de la última inspección no puede ser posterior a hoy.",
          req: "REQ-15",
        },
      ],
    });
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));
    expect(await formulario.findByText(/no puede ser posterior a hoy/)).toBeTruthy();

    await escribir("Fecha de adquisición o de la última inspección", "2025-05-20", formulario);
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));
    expect(await seccion("Equipos de aplicación").findByText("Pulverizador hidráulico")).toBeTruthy();
    expect(seccion("Equipos de aplicación").getByText("ROMA ES130530000123 · 20/05/2025")).toBeTruthy();
    expect(servidor.cambios().at(-1)?.cuerpo).toEqual({
      descripcion: "Pulverizador hidráulico",
      fechaAdquisicionOInspeccion: "2025-05-20",
      numeroRoma: "ES130530000123",
    });
  });
});

describe("productos (REQ-16, REQ-17)", () => {
  it("da de alta un producto con un id generado en el dispositivo y lo da de baja", async () => {
    render(<Explotacion />);
    await userEvent.click(await seccion("Productos fitosanitarios").findByRole("button", { name: "Añadir producto" }));
    const formulario = within(screen.getByRole("form", { name: "Nuevo producto" }));
    await escribir("Nombre comercial", "Cobre Nordox 75 WG", formulario);
    await escribir("Número de registro", "ES-00123", formulario);
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));

    expect(await seccion("Productos fitosanitarios").findByText("Cobre Nordox 75 WG")).toBeTruthy();
    const cuerpo = servidor.cambios()[0]?.cuerpo as Record<string, string>;
    expect(cuerpo["id"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(cuerpo).toEqual({ id: cuerpo["id"], nombreComercial: "Cobre Nordox 75 WG", numeroRegistro: "ES-00123" });

    const item = elemento("Productos fitosanitarios", "Cobre Nordox 75 WG");
    expect(item.queryByRole("button", { name: "Modificar" })).toBeNull();
    await userEvent.click(item.getByRole("button", { name: "Dar de baja" }));
    await userEvent.click(item.getByRole("button", { name: "Sí, dar de baja" }));
    await waitFor(() => expect(seccion("Productos fitosanitarios").queryByText("Cobre Nordox 75 WG")).toBeNull());
  });
});

describe("reintento del alta de un producto (REQ-16, REQ-06; R4)", () => {
  async function abrirYRellenar() {
    await userEvent.click(await seccion("Productos fitosanitarios").findByRole("button", { name: "Añadir producto" }));
    const formulario = within(screen.getByRole("form", { name: "Nuevo producto" }));
    await escribir("Nombre comercial", "Cobre Nordox 75 WG", formulario);
    await escribir("Número de registro", "ES-00123", formulario);
    return formulario;
  }
  const ids = () => servidor.cambios().map((cambio) => (cambio.cuerpo as Record<string, string>)["id"]);

  it("si se pierde la respuesta, volver a guardar envía el mismo id", async () => {
    render(<Explotacion />);
    const formulario = await abrirYRellenar();
    servidor.siguiente = new TypeError("Failed to fetch");
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));
    await formulario.findByText(/No hay conexión/);
    await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));
    await seccion("Productos fitosanitarios").findByText("Cobre Nordox 75 WG");
    expect(ids()).toHaveLength(2);
    expect(ids()[1]).toBe(ids()[0]);
  });

  it("cada alta nueva lleva un id distinto", async () => {
    render(<Explotacion />);
    for (let alta = 1; alta <= 2; alta += 1) {
      const formulario = await abrirYRellenar();
      await userEvent.click(formulario.getByRole("button", { name: "Guardar" }));
      await waitFor(() => expect(screen.queryByRole("form", { name: "Nuevo producto" })).toBeNull());
    }
    expect(new Set(ids()).size).toBe(2);
  });
});

describe("sin conexión", () => {
  it("muestra los datos guardados en el dispositivo y avisa de que para cambiarlos hace falta conexión", async () => {
    await base.parcelas.put({ ...PARCELA });
    servidor.sinConexion = true;
    render(<Explotacion />);
    expect(await seccion("Parcelas").findByText("Parcela 1 · Viña Grande")).toBeTruthy();
    expect(seccion("Parcelas").getByText(/Sin conexión/)).toBeTruthy();
    expect(seccion("Parcelas").queryByRole("button", { name: "Añadir parcela" })).toBeNull();
    expect(seccion("Parcelas").queryByRole("button", { name: "Dar de baja" })).toBeNull();
  });
});

describe("navegación", () => {
  it("la página /explotacion muestra los datos de la explotación y el cuaderno enlaza con ella", async () => {
    await guardarSesion({ correo: "ana@example.com", explotacionId: "6d1f2a90-0000-4000-8000-000000000001" });
    window.history.replaceState(null, "", "/");
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: "Datos de la explotación" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Datos de la explotación" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Parcelas" })).toBeTruthy();
    expect(window.location.pathname).toBe("/explotacion");
  });
});
