// Equipos de aplicación (T-29; REQ-15): descripción, fecha de adquisición o de la última inspección y número
// ROMA si procede.
import type { Esquemas } from "../../api/cliente";
import { Campo } from "../../componentes/Campo";
import type { Maestro } from "../../db/esquema";
import { fechaCorta, texto, textoOpcional } from "./formato";
import type { Definicion, PropsFormulario } from "./Seccion";

type Equipo = Esquemas["Equipo"] & Maestro;

function FormularioEquipo({ valores, cambiar, errores }: PropsFormulario) {
  return (
    <>
      <Campo
        etiqueta="Descripción"
        obligatorio
        valor={String(valores["descripcion"] ?? "")}
        alCambiar={(x) => cambiar("descripcion", x)}
        error={errores["descripcion"]}
        ayuda="Por ejemplo: pulverizador hidráulico suspendido de 800 L."
      />
      <Campo
        etiqueta="Fecha de adquisición o de la última inspección"
        tipo="date"
        obligatorio
        valor={String(valores["fechaAdquisicionOInspeccion"] ?? "")}
        alCambiar={(x) => cambiar("fechaAdquisicionOInspeccion", x)}
        error={errores["fechaAdquisicionOInspeccion"]}
      />
      <Campo
        etiqueta="Número ROMA o referencia censal (si procede)"
        valor={String(valores["numeroRoma"] ?? "")}
        alCambiar={(x) => cambiar("numeroRoma", x)}
        error={errores["numeroRoma"]}
      />
    </>
  );
}

export const EQUIPOS: Definicion<Equipo> = {
  almacen: "equipos",
  titulo: "Equipos de aplicación",
  textoAnadir: "Añadir equipo",
  tituloNuevo: "Nuevo equipo",
  tituloModificar: (equipo) => `Modificar el equipo ${equipo.descripcion}`,
  vacio: "Aún no has dado de alta ningún equipo de aplicación.",
  describir: (equipo) => ({
    titulo: equipo.descripcion,
    detalle: [equipo.numeroRoma ? `ROMA ${equipo.numeroRoma}` : null, fechaCorta(equipo.fechaAdquisicionOInspeccion)]
      .filter(Boolean)
      .join(" · "),
  }),
  ordenar: (a, b) => a.descripcion.localeCompare(b.descripcion, "es"),
  valoresIniciales: () => ({ descripcion: "", fechaAdquisicionOInspeccion: "", numeroRoma: "" }),
  aValores: (equipo) => ({
    descripcion: equipo.descripcion,
    fechaAdquisicionOInspeccion: equipo.fechaAdquisicionOInspeccion,
    numeroRoma: equipo.numeroRoma ?? "",
  }),
  aCuerpo: (v) => ({
    descripcion: texto(v["descripcion"]),
    fechaAdquisicionOInspeccion: textoOpcional(v["fechaAdquisicionOInspeccion"]),
    numeroRoma: textoOpcional(v["numeroRoma"]),
  }),
  campos: ["descripcion", "fechaAdquisicionOInspeccion", "numeroRoma"],
  Formulario: FormularioEquipo,
};
