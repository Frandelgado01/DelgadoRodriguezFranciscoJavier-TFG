// Carcasa de la app (T-18 y T-19): elige la página según la ruta y la cambia sin recargar.
//
// Las páginas que no son de cuenta piden la sesión guardada en el dispositivo (sesion.ts), que no necesita
// conexión: así el cuaderno se abre sin cobertura (REQ-06, REQ-20). Sin sesión, se muestra Entrar. Con ellas se
// pone en marcha el envío de la cola y se ve siempre cuánto queda por enviar (T-40; R3).
import { useEffect, useState, useSyncExternalStore } from "react";
import { EstadoCola } from "./componentes/EstadoCola";
import { esPublica, resolverRuta, type Destino, type Pagina } from "./navegacion";
import { Cuaderno } from "./paginas/cuaderno/Cuaderno";
import { CrearCuenta } from "./paginas/cuenta/CrearCuenta";
import { Entrar } from "./paginas/cuenta/Entrar";
import { Recuperar } from "./paginas/cuenta/Recuperar";
import { Restablecer } from "./paginas/cuenta/Restablecer";
import { Explotacion } from "./paginas/explotacion/Explotacion";
import { Tratamiento } from "./paginas/tratamiento/Tratamiento";
import { leerSesion, type SesionLocal } from "./sesion";
import { iniciarSincronizacion } from "./sync/vaciado";

function suscribir(aviso: () => void): () => void {
  window.addEventListener("popstate", aviso);
  return () => window.removeEventListener("popstate", aviso);
}

function caminoActual(): string {
  return window.location.pathname;
}

function PaginaPublica({ pagina }: { pagina: Pagina }) {
  switch (pagina) {
    case "crear-cuenta":
      return <CrearCuenta />;
    case "recuperar":
      return <Recuperar />;
    case "restablecer":
      return <Restablecer />;
    default:
      return <Entrar />;
  }
}

function PaginaPrivada({ pagina, id }: Destino) {
  if (pagina === "explotacion") return <Explotacion />;
  if (pagina === "tratamiento") return <Tratamiento id={id} />;
  if (pagina === "cuaderno") return <Cuaderno />;
  // El historial llega en H6.
  return (
    <main>
      <h1>Historial del tratamiento</h1>
    </main>
  );
}

export function App() {
  const camino = useSyncExternalStore(suscribir, caminoActual, () => "/");
  const destino = resolverRuta(camino);
  // undefined mientras se lee la sesión del dispositivo.
  const [sesion, setSesion] = useState<{ camino: string; valor: SesionLocal | null }>();

  useEffect(() => {
    let vigente = true;
    void leerSesion().then((valor) => {
      if (vigente) setSesion({ camino, valor });
    });
    return () => {
      vigente = false;
    };
  }, [camino]);

  // Se mantiene al cambiar entre páginas privadas y se detiene en las de cuenta (salir o entrar con otra).
  const explotacionId = esPublica(destino.pagina) ? undefined : sesion?.valor?.explotacionId;
  useEffect(() => {
    if (explotacionId !== undefined) return iniciarSincronizacion();
  }, [explotacionId]);

  if (esPublica(destino.pagina)) return <PaginaPublica pagina={destino.pagina} />;
  if (sesion === undefined || sesion.camino !== camino) return null;
  if (sesion.valor === null) return <Entrar />;
  return (
    <>
      <EstadoCola />
      <PaginaPrivada key={camino} {...destino} />
    </>
  );
}
