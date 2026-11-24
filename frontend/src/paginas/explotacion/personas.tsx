// Personas que aplican o asesoran (T-29; REQ-15). Solo nombre, tipo y número de carné: sin NIF ni otros datos
// personales (principio VI).
import type { Esquemas } from "../../api/cliente";
import { Campo } from "../../componentes/Campo";
import { Seleccion } from "../../componentes/Seleccion";
import type { Maestro } from "../../db/esquema";
import { texto } from "./formato";
import type { Definicion, PropsFormulario } from "./Seccion";

type Persona = Esquemas["Persona"] & Maestro;

const TIPOS = { aplicador: "Aplicador", asesor: "Asesor" } as const;

function FormularioPersona({ valores, cambiar, errores }: PropsFormulario) {
  return (
    <>
      <Campo
        etiqueta="Nombre"
        obligatorio
        valor={String(valores["nombre"] ?? "")}
        alCambiar={(x) => cambiar("nombre", x)}
        error={errores["nombre"]}
      />
      <Seleccion
        etiqueta="Tipo"
        valor={String(valores["tipo"] ?? "aplicador")}
        opciones={Object.entries(TIPOS).map(([valor, nombre]) => ({ valor, texto: nombre }))}
        alCambiar={(x) => cambiar("tipo", x)}
        error={errores["tipo"]}
      />
      <Campo
        etiqueta="Número de carné"
        obligatorio
        valor={String(valores["numeroCarne"] ?? "")}
        alCambiar={(x) => cambiar("numeroCarne", x)}
        error={errores["numeroCarne"]}
        ayuda="El del carné de usuario profesional de productos fitosanitarios o el de asesor."
      />
    </>
  );
}

export const PERSONAS: Definicion<Persona> = {
  almacen: "personas",
  titulo: "Aplicadores y asesores",
  textoAnadir: "Añadir persona",
  tituloNuevo: "Nueva persona",
  tituloModificar: (persona) => `Modificar a ${persona.nombre}`,
  vacio: "Aún no has dado de alta a nadie que aplique o asesore.",
  describir: (persona) => ({
    titulo: persona.nombre,
    detalle: `${TIPOS[persona.tipo]} · carné ${persona.numeroCarne}`,
  }),
  ordenar: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
  valoresIniciales: () => ({ nombre: "", tipo: "aplicador", numeroCarne: "" }),
  aValores: (persona) => ({ nombre: persona.nombre, tipo: persona.tipo, numeroCarne: persona.numeroCarne }),
  aCuerpo: (v) => ({ nombre: texto(v["nombre"]), tipo: v["tipo"], numeroCarne: texto(v["numeroCarne"]) }),
  campos: ["nombre", "tipo", "numeroCarne"],
  Formulario: FormularioPersona,
};
