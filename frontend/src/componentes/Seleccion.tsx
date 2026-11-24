// Lista desplegable con su etiqueta y el error en lenguaje llano junto a ella.
import { useId } from "react";

interface Props {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  alCambiar: (valor: string) => void;
  error?: string | undefined;
}

export function Seleccion({ etiqueta, valor, opciones, alCambiar, error }: Props) {
  const id = useId();
  const idError = `${id}-error`;
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <select
        id={id}
        value={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        onChange={(evento) => alCambiar(evento.target.value)}
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>
      {error && (
        <p id={idError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
