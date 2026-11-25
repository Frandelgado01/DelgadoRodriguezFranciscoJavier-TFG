// Pruebas del esquema local de la PWA en IndexedDB con Dexie (T-16; data-model, "Almacenamiento local";
// research R3). Base de REQ-06, que se prueba con la cola y la sincronización en T-24, T-37 y T-39.
import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { BaseLocal } from "../../src/db/esquema";

let base: BaseLocal;
let contador = 0;

function abrir(): BaseLocal {
  contador += 1;
  base = new BaseLocal(`cuaderno-prueba-${contador}`);
  return base;
}

afterEach(async () => {
  await base.delete();
});

function describir(base: BaseLocal) {
  return Object.fromEntries(
    base.tables.map((tabla) => [
      tabla.name,
      {
        clave: tabla.schema.primKey.keyPath,
        autoincremento: tabla.schema.primKey.auto ?? false,
        indices: tabla.schema.indexes
          .map((indice) => ({ nombre: indice.name, unico: !!indice.unique, multiple: !!indice.multi }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      },
    ]),
  );
}

describe("esquema local (Dexie)", () => {
  it("REQ-06: tiene los almacenes, claves e índices de data-model", async () => {
    const local = abrir();
    await local.open();
    const indice = (nombre: string, unico = false, multiple = false) => ({ nombre, unico, multiple });
    const maestro = { clave: "id", autoincremento: false, indices: [indice("estado")] };

    expect(describir(local)).toEqual({
      parcelas: maestro,
      personas: maestro,
      equipos: maestro,
      productos: maestro,
      tratamientos: {
        clave: "id",
        autoincremento: false,
        indices: [
          indice("estadoSincronizacion"),
          indice("fecha"),
          indice("parcelaIds", false, true),
          indice("productoIds", false, true),
        ],
      },
      cola: {
        clave: "orden",
        autoincremento: true,
        indices: [indice("entidadId"), indice("estado"), indice("idOperacion", true)],
      },
      meta: { clave: "clave", autoincremento: false, indices: [] },
    });
  });

  it("REQ-06: la cola guarda las operaciones en orden FIFO y no admite un idOperacion repetido", async () => {
    const local = abrir();
    const operacion = (idOperacion: string) => ({
      idOperacion,
      tipo: "crear_tratamiento" as const,
      entidadId: "t1",
      versionBase: null,
      cuerpo: {},
      creadaEn: "2026-03-15T10:00:00Z",
      intentos: 0,
      estado: "pendiente" as const,
      errores: [],
    });
    await local.cola.add(operacion("op-1"));
    await local.cola.add(operacion("op-2"));
    await expect(local.cola.add(operacion("op-1"))).rejects.toThrow();

    const enOrden = await local.cola.orderBy("orden").toArray();
    expect(enOrden.map((o) => o.idOperacion)).toEqual(["op-1", "op-2"]);
  });

  it("REQ-06: busca tratamientos por cualquiera de sus parcelas y productos", async () => {
    const local = abrir();
    await local.tratamientos.bulkAdd([
      { id: "t1", fecha: "2026-03-10", estadoSincronizacion: "pendiente", parcelaIds: ["p1", "p2"], productoIds: ["a"] },
      { id: "t2", fecha: "2026-03-12", estadoSincronizacion: "sincronizado", parcelaIds: ["p2"], productoIds: ["b"] },
    ]);

    const deP2 = await local.tratamientos.where("parcelaIds").equals("p2").sortBy("fecha");
    expect(deP2.map((t) => t.id)).toEqual(["t1", "t2"]);
    const conA = await local.tratamientos.where("productoIds").equals("a").toArray();
    expect(conA.map((t) => t.id)).toEqual(["t1"]);
    const pendientes = await local.tratamientos.where("estadoSincronizacion").equals("pendiente").count();
    expect(pendientes).toBe(1);
  });
});
