// Datos de la explotación (T-29; historia 4; REQ-14 a REQ-17): parcelas, personas, equipos y productos que se
// eligen al registrar un tratamiento.
import { Enlace } from "../../componentes/Enlace";
import { EQUIPOS } from "./equipos";
import { PARCELAS } from "./parcelas";
import { PERSONAS } from "./personas";
import { PRODUCTOS } from "./productos";
import { Seccion } from "./Seccion";

export function Explotacion() {
  return (
    <main>
      <h1>Datos de la explotación</h1>
      <p>
        <Enlace a="/">Volver al cuaderno</Enlace>
      </p>
      <Seccion definicion={PARCELAS} />
      <Seccion definicion={PERSONAS} />
      <Seccion definicion={EQUIPOS} />
      <Seccion definicion={PRODUCTOS} />
    </main>
  );
}
