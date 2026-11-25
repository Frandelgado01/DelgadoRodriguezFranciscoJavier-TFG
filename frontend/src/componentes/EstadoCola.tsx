// Contador de operaciones sin aplicar, siempre visible (T-40; REQ-06; research R3 y R16): los datos solo están a
// salvo cuando se envían. Distingue lo pendiente, que se envía solo, de lo rechazado, que necesita al agricultor.
import { useSyncExternalStore } from "react";
import { useConsulta } from "../db/consulta";
import { contarOperaciones } from "../sync/cola";
import { alCambiarVaciado, ultimoVaciado } from "../sync/vaciado";
import { Enlace } from "./Enlace";

const NINGUNA = { pendientes: 0, rechazadas: 0 };

function textoPendientes(n: number): string {
  return n === 1 ? "1 registro pendiente de enviar" : `${n} registros pendientes de enviar`;
}

function textoRechazadas(n: number): string {
  return n === 1 ? "1 registro rechazado" : `${n} registros rechazados`;
}

export function EstadoCola() {
  const { pendientes, rechazadas } = useConsulta(contarOperaciones, NINGUNA);
  const vaciado = useSyncExternalStore(alCambiarVaciado, ultimoVaciado);
  const motivo = vaciado.estado === "detenida" && pendientes > 0 ? vaciado.motivo : null;
  return (
    <div role="status" aria-label="Envío de registros">
      {pendientes === 0 && rechazadas === 0 && <p>Todo enviado</p>}
      {pendientes > 0 && <p>{textoPendientes(pendientes)}</p>}
      {rechazadas > 0 && <p>{textoRechazadas(rechazadas)}</p>}
      {motivo === "sesion" && (
        <p>
          Vuelve a entrar para enviar los registros. <Enlace a="/entrar">Entrar</Enlace>
        </p>
      )}
      {motivo === "otra-cuenta" && (
        <p>
          En este navegador ha entrado otra cuenta. Entra con la tuya para enviar los registros.{" "}
          <Enlace a="/entrar">Entrar</Enlace>
        </p>
      )}
      {motivo === "servidor" && <p>El servidor no responde. Se volverá a intentar.</p>}
    </div>
  );
}
