// Enlace interno: cambia de página sin recargar (T-18).
import { navegar } from "../navegacion";

export function Enlace({ a, children }: { a: string; children: React.ReactNode }) {
  return (
    <a
      href={a}
      onClick={(evento) => {
        evento.preventDefault();
        navegar(a);
      }}
    >
      {children}
    </a>
  );
}
