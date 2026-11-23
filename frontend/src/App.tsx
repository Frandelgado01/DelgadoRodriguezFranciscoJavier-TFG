// Carcasa de la app (T-18): elige la página según la ruta y la cambia sin recargar.
import { useSyncExternalStore } from "react";
import { navegar, resolverRuta, type Pagina } from "./navegacion";

function suscribir(aviso: () => void): () => void {
  window.addEventListener("popstate", aviso);
  return () => window.removeEventListener("popstate", aviso);
}

function caminoActual(): string {
  return window.location.pathname;
}

const TITULOS: Record<Pagina, string> = {
  cuaderno: "Cuaderno",
  entrar: "Entrar",
  "crear-cuenta": "Crear cuenta",
  recuperar: "He olvidado mi contraseña",
  restablecer: "Nueva contraseña",
  tratamiento: "Registrar un tratamiento",
  explotacion: "Datos de la explotación",
  historial: "Historial del tratamiento",
};

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

export function App() {
  const camino = useSyncExternalStore(suscribir, caminoActual, () => "/");
  const destino = resolverRuta(camino);
  return (
    <main>
      <h1>{TITULOS[destino.pagina]}</h1>
    </main>
  );
}
