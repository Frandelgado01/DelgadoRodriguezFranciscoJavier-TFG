// Consulta a IndexedDB que se repite sola cuando cambian los datos que lee (Dexie liveQuery; T-40).
import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

/** Resultado de la consulta, o `inicial` mientras se lee. `consulta` tiene que ser estable (useCallback). */
export function useConsulta<T>(consulta: () => Promise<T>, inicial: T): T {
  const [valor, setValor] = useState(inicial);
  useEffect(() => {
    const suscripcion = liveQuery(consulta).subscribe({
      next: setValor,
      // La base se cierra al salir de la sesión: la página desaparece con ella.
      error: () => undefined,
    });
    return () => suscripcion.unsubscribe();
  }, [consulta]);
  return valor;
}
