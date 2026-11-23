// Pruebas del cliente de la API (T-15; research R7, R8 y R11): mismo origen, JSON y errores tipados.
import { afterEach, describe, expect, it, vi } from "vitest";
import { llamar } from "../../src/api/cliente";

function respuesta(estado: number, cuerpo?: unknown, cabeceras: Record<string, string> = {}) {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...(cuerpo === undefined ? {} : { "Content-Type": "application/json" }), ...cabeceras },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cliente de la API", () => {
  it("llama a /api en el mismo origen, con JSON y la cookie de sesión", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(respuesta(201, { correo: "a@b.es", explotacionId: "x" }));
    vi.stubGlobal("fetch", fetchFalso);

    const resultado = await llamar("POST", "/cuenta", { correo: "a@b.es", contrasena: "una frase larga" });

    expect(fetchFalso).toHaveBeenCalledWith("/api/cuenta", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ correo: "a@b.es", contrasena: "una frase larga" }),
      credentials: "same-origin",
    });
    expect(resultado).toEqual({ ok: true, estado: 201, datos: { correo: "a@b.es", explotacionId: "x" } });
  });

  it("no envía cuerpo ni Content-Type si no hay datos", async () => {
    const fetchFalso = vi.fn().mockResolvedValue(respuesta(204));
    vi.stubGlobal("fetch", fetchFalso);

    const resultado = await llamar("DELETE", "/sesion");

    expect(fetchFalso).toHaveBeenCalledWith("/api/sesion", {
      method: "DELETE",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    expect(resultado).toEqual({ ok: true, estado: 204, datos: undefined });
  });

  it("devuelve el error de la API con su estado, su cuerpo y sus cabeceras", async () => {
    const cuerpo = { mensaje: "Espera 15 minutos", segundosRestantes: 900 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(429, cuerpo, { "Retry-After": "900" })));

    const resultado = await llamar("POST", "/sesion", { correo: "a@b.es", contrasena: "x".repeat(15) });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.estado).toBe(429);
    expect(resultado.error).toEqual(cuerpo);
    expect(resultado.cabeceras.get("Retry-After")).toBe("900");
  });

  it("distingue la falta de conexión (estado 0) de un error de la API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const resultado = await llamar("GET", "/cuenta/yo");

    expect(resultado).toMatchObject({ ok: false, estado: 0, sinConexion: true });
  });
});
