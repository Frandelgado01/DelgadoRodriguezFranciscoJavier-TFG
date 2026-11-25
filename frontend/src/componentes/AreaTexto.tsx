// Texto de varias líneas con su etiqueta y el error en lenguaje llano junto al campo.
import { useId } from "react";

interface Props {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
}

export function AreaTexto({ etiqueta, valor, alCambiar, error }: Props) {
  const id = useId();
  const idError = `${id}-error`;
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <textarea
        id={id}
        value={valor}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        onChange={(evento) => alCambiar(evento.target.value)}
      />
      {error && (
        <p id={idError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
