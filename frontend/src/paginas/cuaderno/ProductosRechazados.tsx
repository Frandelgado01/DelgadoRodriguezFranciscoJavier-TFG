// Altas de productos rechazadas por el servidor (T-42; REQ-06 y REQ-16; R16): su motivo, corregirlas o descartarlas.
// Los tratamientos que usan uno de estos productos esperan a que se corrija.
import { useId, useState } from "react";
import { Campo } from "../../componentes/Campo";
import { erroresDeProducto } from "../../dominio/producto";
import { corregirProducto } from "../../sync/cola";
import type { ProductoRechazado } from "./datos";
import { Descartar } from "./Descartar";

function Rechazado({ producto, errores }: ProductoRechazado) {
  const [abierto, setAbierto] = useState(false);
  const [nombreComercial, setNombreComercial] = useState(producto.nombreComercial);
  const [numeroRegistro, setNumeroRegistro] = useState(producto.numeroRegistro);
  const [avisos, setAvisos] = useState<Record<string, string>>({});

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    const datos = { nombreComercial: nombreComercial.trim(), numeroRegistro: numeroRegistro.trim() };
    const encontrados = erroresDeProducto(datos);
    setAvisos(encontrados);
    if (Object.keys(encontrados).length === 0) await corregirProducto(producto.id, datos);
  }

  return (
    <li>
      <p>
        {producto.nombreComercial} (nº de registro {producto.numeroRegistro})
      </p>
      {errores.map(({ campo, mensaje }) => (
        <p key={`${campo} ${mensaje}`} role="alert">
          {mensaje}
        </p>
      ))}
      {abierto ? (
        <form onSubmit={(evento) => void guardar(evento)} noValidate>
          <Campo
            etiqueta="Nombre comercial"
            obligatorio
            valor={nombreComercial}
            alCambiar={setNombreComercial}
            error={avisos["nombreComercial"]}
          />
          <Campo
            etiqueta="Número de registro"
            obligatorio
            valor={numeroRegistro}
            alCambiar={setNumeroRegistro}
            error={avisos["numeroRegistro"]}
          />
          <button type="submit">Guardar la corrección</button>
          <button type="button" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <>
          <button type="button" onClick={() => setAbierto(true)}>
            Corregir
          </button>
          <Descartar id={producto.id} />
        </>
      )}
    </li>
  );
}

export function ProductosRechazados({ rechazados }: { rechazados: ProductoRechazado[] }) {
  const id = useId();
  if (rechazados.length === 0) return null;
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>Productos rechazados</h2>
      <p>Los tratamientos que usan estos productos no se envían hasta que los corrijas.</p>
      <ul>
        {rechazados.map((rechazado) => (
          <Rechazado key={rechazado.producto.id} {...rechazado} />
        ))}
      </ul>
    </section>
  );
}
