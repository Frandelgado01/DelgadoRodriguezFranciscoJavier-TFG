// Productos fitosanitarios (T-29; REQ-16). El id lo genera el dispositivo (R4), como cuando se dan de alta desde
// el registro sin conexión. No se modifican: el contrato no tiene PUT /productos/{id}.
import type { Esquemas } from "../../api/cliente";
import { Campo } from "../../componentes/Campo";
import type { Maestro } from "../../db/esquema";
import { texto } from "./formato";
import type { Definicion, PropsFormulario } from "./Seccion";

type Producto = Esquemas["Producto"] & Maestro;

function FormularioProducto({ valores, cambiar, errores }: PropsFormulario) {
  return (
    <>
      <Campo
        etiqueta="Nombre comercial"
        obligatorio
        valor={String(valores["nombreComercial"] ?? "")}
        alCambiar={(x) => cambiar("nombreComercial", x)}
        error={errores["nombreComercial"]}
      />
      <Campo
        etiqueta="Número de registro"
        obligatorio
        valor={String(valores["numeroRegistro"] ?? "")}
        alCambiar={(x) => cambiar("numeroRegistro", x)}
        error={errores["numeroRegistro"]}
        ayuda="El número de inscripción en el Registro Oficial de Productos Fitosanitarios, que figura en la etiqueta."
      />
    </>
  );
}

export const PRODUCTOS: Definicion<Producto> = {
  almacen: "productos",
  titulo: "Productos fitosanitarios",
  textoAnadir: "Añadir producto",
  tituloNuevo: "Nuevo producto",
  tituloModificar: (producto) => producto.nombreComercial,
  vacio: "Aún no has dado de alta ningún producto.",
  describir: (producto) => ({ titulo: producto.nombreComercial, detalle: `Nº de registro ${producto.numeroRegistro}` }),
  ordenar: (a, b) => a.nombreComercial.localeCompare(b.nombreComercial, "es"),
  valoresIniciales: () => ({ nombreComercial: "", numeroRegistro: "" }),
  aCuerpo: (v) => ({
    id: crypto.randomUUID(),
    nombreComercial: texto(v["nombreComercial"]),
    numeroRegistro: texto(v["numeroRegistro"]),
  }),
  campos: ["nombreComercial", "numeroRegistro"],
  Formulario: FormularioProducto,
};
