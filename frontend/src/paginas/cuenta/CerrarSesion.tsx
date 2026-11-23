// Cerrar sesión (T-19; REQ-20; research R9).
//
// Con la cola vacía, cierra la sesión en el servidor y borra los datos del dispositivo. Si hay registros sin
// enviar, avisa antes: si aun así se cierra, los registros se quedan en el móvil y se envían al volver a entrar.
import { useState } from "react";
import { llamar } from "../../api/cliente";
import { navegar } from "../../navegacion";
import { borrarDatosLocales, borrarSesion, operacionesPendientes } from "../../sesion";
import { mensajeGeneral } from "./comun";

export function CerrarSesion() {
  const [pendientes, setPendientes] = useState(0);
  const [aviso, setAviso] = useState("");

  async function salir(borrarTodo: boolean) {
    const resultado = await llamar("DELETE", "/sesion");
    if (!resultado.ok) {
      setAviso(mensajeGeneral(resultado));
      return;
    }
    if (borrarTodo) await borrarDatosLocales();
    else await borrarSesion();
    navegar("/entrar");
  }

  async function pedirCierre() {
    setAviso("");
    const enCola = await operacionesPendientes();
    if (enCola === 0) {
      await salir(true);
      return;
    }
    setPendientes(enCola);
  }

  if (pendientes > 0) {
    const registros = pendientes === 1 ? "1 registro sin enviar" : `${pendientes} registros sin enviar`;
    return (
      <div role="alertdialog" aria-label="Registros sin enviar">
        <p>
          Tienes {registros}. Conéctate para enviarlos antes de salir. Si cierras la sesión ahora, se quedan en este
          móvil y se enviarán cuando vuelvas a entrar con conexión.
        </p>
        {aviso && <p role="alert">{aviso}</p>}
        <button type="button" onClick={() => void salir(false)}>
          Cerrar sesión sin borrar los registros
        </button>
        <button type="button" onClick={() => setPendientes(0)}>
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <>
      {aviso && <p role="alert">{aviso}</p>}
      <button type="button" onClick={() => void pedirCierre()}>
        Cerrar sesión
      </button>
    </>
  );
}
