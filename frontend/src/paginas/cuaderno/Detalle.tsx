// Detalle de un tratamiento con todos los datos de la sección B del anexo III (T-42; REQ-01). Cada parcela se
// identifica por su número de orden (B.b).
import type { Esquemas } from "../../api/cliente";
import { enEspanol } from "../../dominio/validacion";
import { fechaCorta } from "../explotacion/formato";
import { nombreParcela } from "../explotacion/parcelas";
import type { DatosCuaderno, TratamientoCuaderno } from "./datos";

const NO_DISPONIBLE = "No disponible en este dispositivo";
const EFICACIAS = { buena: "Buena", regular: "Regular", mala: "Mala" } as const;

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{nombre}</dt>
      <dd>{children}</dd>
    </>
  );
}

function parcelaDe(datos: DatosCuaderno, linea: TratamientoCuaderno["parcelas"][number]): string {
  const parcela = datos.parcelas.get(linea.parcelaId);
  if (parcela) return nombreParcela(parcela);
  return linea.numeroOrden === undefined ? NO_DISPONIBLE : `Parcela ${linea.numeroOrden}`;
}

function persona(p: Esquemas["Persona"] | undefined): string {
  return p ? `${p.nombre} (carné ${p.numeroCarne})` : NO_DISPONIBLE;
}

function equipo(e: Esquemas["Equipo"] | undefined): string {
  if (!e) return NO_DISPONIBLE;
  return e.numeroRoma ? `${e.descripcion} (ROMA ${e.numeroRoma})` : e.descripcion;
}

function producto(p: Esquemas["Producto"] | undefined): string {
  return p ? `${p.nombreComercial} (nº de registro ${p.numeroRegistro})` : NO_DISPONIBLE;
}

export function Detalle({ tratamiento: t, datos }: { tratamiento: TratamientoCuaderno; datos: DatosCuaderno }) {
  return (
    <div>
      <dl>
        <Dato nombre="Fecha">{fechaCorta(t.fecha)}</Dato>
        <Dato nombre="Plaga o problema">{t.problema}</Dato>
        <Dato nombre="Aplicador">{persona(datos.personas.get(t.aplicadorId))}</Dato>
        {t.asesorId && <Dato nombre="Asesor">{persona(datos.personas.get(t.asesorId))}</Dato>}
        <Dato nombre="Equipo de aplicación">{equipo(datos.equipos.get(t.equipoId))}</Dato>
        <Dato nombre="Eficacia">{t.eficacia ? EFICACIAS[t.eficacia] : "Sin valorar"}</Dato>
        {t.observaciones && <Dato nombre="Observaciones">{t.observaciones}</Dato>}
      </dl>
      {t.parcelas.map((linea) => (
        <dl key={linea.parcelaId}>
          <Dato nombre="Parcela">{parcelaDe(datos, linea)}</Dato>
          <Dato nombre="Superficie tratada">{enEspanol(linea.superficieTratada)} ha</Dato>
          <Dato nombre="Cultivo">{`${linea.cultivoEspecie}, ${linea.cultivoVariedad}`}</Dato>
          {linea.productoSemilla && <Dato nombre="Semilla tratada con">{linea.productoSemilla}</Dato>}
        </dl>
      ))}
      {t.productos.map((linea) => (
        <dl key={linea.productoId}>
          <Dato nombre="Producto">{producto(datos.productos.get(linea.productoId))}</Dato>
          <Dato nombre="Cantidad">{`${enEspanol(linea.cantidad)} ${linea.unidadMedida}`}</Dato>
        </dl>
      ))}
    </div>
  );
}
