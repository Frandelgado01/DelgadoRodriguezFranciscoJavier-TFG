// Parcelas (T-29; REQ-14; RD 1311/2012, anexo III, A.2). Se identifican por su número de orden, que asigna el
// servidor, con el nombre si lo tienen. Especie y variedad son obligatorias si el cultivo es leñoso (A.2.d).
import type { Esquemas } from "../../api/cliente";
import { Campo } from "../../componentes/Campo";
import { Casilla } from "../../componentes/Casilla";
import { Seleccion } from "../../componentes/Seleccion";
import type { Maestro } from "../../db/esquema";
import { conComa, numero, texto, textoOpcional } from "./formato";
import type { Definicion, PropsFormulario, Valores } from "./Seccion";

type Parcela = Esquemas["Parcela"] & Maestro;

const SIGPAC = [
  ["provincia", "Provincia"],
  ["municipio", "Municipio"],
  ["agregado", "Agregado"],
  ["zona", "Zona"],
  ["poligono", "Polígono"],
  ["parcela", "Parcela"],
  ["recinto", "Recinto"],
] as const;

export function nombreParcela(parcela: Pick<Parcela, "numeroOrden" | "nombre">): string {
  return parcela.nombre ? `Parcela ${parcela.numeroOrden} · ${parcela.nombre}` : `Parcela ${parcela.numeroOrden}`;
}

function describir(parcela: Parcela) {
  const referencia = SIGPAC.map(([componente]) => parcela.sigpac[componente]).join(":");
  const cultivo = [parcela.cultivoEspecie, parcela.cultivoVariedad].filter(Boolean).join(" ");
  const detalle = [`SIGPAC ${referencia}`, `${conComa(parcela.superficie)} ha`, cultivo].filter(Boolean).join(" · ");
  return { titulo: nombreParcela(parcela), detalle };
}

function valoresIniciales(): Valores {
  return {
    nombre: "",
    ...Object.fromEntries(SIGPAC.map(([componente]) => [componente, ""])),
    superficie: "",
    usoSigpac: "",
    aprovechamiento: "cultivo",
    cultivoLenoso: false,
    cultivoEspecie: "",
    cultivoVariedad: "",
    sistemaExplotacion: "secano",
    sistemaRiego: "",
    protegido: false,
    tipoProteccion: "",
    sistemaCertificacion: "",
    marcoControlPlagas: "",
  };
}

function aValores(parcela: Parcela): Valores {
  return {
    nombre: parcela.nombre ?? "",
    ...Object.fromEntries(SIGPAC.map(([componente]) => [componente, String(parcela.sigpac[componente])])),
    superficie: conComa(parcela.superficie),
    usoSigpac: parcela.usoSigpac,
    aprovechamiento: parcela.aprovechamiento,
    cultivoLenoso: parcela.cultivoLenoso,
    cultivoEspecie: parcela.cultivoEspecie ?? "",
    cultivoVariedad: parcela.cultivoVariedad ?? "",
    sistemaExplotacion: parcela.sistemaExplotacion,
    sistemaRiego: parcela.sistemaRiego ?? "",
    protegido: parcela.protegido,
    tipoProteccion: parcela.tipoProteccion ?? "",
    sistemaCertificacion: parcela.sistemaCertificacion ?? "",
    marcoControlPlagas: parcela.marcoControlPlagas ?? "",
  };
}

function aCuerpo(v: Valores) {
  const esCultivo = v["aprovechamiento"] === "cultivo";
  return {
    nombre: textoOpcional(v["nombre"]),
    sigpac: Object.fromEntries(SIGPAC.map(([componente]) => [componente, numero(v[componente])])),
    superficie: numero(v["superficie"]),
    usoSigpac: texto(v["usoSigpac"]),
    aprovechamiento: v["aprovechamiento"],
    cultivoLenoso: esCultivo && v["cultivoLenoso"] === true,
    cultivoEspecie: textoOpcional(v["cultivoEspecie"]),
    cultivoVariedad: textoOpcional(v["cultivoVariedad"]),
    sistemaExplotacion: v["sistemaExplotacion"],
    sistemaRiego: v["sistemaExplotacion"] === "regadio" ? textoOpcional(v["sistemaRiego"]) : null,
    protegido: v["protegido"] === true,
    tipoProteccion: v["protegido"] === true ? textoOpcional(v["tipoProteccion"]) : null,
    sistemaCertificacion: textoOpcional(v["sistemaCertificacion"]),
    marcoControlPlagas: textoOpcional(v["marcoControlPlagas"]),
  };
}

function FormularioParcela({ valores: v, cambiar, errores }: PropsFormulario) {
  const textoDe = (campo: string) => String(v[campo] ?? "");
  const lenoso = v["aprovechamiento"] === "cultivo" && v["cultivoLenoso"] === true;
  return (
    <>
      <Campo
        etiqueta="Nombre (opcional)"
        valor={textoDe("nombre")}
        alCambiar={(x) => cambiar("nombre", x)}
        error={errores["nombre"]}
      />
      <fieldset>
        <legend>Referencia SIGPAC</legend>
        {SIGPAC.map(([componente, etiqueta]) => (
          <Campo
            key={componente}
            etiqueta={etiqueta}
            teclado="numeric"
            valor={textoDe(componente)}
            alCambiar={(x) => cambiar(componente, x)}
            error={errores[`sigpac.${componente}`]}
          />
        ))}
      </fieldset>
      <Campo
        etiqueta="Superficie (ha)"
        teclado="decimal"
        valor={textoDe("superficie")}
        alCambiar={(x) => cambiar("superficie", x)}
        error={errores["superficie"]}
      />
      <Campo
        etiqueta="Uso SIGPAC"
        valor={textoDe("usoSigpac")}
        alCambiar={(x) => cambiar("usoSigpac", x)}
        error={errores["usoSigpac"]}
        ayuda="El código de uso del recinto en el SIGPAC, por ejemplo VI (viñedo) o TA (tierra arable)."
      />
      <Seleccion
        etiqueta="Aprovechamiento"
        valor={textoDe("aprovechamiento")}
        opciones={[
          { valor: "cultivo", texto: "Cultivo" },
          { valor: "pastos", texto: "Pastos" },
          { valor: "forestal", texto: "Forestal" },
        ]}
        alCambiar={(x) => cambiar("aprovechamiento", x)}
        error={errores["aprovechamiento"]}
      />
      {v["aprovechamiento"] === "cultivo" && (
        <Casilla
          etiqueta="Cultivo leñoso"
          marcada={v["cultivoLenoso"] === true}
          alCambiar={(x) => cambiar("cultivoLenoso", x)}
          error={errores["cultivoLenoso"]}
        />
      )}
      <Campo
        etiqueta={lenoso ? "Especie" : "Especie (opcional)"}
        obligatorio={lenoso}
        valor={textoDe("cultivoEspecie")}
        alCambiar={(x) => cambiar("cultivoEspecie", x)}
        error={errores["cultivoEspecie"]}
      />
      <Campo
        etiqueta={lenoso ? "Variedad" : "Variedad (opcional)"}
        obligatorio={lenoso}
        valor={textoDe("cultivoVariedad")}
        alCambiar={(x) => cambiar("cultivoVariedad", x)}
        error={errores["cultivoVariedad"]}
      />
      <Seleccion
        etiqueta="Sistema de explotación"
        valor={textoDe("sistemaExplotacion")}
        opciones={[
          { valor: "secano", texto: "Secano" },
          { valor: "regadio", texto: "Regadío" },
        ]}
        alCambiar={(x) => cambiar("sistemaExplotacion", x)}
        error={errores["sistemaExplotacion"]}
      />
      {v["sistemaExplotacion"] === "regadio" && (
        <Campo
          etiqueta="Sistema de riego"
          obligatorio
          valor={textoDe("sistemaRiego")}
          alCambiar={(x) => cambiar("sistemaRiego", x)}
          error={errores["sistemaRiego"]}
        />
      )}
      <Casilla
        etiqueta="Cultivo protegido (invernadero, malla…)"
        marcada={v["protegido"] === true}
        alCambiar={(x) => cambiar("protegido", x)}
        error={errores["protegido"]}
      />
      {v["protegido"] === true && (
        <Campo
          etiqueta="Tipo de protección"
          obligatorio
          valor={textoDe("tipoProteccion")}
          alCambiar={(x) => cambiar("tipoProteccion", x)}
          error={errores["tipoProteccion"]}
        />
      )}
      <Campo
        etiqueta="Sistema de certificación (opcional)"
        valor={textoDe("sistemaCertificacion")}
        alCambiar={(x) => cambiar("sistemaCertificacion", x)}
        error={errores["sistemaCertificacion"]}
      />
      <Campo
        etiqueta="Marco de control de plagas (opcional)"
        valor={textoDe("marcoControlPlagas")}
        alCambiar={(x) => cambiar("marcoControlPlagas", x)}
        error={errores["marcoControlPlagas"]}
      />
    </>
  );
}

export const PARCELAS: Definicion<Parcela> = {
  almacen: "parcelas",
  titulo: "Parcelas",
  textoAnadir: "Añadir parcela",
  tituloNuevo: "Nueva parcela",
  tituloModificar: (parcela) => `Modificar la parcela ${parcela.numeroOrden}`,
  vacio: "Aún no has dado de alta ninguna parcela.",
  describir,
  ordenar: (a, b) => a.numeroOrden - b.numeroOrden,
  valoresIniciales,
  aValores,
  aCuerpo,
  campos: [
    "nombre",
    ...SIGPAC.map(([componente]) => `sigpac.${componente}`),
    "superficie",
    "usoSigpac",
    "aprovechamiento",
    "cultivoLenoso",
    "cultivoEspecie",
    "cultivoVariedad",
    "sistemaExplotacion",
    "sistemaRiego",
    "protegido",
    "tipoProteccion",
    "sistemaCertificacion",
    "marcoControlPlagas",
  ],
  Formulario: FormularioParcela,
};
