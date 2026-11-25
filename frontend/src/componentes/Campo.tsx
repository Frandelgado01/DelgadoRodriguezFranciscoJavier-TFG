// Campo de formulario con su etiqueta, una ayuda opcional y el error en lenguaje llano junto al campo.
import { useId } from "react";

interface Props {
  etiqueta: string;
  tipo?: "text" | "email" | "password" | "date";
  valor: string;
  alCambiar: (valor: string) => void;
  error?: string | undefined;
  ayuda?: string;
  autocompletar?: string;
  obligatorio?: boolean;
  /** Teclado del móvil para números: "numeric" (enteros) o "decimal" (admite la coma). */
  teclado?: "numeric" | "decimal";
}

export function Campo({
  etiqueta,
  tipo = "text",
  valor,
  alCambiar,
  error,
  ayuda,
  autocompletar,
  obligatorio,
  teclado,
}: Props) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const descripcion = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(" ");
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type={tipo}
        value={valor}
        autoComplete={autocompletar}
        required={obligatorio}
        inputMode={teclado}
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
