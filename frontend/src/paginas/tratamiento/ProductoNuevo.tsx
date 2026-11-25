// Alta de un producto sin salir del formulario y sin conexión (T-41; REQ-16 y REQ-06). Si ya hay uno con el mismo
// número de registro se avisa y se propone usarlo, pero se puede dar de alta igualmente (data-model, "producto").
import { useState } from "react";
import { Campo } from "../../componentes/Campo";
import { guardarProducto } from "../../sync/cola";
import { erroresDeProducto } from "../../dominio/producto";
import type { Producto } from "./datos";

interface Props {
  productos: Producto[];
  alElegir: (id: string) => void;
  alCancelar: () => void;
}

const comparable = (numeroRegistro: string) => numeroRegistro.trim().toUpperCase();

export function ProductoNuevo({ productos, alElegir, alCancelar }: Props) {
  const [nombreComercial, setNombreComercial] = useState("");
  const [numeroRegistro, setNumeroRegistro] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [repetido, setRepetido] = useState<Producto | null>(null);

  async function darDeAlta(aunqueSeRepita: boolean) {
    const datos = { nombreComercial: nombreComercial.trim(), numeroRegistro: numeroRegistro.trim() };
    const encontrados = erroresDeProducto(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    const igual = productos.find((p) => comparable(p.numeroRegistro) === comparable(numeroRegistro)) ?? null;
    setRepetido(igual);
    if (igual !== null && !aunqueSeRepita) return;
    const id = crypto.randomUUID();
    await guardarProducto({ id, ...datos });
    alElegir(id);
  }

  return (
    <fieldset>
      <legend>Producto nuevo</legend>
      <Campo
        etiqueta="Nombre comercial"
        obligatorio
        valor={nombreComercial}
        alCambiar={setNombreComercial}
        error={errores["nombreComercial"]}
      />
      <Campo
        etiqueta="Número de registro"
        obligatorio
        valor={numeroRegistro}
        alCambiar={(valor) => {
          setNumeroRegistro(valor);
          setRepetido(null);
        }}
        error={errores["numeroRegistro"]}
        ayuda="El número de inscripción en el Registro Oficial de Productos Fitosanitarios, que figura en la etiqueta."
      />
      {repetido !== null && (
        <div role="alert">
          <p>Ya tienes «{repetido.nombreComercial}» con ese número de registro.</p>
          <button type="button" onClick={() => alElegir(repetido.id)}>
            Usar «{repetido.nombreComercial}»
          </button>
          <button type="button" onClick={() => void darDeAlta(true)}>
            Dar de alta igualmente
          </button>
        </div>
      )}
      <button type="button" onClick={() => void darDeAlta(false)}>
        Dar de alta
      </button>
      <button type="button" onClick={alCancelar}>
        Cancelar
      </button>
    </fieldset>
  );
}
