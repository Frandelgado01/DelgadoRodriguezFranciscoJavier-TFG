// Ejecutor en Vitest de los casos compartidos de validación (T-07; research R8).
//
// Recorre compartido/casos-validacion.json, el mismo fichero que recorre pytest en
// backend/tests/unit/test_casos_compartidos.py: si la implementación de TypeScript y la de Python de una
// regla divergen, falla la prueba de una de ellas. Cada caso es una prueba con su REQ-xx en el nombre.
import { describe, expect, it } from "vitest";
import datos from "../../compartido/casos-validacion.json";
import { validarContrasena, validarCorreo, validarTratamiento } from "../src/dominio/validacion";

interface Caso {
  req: string;
  regla: string;
  descripcion: string;
  entrada: unknown;
  esperado: unknown;
}

// Regla del fichero de casos → función del dominio que la implementa. Se amplía con cada regla nueva
// (contraseña y correo en T-17; REQ-02 y REQ-04 en T-32; plazos en T-45; dosis en T-74).
const reglas: Record<string, (entrada: never) => unknown> = {
  contrasena: validarContrasena,
  correo: validarCorreo,
  tratamiento: validarTratamiento,
};

const casos = (datos as { casos: Caso[] }).casos;
const nombre = (caso: Caso) => `${caso.req} ${caso.regla}: ${caso.descripcion}`;

describe("casos compartidos de validación (R8)", () => {
  it("el fichero tiene el formato acordado: regla, entrada, resultado esperado y REQ-xx", () => {
    for (const caso of casos) {
      expect(Object.keys(caso).sort(), nombre(caso)).toEqual(
        ["descripcion", "entrada", "esperado", "regla", "req"],
      );
      expect(caso.req, nombre(caso)).toMatch(/^REQ-\d{2}$/);
    }
    const nombres = casos.map(nombre);
    expect(new Set(nombres).size, "Hay casos con el mismo nombre").toBe(nombres.length);
  });

  for (const caso of casos) {
    it(nombre(caso), () => {
      const regla = reglas[caso.regla];
      expect(regla, `La regla ${caso.regla} no está implementada en TypeScript`).toBeDefined();
      expect(regla?.(caso.entrada as never)).toEqual(caso.esperado);
    });
  }
});
