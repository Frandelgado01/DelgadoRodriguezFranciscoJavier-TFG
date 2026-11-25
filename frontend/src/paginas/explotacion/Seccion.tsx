// Sección de un tipo de dato de la explotación (T-29; REQ-14 a REQ-17): lista, alta, modificación y baja.
//
// Los cambios se hacen con conexión contra la API; cada cambio aceptado se copia también al dispositivo, para
// elegir esos datos al registrar sin conexión (R3). Sin conexión se muestra la copia del dispositivo, solo
// para consultarla. Los rechazos de la API (422) salen junto a su campo, en lenguaje llano.
import { useEffect, useId, useState } from "react";
import { llamar, type Resultado } from "../../api/cliente";
import { baseActual } from "../../db/base";
import type { Maestro } from "../../db/esquema";
import { erroresDeCampo, mensajeGeneral, type Errores } from "../cuenta/comun";

export type Almacen = "parcelas" | "personas" | "equipos" | "productos";
export type Valores = Record<string, string | boolean>;

export interface PropsFormulario {
  valores: Valores;
  cambiar: (campo: string, valor: string | boolean) => void;
  errores: Errores;
}

export interface Definicion<T extends Maestro> {
  almacen: Almacen;
  titulo: string;
  textoAnadir: string;
  tituloNuevo: string;
  tituloModificar: (elemento: T) => string;
  vacio: string;
  describir: (elemento: T) => { titulo: string; detalle: string };
  /** Orden de la copia del dispositivo (el servidor ya los devuelve ordenados). */
  ordenar: (a: T, b: T) => number;
  valoresIniciales: () => Valores;
  /** Sin esta función no se puede modificar (productos: el contrato no tiene PUT). */
  aValores?: (elemento: T) => Valores;
  aCuerpo: (valores: Valores) => unknown;
  /** Campos que muestra el formulario: los errores de otros campos salen arriba. */
  campos: string[];
  Formulario: (props: PropsFormulario) => React.ReactNode;
}

type Edicion<T> = { modo: "nuevo" } | { modo: "modificar"; elemento: T } | null;

interface EstadoLista<T> {
  lista: T[] | null;
  sinConexion: boolean;
  aviso: string;
}

const SIN_CONEXION =
  "Sin conexión: estos son los datos guardados en el dispositivo. Para cambiarlos necesitas conexión.";

/** Lista de la API o, sin conexión, la copia del dispositivo. */
async function leerLista<T extends Maestro>(definicion: Definicion<T>): Promise<EstadoLista<T>> {
  const resultado = await llamar<T[]>("GET", `/${definicion.almacen}`);
  if (resultado.ok) return { lista: resultado.datos, sinConexion: false, aviso: "" };
  if (resultado.sinConexion) {
    // Los de baja solo se guardan para mostrar los tratamientos que los usan (T-83).
    const activos = baseActual()[definicion.almacen].where("estado").equals("activa");
    const locales = (await activos.toArray()) as T[];
    return { lista: locales.sort(definicion.ordenar), sinConexion: true, aviso: SIN_CONEXION };
  }
  return { lista: null, sinConexion: false, aviso: mensajeGeneral(resultado) };
}

export function Seccion<T extends Maestro>({ definicion }: { definicion: Definicion<T> }) {
  const { almacen } = definicion;
  const idTitulo = useId();
  const [{ lista, sinConexion, aviso: avisoLista }, setEstadoLista] = useState<EstadoLista<T>>({
    lista: null,
    sinConexion: false,
    aviso: "",
  });
  const [edicion, setEdicion] = useState<Edicion<T>>(null);
  const [valores, setValores] = useState<Valores>({});
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void leerLista(definicion).then((estado) => {
      if (vigente) setEstadoLista(estado);
    });
    return () => {
      vigente = false;
    };
  }, [definicion]);

  async function recargar() {
    setEstadoLista(await leerLista(definicion));
  }

  function abrir(nueva: Edicion<T>) {
    setEdicion(nueva);
    setErrores({});
    setAviso("");
    if (nueva?.modo === "modificar" && definicion.aValores) setValores(definicion.aValores(nueva.elemento));
    else setValores(definicion.valoresIniciales());
  }

  function mostrarRechazo(resultado: Resultado<unknown>) {
    const deCampo = erroresDeCampo(resultado);
    const visibles = Object.fromEntries(Object.entries(deCampo).filter(([campo]) => definicion.campos.includes(campo)));
    const otros = Object.entries(deCampo).filter(([campo]) => !definicion.campos.includes(campo));
    setErrores(visibles);
    if (otros.length > 0) setAviso(otros.map(([, mensaje]) => mensaje).join(" "));
    else if (Object.keys(visibles).length > 0) setAviso("Revisa los datos marcados.");
    else setAviso(mensajeGeneral(resultado));
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!edicion) return;
    setEnviando(true);
    const base = baseActual();
    const cuerpo = definicion.aCuerpo(valores);
    const resultado =
      edicion.modo === "nuevo"
        ? await llamar<T>("POST", `/${almacen}`, cuerpo)
        : await llamar<T>("PUT", `/${almacen}/${edicion.elemento.id}`, cuerpo);
    setEnviando(false);
    if (!resultado.ok) {
      mostrarRechazo(resultado);
      return;
    }
    await base[almacen].put(resultado.datos);
    setEdicion(null);
    await recargar();
  }

  async function darDeBaja(elemento: T) {
    const base = baseActual();
    const resultado = await llamar<T>("POST", `/${almacen}/${elemento.id}/baja`);
    setConfirmando(null);
    if (!resultado.ok) {
      setEstadoLista((actual) => ({ ...actual, aviso: mensajeGeneral(resultado) }));
      return;
    }
    // La copia del dispositivo solo guarda los activos: el dado de baja ya no se ofrece al registrar.
    await base[almacen].delete(elemento.id);
    await recargar();
  }

  const titulo = edicion?.modo === "modificar" ? definicion.tituloModificar(edicion.elemento) : definicion.tituloNuevo;

  return (
    <section aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>{definicion.titulo}</h2>
      {avisoLista && <p role="status">{avisoLista}</p>}
      {lista !== null && lista.length === 0 && <p>{definicion.vacio}</p>}
      {lista !== null && lista.length > 0 && (
        <ul>
          {lista.map((elemento) => {
            const { titulo: nombre, detalle } = definicion.describir(elemento);
            return (
              <li key={elemento.id}>
                <strong>{nombre}</strong>
                <span> {detalle}</span>
                {!sinConexion && confirmando !== elemento.id && (
                  <>
                    {definicion.aValores && (
                      <button type="button" onClick={() => abrir({ modo: "modificar", elemento })}>
                        Modificar
                      </button>
                    )}
                    <button type="button" onClick={() => setConfirmando(elemento.id)}>
                      Dar de baja
                    </button>
                  </>
                )}
                {confirmando === elemento.id && (
                  <p>
                    ¿Dar de baja «{nombre}»? Dejará de ofrecerse en los tratamientos nuevos; los ya registrados no
                    cambian.{" "}
                    <button type="button" onClick={() => void darDeBaja(elemento)}>
                      Sí, dar de baja
                    </button>
                    <button type="button" onClick={() => setConfirmando(null)}>
                      Cancelar
                    </button>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!sinConexion && lista !== null && edicion === null && (
        <button type="button" onClick={() => abrir({ modo: "nuevo" })}>
          {definicion.textoAnadir}
        </button>
      )}
      {edicion !== null && (
        <form aria-label={titulo} onSubmit={(evento) => void guardar(evento)} noValidate>
          <h3>{titulo}</h3>
          <definicion.Formulario
            valores={valores}
            cambiar={(campo, valor) => setValores((actuales) => ({ ...actuales, [campo]: valor }))}
            errores={errores}
          />
          {aviso && <p role="alert">{aviso}</p>}
          <button type="submit" disabled={enviando}>
            Guardar
          </button>
          <button type="button" onClick={() => setEdicion(null)}>
            Cancelar
          </button>
        </form>
      )}
    </section>
  );
}
