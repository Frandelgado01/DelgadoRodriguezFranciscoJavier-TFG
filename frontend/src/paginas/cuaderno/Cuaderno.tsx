// Cuaderno (T-42; REQ-01 y REQ-06): tratamientos del dispositivo, locales y sincronizados, del más reciente al más
// antiguo, con su estado de sincronización y el detalle. Los rechazados muestran su motivo y se corrigen o descartan
// (escenarios 9 y 10; R16). Los filtros y los avisos de plazo llegan en H5 y H6.
import { useId, useState } from "react";
import { Enlace } from "../../componentes/Enlace";
import { useConsulta } from "../../db/consulta";
import type { EstadoSincronizacion } from "../../db/esquema";
import { CerrarSesion } from "../cuenta/CerrarSesion";
import { fechaCorta } from "../explotacion/formato";
import { leerCuaderno, type DatosCuaderno, type TratamientoCuaderno } from "./datos";
import { Descartar } from "./Descartar";
import { Detalle } from "./Detalle";
import { ProductosRechazados } from "./ProductosRechazados";

const ESTADOS: Record<EstadoSincronizacion, string> = {
  sincronizado: "Sincronizado",
  pendiente: "Pendiente de sincronizar",
  conflicto: "En conflicto",
  rechazado: "Rechazado",
};

function Elemento({ tratamiento: t, datos }: { tratamiento: TratamientoCuaderno; datos: DatosCuaderno }) {
  const [abierto, setAbierto] = useState(false);
  const motivos = datos.motivos.get(t.id) ?? [];
  return (
    <li>
      <h3>
        {fechaCorta(t.fecha)} · {t.problema}
      </h3>
      <p>{ESTADOS[t.estadoSincronizacion]}</p>
      {motivos.map(({ campo, mensaje }) => (
        <p key={`${campo} ${mensaje}`} role="alert">
          {mensaje}
        </p>
      ))}
      {datos.motivos.has(t.id) && (
        <>
          <Enlace a={`/tratamiento/${t.id}/corregir`}>Corregir</Enlace>
          <Descartar id={t.id} />
        </>
      )}
      <button type="button" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        {abierto ? "Ocultar el detalle" : "Ver el detalle"}
      </button>
      {abierto && <Detalle tratamiento={t} datos={datos} />}
    </li>
  );
}

export function Cuaderno() {
  const datos = useConsulta<DatosCuaderno | null>(leerCuaderno, null);
  const idTitulo = useId();
  return (
    <main>
      <h1>Cuaderno</h1>
      <nav>
        <Enlace a="/tratamiento/nuevo">Registrar un tratamiento</Enlace>{" "}
        <Enlace a="/explotacion">Datos de la explotación</Enlace>
      </nav>
      {datos !== null && (
        <>
          <ProductosRechazados rechazados={datos.productosRechazados} />
          <section aria-labelledby={idTitulo}>
            <h2 id={idTitulo}>Tratamientos</h2>
            {datos.tratamientos.length === 0 ? (
              <p>Aún no has registrado ningún tratamiento.</p>
            ) : (
              <ul aria-labelledby={idTitulo}>
                {datos.tratamientos.map((t) => (
                  <Elemento key={t.id} tratamiento={t} datos={datos} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <CerrarSesion />
    </main>
  );
}
