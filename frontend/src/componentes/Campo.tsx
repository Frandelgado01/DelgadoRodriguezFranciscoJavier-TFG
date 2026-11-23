// Campo de formulario con su etiqueta, una ayuda opcional y el error en lenguaje llano junto al campo.
import { useId } from "react";

interface Props {
  etiqueta: string;
  tipo?: "text" | "email" | "password";
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  ayuda?: string;
  autocompletar?: string;
}

export function Campo({ etiqueta, tipo = "text", valor, alCambiar, error, ayuda, autocompletar }: Props) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const descripcion = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(" ");
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type={tipo}
        value={valor}
        autoComplete={autocompletar}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion || undefined}
        onChange={(evento) => alCambiar(evento.target.value)}
      />
      {ayuda && <p id={idAyuda}>{ayuda}</p>}
      {error && (
        <p id={idError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
