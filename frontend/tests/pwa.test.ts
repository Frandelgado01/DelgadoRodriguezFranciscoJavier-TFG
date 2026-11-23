// Pruebas de la carcasa de la PWA (T-18; research R3 y R11; principio V).
//
// El service worker solo precachea la carcasa (generateSW) y NO usa Background Sync: la cola se vacía
// desde la app (R3), igual en Android y en iOS.
import { describe, expect, it } from "vitest";
import { opcionesPwa } from "../src/pwa/opciones";
import { resolverRuta, RUTAS } from "../src/navegacion";

describe("service worker (vite-plugin-pwa)", () => {
  it("usa generateSW y no registra Background Sync en ningún sitio", () => {
    expect(opcionesPwa.strategies).toBe("generateSW");
    expect(JSON.stringify(opcionesPwa).toLowerCase()).not.toContain("backgroundsync");
    expect(opcionesPwa.workbox?.runtimeCaching ?? []).toEqual([]);
  });

  it("solo precachea la carcasa de la app, no los datos", () => {
    expect(opcionesPwa.workbox?.globPatterns).toEqual(["**/*.{js,css,html,svg,png,ico,webmanifest}"]);
  });

  it("sirve la carcasa en cualquier ruta de la app, pero nunca en /api", () => {
    expect(opcionesPwa.workbox?.navigateFallback).toBe("/index.html");
    const excluidas = opcionesPwa.workbox?.navigateFallbackDenylist ?? [];
    expect(excluidas.some((patron) => patron.test("/api/tratamientos"))).toBe(true);
    expect(excluidas.some((patron) => patron.test("/tratamiento/nuevo"))).toBe(false);
  });

  it("tiene un manifiesto instalable en español", () => {
    const manifiesto = opcionesPwa.manifest;
    expect(manifiesto).toMatchObject({
      name: "Cuaderno de Campo",
      short_name: "Cuaderno",
      lang: "es",
      start_url: "/",
      scope: "/",
      display: "standalone",
    });
    const tamanos = manifiesto ? (manifiesto.icons ?? []).map((icono) => icono.sizes) : [];
    expect(tamanos).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  });
});

describe("navegación entre las páginas del plan", () => {
  it("resuelve cada ruta a su página", () => {
    expect(resolverRuta("/")).toEqual({ pagina: "cuaderno" });
    expect(resolverRuta("/entrar")).toEqual({ pagina: "entrar" });
    expect(resolverRuta("/crear-cuenta")).toEqual({ pagina: "crear-cuenta" });
    expect(resolverRuta("/recuperar")).toEqual({ pagina: "recuperar" });
    expect(resolverRuta("/restablecer")).toEqual({ pagina: "restablecer" });
    expect(resolverRuta("/tratamiento/nuevo")).toEqual({ pagina: "tratamiento" });
    expect(resolverRuta("/explotacion")).toEqual({ pagina: "explotacion" });
    expect(resolverRuta("/historial/3f0c")).toEqual({ pagina: "historial", id: "3f0c" });
  });

  it("una ruta desconocida lleva al cuaderno", () => {
    expect(resolverRuta("/no-existe")).toEqual({ pagina: "cuaderno" });
  });

  it("las páginas de cuenta no piden sesión y las demás sí", () => {
    const publicas = RUTAS.filter((ruta) => ruta.publica).map((ruta) => ruta.pagina);
    expect(publicas.sort()).toEqual(["crear-cuenta", "entrar", "recuperar", "restablecer"]);
  });
});
