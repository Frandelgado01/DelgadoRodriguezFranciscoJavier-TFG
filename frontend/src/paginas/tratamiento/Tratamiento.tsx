// Registrar un tratamiento y corregir uno rechazado (T-41; REQ-01 a REQ-06 y REQ-16; research R3 y R16).
//
// Elige de las copias del dispositivo, valida con las reglas compartidas antes de guardar y guarda en local: funciona
// igual con y sin conexión. La dosis por hectárea no se pide: se calcula (REQ-23).
import { useCallback, useRef, useState } from "react";
import { AreaTexto } from "../../componentes/AreaTexto";
import { Campo } from "../../componentes/Campo";
import { Enlace } from "../../componentes/Enlace";
import { Seleccion } from "../../componentes/Seleccion";
import { useConsulta } from "../../db/consulta";
import type { OperacionCola } from "../../db/esquema";
import { hoyEnMadrid } from "../../dominio/fechas";
import { enEspanol, validarTratamiento } from "../../dominio/validacion";
import { navegar } from "../../navegacion";
import { corregirTratamiento, guardarTratamiento, type TratamientoNuevo } from "../../sync/cola";
import { nombreParcela } from "../explotacion/parcelas";
import {
  aDatos,
  aValores,
  disponible,
  leerCatalogos,
  leerRechazada,
  momentoDelRegistro,
  parcelaVacia,
  productoVacio,
  valoresVacios,
  type Catalogos,
  type Equipo,
  type LineaParcela,
  type LineaProducto,
  type Producto,
  type Valores,
} from "./datos";
import { ProductoNuevo } from "./ProductoNuevo";

type Errores = Record<string, string>;

const CAMPOS_SIMPLES = ["fecha", "problema", "aplicadorId", "asesorId", "equipoId", "eficacia", "observaciones"];
const CAMPO_DE_LINEA =
  /^(parcelas|productos)\.([0-9]+)\.(parcelaId|superficieTratada|cultivoEspecie|cultivoVariedad|productoSemilla|productoId|cantidad|unidadMedida)$/;

function nombreProducto(producto: Pick<Producto, "nombreComercial" | "numeroRegistro">): string {
  return `${producto.nombreComercial} (nº ${producto.numeroRegistro})`;
}

function nombreEquipo(equipo: Equipo): string {
  return equipo.numeroRoma ? `${equipo.descripcion} (ROMA ${equipo.numeroRoma})` : equipo.descripcion;
}

/** ¿Se muestra junto a un campo del formulario? Los demás errores salen arriba. */
function tieneCampo(campo: string, valores: Valores): boolean {
  if (CAMPOS_SIMPLES.includes(campo)) return true;
  const linea = CAMPO_DE_LINEA.exec(campo);
  return linea !== null && Number(linea[2]) < valores[linea[1] as "parcelas" | "productos"].length;
}

function porCampo(errores: { campo: string; mensaje: string }[]): Errores {
  return Object.fromEntries(errores.map(({ campo, mensaje }) => [campo, mensaje]));
}

export function Tratamiento({ id }: { id?: string | undefined }) {
  const catalogos = useConsulta<Catalogos | null>(leerCatalogos, null);
  // undefined mientras se lee; null si ya no está rechazado.
  const consulta = useCallback(async () => (id === undefined ? null : await leerRechazada(id)), [id]);
  const rechazada = useConsulta<OperacionCola | null | undefined>(consulta, undefined);

  return (
    <main>
      <h1>{id === undefined ? "Registrar un tratamiento" : "Corregir el tratamiento"}</h1>
      <p>
        <Enlace a="/">Volver al cuaderno</Enlace>
      </p>
      {id !== undefined && rechazada === null && <p>Este registro ya no está rechazado: no hay nada que corregir.</p>}
      {catalogos !== null && rechazada !== undefined && (id === undefined || rechazada !== null) && (
        <Formulario catalogos={catalogos} rechazada={rechazada} />
      )}
    </main>
  );
}

function Formulario({ catalogos, rechazada }: { catalogos: Catalogos; rechazada: OperacionCola | null }) {
  const [valores, setValores] = useState<Valores>(() =>
    rechazada === null ? valoresVacios() : aValores(rechazada.cuerpo as TratamientoNuevo),
  );
  const [errores, setErrores] = useState<Errores>(() => porCampo(rechazada?.errores ?? []));
  const [aviso, setAviso] = useState("");
  // Línea de producto para la que se está dando de alta uno nuevo.
  const [altaEn, setAltaEn] = useState<string | null>(null);
  const guardando = useRef(false);

  const cambiar = (cambios: Partial<Valores>) => setValores((actuales) => ({ ...actuales, ...cambios }));

  function cambiarParcela(clave: string, cambios: Partial<LineaParcela>) {
    setValores((actuales) => ({
      ...actuales,
      parcelas: actuales.parcelas.map((linea) => (linea.clave === clave ? { ...linea, ...cambios } : linea)),
    }));
  }

  function cambiarProducto(clave: string, cambios: Partial<LineaProducto>) {
    setValores((actuales) => ({
      ...actuales,
      productos: actuales.productos.map((linea) => (linea.clave === clave ? { ...linea, ...cambios } : linea)),
    }));
  }

  function quitar(lista: "parcelas" | "productos", clave: string) {
    setValores((actuales) => ({ ...actuales, [lista]: actuales[lista].filter((linea) => linea.clave !== clave) }));
    // Los errores llevan la posición de la línea: al quitar una dejan de corresponder.
    setErrores((actuales) =>
      Object.fromEntries(Object.entries(actuales).filter(([campo]) => !campo.startsWith(`${lista}.`))),
    );
  }

  /** Propone el cultivo actual de la parcela elegida, que se puede cambiar (REQ-05). */
  function elegirParcela(clave: string, parcelaId: string) {
    const parcela = catalogos.parcelas.find((p) => p.id === parcelaId);
    cambiarParcela(clave, {
      parcelaId,
      cultivoEspecie: parcela?.cultivoEspecie ?? "",
      cultivoVariedad: parcela?.cultivoVariedad ?? "",
    });
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (guardando.current) return;
    const datos = aDatos(valores, catalogos);
    const superficies = Object.fromEntries(catalogos.parcelas.map((p) => [p.id, p.superficie]));
    const encontrados = validarTratamiento({ datos, hoy: hoyEnMadrid(), superficies });
    setErrores(porCampo(encontrados));
    if (encontrados.length > 0) {
      setAviso("Revisa los datos marcados.");
      return;
    }
    setAviso("");
    guardando.current = true;
    try {
      // Ya validado: los números son números y no falta ningún dato obligatorio.
      const tratamiento = {
        ...datos,
        id: rechazada?.entidadId ?? crypto.randomUUID(),
        registradoEn: momentoDelRegistro(rechazada, datos.fecha),
      } as TratamientoNuevo;
      if (rechazada === null) await guardarTratamiento(tratamiento);
      else await corregirTratamiento(rechazada.entidadId, tratamiento);
      navegar("/");
    } catch {
      setAviso("No se ha podido guardar en el dispositivo. Inténtalo de nuevo.");
    } finally {
      guardando.current = false;
    }
  }

  const generales = Object.entries(errores).filter(([campo]) => !tieneCampo(campo, valores));
  const faltanDatos =
    catalogos.parcelas.length === 0 || catalogos.aplicadores.length === 0 || catalogos.equipos.length === 0;

  return (
    <form onSubmit={(evento) => void guardar(evento)} noValidate>
      {faltanDatos && (
        <p>
          Antes de registrar un tratamiento tienes que dar de alta al menos una parcela, un aplicador y un equipo:{" "}
          <Enlace a="/explotacion">Datos de la explotación</Enlace>
        </p>
      )}
      {generales.map(([campo, mensaje]) => (
        <p key={campo} role="alert">
          {mensaje}
        </p>
      ))}
      <Campo
        etiqueta="Fecha"
        tipo="date"
        obligatorio
        valor={valores.fecha}
        alCambiar={(fecha) => cambiar({ fecha })}
        error={errores["fecha"]}
        ayuda="Si duró varios días, registra un tratamiento por día."
      />
      {valores.parcelas.map((linea, i) => {
        const parcela = catalogos.parcelas.find((p) => p.id === linea.parcelaId);
        const error = (campo: string) => errores[`parcelas.${i}.${campo}`];
        return (
          <fieldset key={linea.clave}>
            <legend>{valores.parcelas.length === 1 ? "Parcela tratada" : `Parcela tratada ${i + 1}`}</legend>
            <Seleccion
              etiqueta="Parcela"
              valor={parcela?.id ?? ""}
              opciones={[
                { valor: "", texto: "Elige una parcela" },
                ...catalogos.parcelas.map((p) => ({ valor: p.id, texto: nombreParcela(p) })),
              ]}
              alCambiar={(parcelaId) => elegirParcela(linea.clave, parcelaId)}
              error={error("parcelaId")}
            />
            <Campo
              etiqueta="Superficie tratada (ha)"
              teclado="decimal"
              obligatorio
              valor={linea.superficieTratada}
              alCambiar={(superficieTratada) => cambiarParcela(linea.clave, { superficieTratada })}
              error={error("superficieTratada")}
              {...(parcela ? { ayuda: `La parcela tiene ${enEspanol(parcela.superficie)} ha.` } : {})}
            />
            <Campo
              etiqueta="Especie"
              obligatorio
              valor={linea.cultivoEspecie}
              alCambiar={(cultivoEspecie) => cambiarParcela(linea.clave, { cultivoEspecie })}
              error={error("cultivoEspecie")}
            />
            <Campo
              etiqueta="Variedad"
              obligatorio
              valor={linea.cultivoVariedad}
              alCambiar={(cultivoVariedad) => cambiarParcela(linea.clave, { cultivoVariedad })}
              error={error("cultivoVariedad")}
            />
            <Campo
              etiqueta="Producto de tratamiento de la semilla (opcional)"
              valor={linea.productoSemilla}
              alCambiar={(productoSemilla) => cambiarParcela(linea.clave, { productoSemilla })}
              error={error("productoSemilla")}
            />
            {valores.parcelas.length > 1 && (
              <button type="button" onClick={() => quitar("parcelas", linea.clave)}>
                Quitar esta parcela
              </button>
            )}
          </fieldset>
        );
      })}
      <button type="button" onClick={() => cambiar({ parcelas: [...valores.parcelas, parcelaVacia()] })}>
        Añadir otra parcela
      </button>
      <Campo
        etiqueta="Plaga o problema a controlar"
        obligatorio
        valor={valores.problema}
        alCambiar={(problema) => cambiar({ problema })}
        error={errores["problema"]}
      />
      <Seleccion
        etiqueta="Aplicador"
        valor={disponible(catalogos.aplicadores, valores.aplicadorId)}
        opciones={[
          { valor: "", texto: "Elige quién lo aplicó" },
          ...catalogos.aplicadores.map((p) => ({ valor: p.id, texto: p.nombre })),
        ]}
        alCambiar={(aplicadorId) => cambiar({ aplicadorId })}
        error={errores["aplicadorId"]}
      />
      <Seleccion
        etiqueta="Asesor (opcional)"
        valor={disponible(catalogos.asesores, valores.asesorId)}
        opciones={[
          { valor: "", texto: "Sin asesor" },
          ...catalogos.asesores.map((p) => ({ valor: p.id, texto: p.nombre })),
        ]}
        alCambiar={(asesorId) => cambiar({ asesorId })}
        error={errores["asesorId"]}
      />
      {valores.productos.map((linea, i) => {
        const error = (campo: string) => errores[`productos.${i}.${campo}`];
        return (
          <fieldset key={linea.clave}>
            <legend>{valores.productos.length === 1 ? "Producto aplicado" : `Producto aplicado ${i + 1}`}</legend>
            <Seleccion
              etiqueta="Producto"
              valor={disponible(catalogos.productos, linea.productoId)}
              opciones={[
                { valor: "", texto: "Elige un producto" },
                ...catalogos.productos.map((p) => ({ valor: p.id, texto: nombreProducto(p) })),
              ]}
              alCambiar={(productoId) => cambiarProducto(linea.clave, { productoId })}
              error={error("productoId")}
            />
            {altaEn === linea.clave ? (
              <ProductoNuevo
                productos={catalogos.productos}
                alElegir={(productoId) => {
                  cambiarProducto(linea.clave, { productoId });
                  setAltaEn(null);
                }}
                alCancelar={() => setAltaEn(null)}
              />
            ) : (
              <button type="button" onClick={() => setAltaEn(linea.clave)}>
                Dar de alta un producto nuevo
              </button>
            )}
            <Campo
              etiqueta="Cantidad"
              teclado="decimal"
              obligatorio
              valor={linea.cantidad}
              alCambiar={(cantidad) => cambiarProducto(linea.clave, { cantidad })}
              error={error("cantidad")}
            />
            <Seleccion
              etiqueta="Unidad"
              valor={linea.unidadMedida}
              opciones={[
                { valor: "kg", texto: "kg" },
                { valor: "L", texto: "L" },
              ]}
              alCambiar={(unidadMedida) => cambiarProducto(linea.clave, { unidadMedida })}
              error={error("unidadMedida")}
            />
            {valores.productos.length > 1 && (
              <button type="button" onClick={() => quitar("productos", linea.clave)}>
                Quitar este producto
              </button>
            )}
          </fieldset>
        );
      })}
      <button type="button" onClick={() => cambiar({ productos: [...valores.productos, productoVacio()] })}>
        Añadir otro producto
      </button>
      <Seleccion
        etiqueta="Equipo de aplicación"
        valor={disponible(catalogos.equipos, valores.equipoId)}
        opciones={[
          { valor: "", texto: "Elige un equipo" },
          ...catalogos.equipos.map((e) => ({ valor: e.id, texto: nombreEquipo(e) })),
        ]}
        alCambiar={(equipoId) => cambiar({ equipoId })}
        error={errores["equipoId"]}
      />
      <Seleccion
        etiqueta="Eficacia (opcional)"
        valor={valores.eficacia}
        opciones={[
          { valor: "", texto: "Aún no la sé" },
          { valor: "buena", texto: "Buena" },
          { valor: "regular", texto: "Regular" },
          { valor: "mala", texto: "Mala" },
        ]}
        alCambiar={(eficacia) => cambiar({ eficacia })}
        error={errores["eficacia"]}
      />
      <AreaTexto
        etiqueta="Observaciones (opcional)"
        valor={valores.observaciones}
        alCambiar={(observaciones) => cambiar({ observaciones })}
        error={errores["observaciones"]}
      />
      {aviso && <p role="alert">{aviso}</p>}
      <button type="submit">{rechazada === null ? "Guardar el tratamiento" : "Guardar la corrección"}</button>
    </form>
  );
}
