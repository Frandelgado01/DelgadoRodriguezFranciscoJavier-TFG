// Prueba de humo del esqueleto (T-01): el módulo de entrada se carga.
import { describe, expect, it } from "vitest";

describe("esqueleto de la PWA", () => {
  it("carga el módulo de entrada", async () => {
    await expect(import("../src/main")).resolves.toBeDefined();
    const { App } = await import("../src/App");
    expect(typeof App).toBe("function");
  });
});
