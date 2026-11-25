// Descartar un registro rechazado, con confirmación (T-42; REQ-06, escenario 10; R16): nunca llegó al servidor.
import { useState } from "react";
import { descartar } from "../../sync/cola";

export function Descartar({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState("");

  async function confirmar() {
    const resultado = await descartar(id);
    setConfirmando(false);
    if (!resultado.ok) setAviso(resultado.mensaje);
  }

  if (confirmando) {
    return (
      <p>
        ¿Descartar este registro? Se borrará de este dispositivo y no se enviará nunca.{" "}
        <button type="button" onClick={() => void confirmar()}>
          Sí, descartar
        </button>
        <button type="button" onClick={() => setConfirmando(false)}>
          Cancelar
        </button>
      </p>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAviso("");
          setConfirmando(true);
        }}
      >
        Descartar
      </button>
      {aviso && <p role="alert">{aviso}</p>}
    </>
  );
}
