// @vitest-environment jsdom
// Pruebas de componentes de las páginas de cuenta (T-19; REQ-20, REQ-21 y REQ-22; research R9).
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App";
import { abrirBase, dispositivo } from "../../src/db/base";
import type { BaseLocal } from "../../src/db/esquema";
import { CerrarSesion } from "../../src/paginas/cuenta/CerrarSesion";
import { CrearCuenta } from "../../src/paginas/cuenta/CrearCuenta";
import { Entrar } from "../../src/paginas/cuenta/Entrar";
import { Recuperar } from "../../src/paginas/cuenta/Recuperar";
import { Restablecer } from "../../src/paginas/cuenta/Restablecer";
import { leerSesion } from "../../src/sesion";
import { prepararBase } from "../ayudas";

const CUENTA = { correo: "ana@example.com", explotacionId: "6d1f2a90-0000-4000-8000-000000000001" };
const FRASE = "una frase larga de ejemplo";

let base: BaseLocal;

type Respuestas = Record<string, Response | Error>;

function json(estado: number, cuerpo: unknown, cabeceras: Record<string, string> = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json", ...cabeceras },
  });
}

function vacia(estado: number) {
  return new Response(null, { status: estado });
}

/** Sustituye fetch: responde según "MÉTODO /api/ruta" y guarda las llamadas. */
function simularApi(respuestas: Respuestas) {
  const llamadas: { clave: string; cuerpo: unknown }[] = [];
  const falso = vi.fn(async (url: string, opciones: RequestInit) => {
    const clave = `${opciones.method} ${url}`;
    llamadas.push({ clave, cuerpo: opciones.body ? JSON.parse(String(opciones.body)) : undefined });
    const respuesta = respuestas[clave];
    if (respuesta === undefined) throw new Error(`Llamada no prevista: ${clave}`);
    if (respuesta instanceof Error) throw respuesta;
    return respuesta.clone();
  });
  vi.stubGlobal("fetch", falso);
  return llamadas;
}

function irA(camino: string) {
  window.history.replaceState(null, "", camino);
}

beforeEach(async () => {
  base = await prepararBase(CUENTA.explotacionId);
  irA("/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("crear cuenta (REQ-20)", () => {
  it("sugiere usar una frase como contraseña", () => {
    render(<CrearCuenta />);
    expect(screen.getByText(/usa una frase/i)).toBeTruthy();
  });

  it("no envía nada si la contraseña es corta o el correo no es válido", async () => {
    const llamadas = simularApi({});
    render(<CrearCuenta />);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@");
    await userEvent.type(screen.getByLabelText("Contraseña"), "corta");
    await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(screen.getByText("La contraseña debe tener entre 15 y 128 caracteres.")).toBeTruthy();
    expect(screen.getByText(/Escribe un correo electrónico válido/)).toBeTruthy();
    expect(llamadas).toEqual([]);
  });

  it("crea la cuenta, guarda la sesión en el dispositivo y abre el cuaderno", async () => {
    const llamadas = simularApi({ "POST /api/cuenta": json(201, CUENTA) });
    irA("/crear-cuenta");
    render(<CrearCuenta />);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), CUENTA.correo);
    await userEvent.type(screen.getByLabelText("Contraseña"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(llamadas[0]).toEqual({ clave: "POST /api/cuenta", cuerpo: { correo: CUENTA.correo, contrasena: FRASE } });
    // Después descarga los datos maestros (T-28) y los tratamientos (T-83); aquí fallan y no impiden abrirlo.
    expect(llamadas.slice(1).map((l) => l.clave).sort()).toEqual([
      "GET /api/equipos",
      "GET /api/parcelas",
      "GET /api/personas",
      "GET /api/productos",
      "GET /api/tratamientos?pagina=1&tamano=200",
    ]);
    expect(await leerSesion()).toEqual(CUENTA);
  });

  it("explica en lenguaje llano que el correo ya tiene cuenta", async () => {
    simularApi({ "POST /api/cuenta": json(409, { mensaje: "Ya existe una cuenta con ese correo." }) });
    render(<CrearCuenta />);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), CUENTA.correo);
    await userEvent.type(screen.getByLabelText("Contraseña"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));

    expect(await screen.findByText("Ya existe una cuenta con ese correo.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "He olvidado mi contraseña" })).toBeTruthy();
  });
});

describe("iniciar sesión (REQ-20, REQ-22)", () => {
  async function entrar() {
    render(<Entrar />);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), CUENTA.correo);
    await userEvent.type(screen.getByLabelText("Contraseña"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  }

  it("entra, guarda la sesión y abre el cuaderno", async () => {
    simularApi({ "POST /api/sesion": vacia(204), "GET /api/cuenta/yo": json(200, CUENTA) });
    irA("/entrar");
    await entrar();
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(await leerSesion()).toEqual(CUENTA);
  });

  it("muestra el mensaje genérico si el correo o la contraseña no son correctos", async () => {
    simularApi({ "POST /api/sesion": json(401, { mensaje: "Correo o contraseña incorrectos" }) });
    await entrar();
    expect(await screen.findByText("Correo o contraseña incorrectos")).toBeTruthy();
    expect(await leerSesion()).toBeNull();
  });

  it("con 429 explica la espera con los minutos que faltan y ofrece recuperar la contraseña", async () => {
    simularApi({
      "POST /api/sesion": json(
        429,
        { mensaje: "Has fallado la contraseña 5 veces. Espera 10 minutos o recupera tu contraseña.", segundosRestantes: 600 },
        { "Retry-After": "600" },
      ),
    });
    await entrar();
    expect(await screen.findByText(/Espera 10 minutos/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Recuperar la contraseña" }).getAttribute("href")).toBe("/recuperar");
  });

  it("si no hay conexión lo dice, sin culpar a la contraseña", async () => {
    simularApi({ "POST /api/sesion": new TypeError("Failed to fetch") });
    await entrar();
    expect(await screen.findByText(/No hay conexión/)).toBeTruthy();
  });

  it("tiene el enlace He olvidado mi contraseña", () => {
    render(<Entrar />);
    expect(screen.getByRole("link", { name: "He olvidado mi contraseña" }).getAttribute("href")).toBe("/recuperar");
  });
});

describe("si falla la descarga de los datos al entrar (REQ-06, REQ-20; R3)", () => {
  // Una respuesta 200 que no es JSON, como la página de acceso de una red wifi.
  const HTML = new Response("<!doctype html><title>Otra cosa</title>", { headers: { "Content-Type": "text/html" } });
  const LISTAS = ["parcelas", "personas", "equipos", "productos"].map((almacen) => `GET /api/${almacen}`);
  const todas = (respuesta: Response) => Object.fromEntries(LISTAS.map((clave) => [clave, respuesta]));
  const TRATAMIENTOS = { "GET /api/tratamientos?pagina=1&tamano=200": HTML };
  const CASOS: [string, Respuestas][] = [
    ["todos los datos", { ...todas(HTML), ...TRATAMIENTOS }],
    ["solo los tratamientos", { ...todas(json(200, [])), ...TRATAMIENTOS }],
  ];

  async function rellenar(boton: string) {
    await userEvent.type(screen.getByLabelText("Correo electrónico"), CUENTA.correo);
    await userEvent.type(screen.getByLabelText("Contraseña"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: boton }));
    // Un error sin capturar también haría fallar la ejecución de Vitest.
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(await leerSesion()).toEqual(CUENTA);
  }

  it.each(CASOS)("REQ-06, REQ-20: Entrar abre el cuaderno con la sesión guardada (fallan %s)", async (_, datos) => {
    simularApi({ "POST /api/sesion": vacia(204), "GET /api/cuenta/yo": json(200, CUENTA), ...datos });
    irA("/entrar");
    render(<Entrar />);
    await rellenar("Entrar");
  });

  it.each(CASOS)("REQ-06, REQ-20: Crear cuenta abre el cuaderno con la sesión guardada (fallan %s)", async (_, datos) => {
    simularApi({ "POST /api/cuenta": json(201, CUENTA), ...datos });
    irA("/crear-cuenta");
    render(<CrearCuenta />);
    await rellenar("Crear cuenta");
  });
});

describe("recuperar la contraseña (REQ-21)", () => {
  it("pide el enlace y muestra la respuesta, que es la misma exista o no la cuenta", async () => {
    const mensaje = "Si hay una cuenta con ese correo, te hemos enviado un enlace para restablecer la contraseña. Caduca en 1 hora.";
    const llamadas = simularApi({ "POST /api/cuenta/recuperacion": json(202, { mensaje }) });
    render(<Recuperar />);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), CUENTA.correo);
    await userEvent.click(screen.getByRole("button", { name: "Enviarme el enlace" }));

    expect(await screen.findByText(mensaje)).toBeTruthy();
    expect(llamadas[0]).toEqual({ clave: "POST /api/cuenta/recuperacion", cuerpo: { correo: CUENTA.correo } });
  });

  it("no envía un correo mal escrito", async () => {
    const llamadas = simularApi({});
    render(<Recuperar />);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana");
    await userEvent.click(screen.getByRole("button", { name: "Enviarme el enlace" }));
    expect(screen.getByText(/Escribe un correo electrónico válido/)).toBeTruthy();
    expect(llamadas).toEqual([]);
  });
});

describe("restablecer la contraseña (REQ-21)", () => {
  const TOKEN = "t".repeat(43);

  it("usa el token del enlace, lo quita de la barra de direcciones y cambia la contraseña", async () => {
    const llamadas = simularApi({ "POST /api/cuenta/recuperacion/confirmar": vacia(204) });
    irA(`/restablecer?token=${TOKEN}`);
    render(<Restablecer />);
    expect(window.location.search).toBe("");

    await userEvent.type(screen.getByLabelText("Contraseña nueva"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: "Guardar la contraseña" }));

    expect(await screen.findByText(/Contraseña cambiada/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe("/entrar");
    expect(llamadas[0]).toEqual({
      clave: "POST /api/cuenta/recuperacion/confirmar",
      cuerpo: { token: TOKEN, contrasena: FRASE },
    });
  });

  it("si el enlace ya no vale lo dice y ofrece pedir otro", async () => {
    simularApi({
      "POST /api/cuenta/recuperacion/confirmar": json(400, { mensaje: "El enlace no es válido o ha caducado. Pide otro." }),
    });
    irA(`/restablecer?token=${TOKEN}`);
    render(<Restablecer />);
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), FRASE);
    await userEvent.click(screen.getByRole("button", { name: "Guardar la contraseña" }));

    expect(await screen.findByText("El enlace no es válido o ha caducado. Pide otro.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Pedir otro enlace" }).getAttribute("href")).toBe("/recuperar");
  });

  it("sugiere una frase y no envía una contraseña corta", async () => {
    const llamadas = simularApi({});
    irA(`/restablecer?token=${TOKEN}`);
    render(<Restablecer />);
    expect(screen.getByText(/usa una frase/i)).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "corta");
    await userEvent.click(screen.getByRole("button", { name: "Guardar la contraseña" }));
    expect(screen.getByText("La contraseña debe tener entre 15 y 128 caracteres.")).toBeTruthy();
    expect(llamadas).toEqual([]);
  });

  it("sin token en el enlace avisa y ofrece pedir otro", () => {
    irA("/restablecer");
    render(<Restablecer />);
    expect(screen.getByText(/El enlace no es válido/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Pedir otro enlace" })).toBeTruthy();
  });
});

describe("cerrar sesión (REQ-20; R9)", () => {
  async function conDatosLocales(operacionesEnCola: number) {
    await dispositivo.meta.put({ clave: "sesion", valor: CUENTA });
    await base.tratamientos.add({ id: "t1", fecha: "2026-03-10", estadoSincronizacion: "sincronizado", parcelaIds: [], productoIds: [] });
    for (let i = 0; i < operacionesEnCola; i += 1) {
      await base.cola.add({
        idOperacion: `op-${i}`,
        tipo: "crear_tratamiento",
        entidadId: `t${i}`,
        versionBase: null,
        cuerpo: {},
        creadaEn: "2026-03-15T10:00:00Z",
        intentos: 0,
        estado: "pendiente",
        errores: [],
      });
    }
  }

  it("con la cola vacía cierra la sesión en el servidor y borra los datos del dispositivo", async () => {
    await conDatosLocales(0);
    const llamadas = simularApi({ "DELETE /api/sesion": vacia(204) });
    render(<CerrarSesion />);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(window.location.pathname).toBe("/entrar"));
    expect(llamadas.map((l) => l.clave)).toEqual(["DELETE /api/sesion"]);
    expect(await leerSesion()).toBeNull();
    expect(await abrirBase(CUENTA.explotacionId).tratamientos.count()).toBe(0);
  });

  it("con registros sin enviar avisa y no borra nada", async () => {
    await conDatosLocales(2);
    const llamadas = simularApi({});
    render(<CerrarSesion />);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByText(/Tienes 2 registros sin enviar/)).toBeTruthy();
    expect(llamadas).toEqual([]);
    expect(await base.cola.count()).toBe(2);
    expect(await leerSesion()).toEqual(CUENTA);
  });

  it("si aun así se cierra, conserva los registros pendientes en el dispositivo", async () => {
    await conDatosLocales(2);
    simularApi({ "DELETE /api/sesion": vacia(204) });
    render(<CerrarSesion />);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cerrar sesión sin borrar los registros" }));

    await waitFor(() => expect(window.location.pathname).toBe("/entrar"));
    expect(await leerSesion()).toBeNull();
    base = abrirBase(CUENTA.explotacionId);
    expect(await base.cola.count()).toBe(2);
    expect(await base.tratamientos.count()).toBe(1);
  });
});

describe("acceso a las páginas (REQ-20)", () => {
  it("sin sesión en el dispositivo el cuaderno lleva a Entrar", async () => {
    irA("/");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Entrar" })).toBeTruthy();
  });

  it("con la sesión guardada el cuaderno se abre aunque no haya conexión", async () => {
    await dispositivo.meta.put({ clave: "sesion", valor: CUENTA });
    simularApi({});
    irA("/");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Cuaderno" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  });

  it("las páginas de cuenta se abren sin sesión", async () => {
    irA("/crear-cuenta");
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Crear cuenta" })).toBeTruthy();
  });
});
