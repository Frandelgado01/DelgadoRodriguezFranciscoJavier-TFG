// Navegación entre las páginas del plan (T-18): cuenta, cuaderno, tratamiento, datos de la explotación e
// historial. Sin dependencias: rutas con la History API y una tabla de patrones.

export type Pagina =
  | "cuaderno"
  | "entrar"
  | "crear-cuenta"
  | "recuperar"
  | "restablecer"
  | "tratamiento"
  | "explotacion"
  | "historial";

export interface Ruta {
  pagina: Pagina;
  patron: RegExp;
  /** Las páginas públicas no piden sesión (cuenta y recuperación). */
  publica: boolean;
}

export const RUTAS: Ruta[] = [
  { pagina: "cuaderno", patron: /^\/$/, publica: false },
  { pagina: "entrar", patron: /^\/entrar\/?$/, publica: true },
  { pagina: "crear-cuenta", patron: /^\/crear-cuenta\/?$/, publica: true },
  { pagina: "recuperar", patron: /^\/recuperar\/?$/, publica: true },
  { pagina: "restablecer", patron: /^\/restablecer\/?$/, publica: true },
  { pagina: "tratamiento", patron: /^\/tratamiento\/nuevo\/?$/, publica: false },
  { pagina: "explotacion", patron: /^\/explotacion\/?$/, publica: false },
  { pagina: "historial", patron: /^\/historial\/(?<id>[^/]+)\/?$/, publica: false },
];

export interface Destino {
  pagina: Pagina;
  id?: string;
}

export function resolverRuta(camino: string): Destino {
  for (const ruta of RUTAS) {
    const coincidencia = ruta.patron.exec(camino);
    if (coincidencia) {
      const id = coincidencia.groups?.["id"];
      return id === undefined ? { pagina: ruta.pagina } : { pagina: ruta.pagina, id };
    }
  }
  return { pagina: "cuaderno" };
}

export function esPublica(pagina: Pagina): boolean {
  return RUTAS.some((ruta) => ruta.pagina === pagina && ruta.publica);
}

/** Cambia de página sin recargar y avisa a la app con el evento popstate. */
export function navegar(camino: string): void {
  window.history.pushState(null, "", camino);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
