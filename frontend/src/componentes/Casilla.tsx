// Casilla de verificación con su etiqueta y el error en lenguaje llano junto a ella.
import { useId } from "react";

interface Props {
  etiqueta: string;
  marcada: boolean;
  alCambiar: (marcada: boolean) => void;
  error?: string | undefined;
}

export function Casilla({ etiqueta, marcada, alCambiar, error }: Props) {
  const id = useId();
  const idError = `${id}-error`;
  return (
    <div className="campo">
      <input
        id={id}
        type="checkbox"
        checked={marcada}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        onChange={(evento) => alCambiar(evento.target.checked)}
      />
      <label htmlFor={id}>{etiqueta}</label>
      {error && (
        <p id={idError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
