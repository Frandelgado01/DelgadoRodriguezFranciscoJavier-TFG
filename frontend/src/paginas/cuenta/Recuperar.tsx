// "He olvidado mi contraseña" (T-19; REQ-21). La respuesta es la misma exista o no la cuenta.
import { useState } from "react";
import { llamar, type Esquemas } from "../../api/cliente";
import { Campo } from "../../componentes/Campo";
import { Enlace } from "../../componentes/Enlace";
import { validarCorreo } from "../../dominio/validacion";
import { erroresDeCampo, mensajeGeneral, type Errores } from "./comun";

export function Recuperar() {
  const [correo, setCorreo] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setAviso("");
    const error = validarCorreo(correo);
    setErrores(error ? { correo: error.mensaje } : {});
    if (error) return;

    setEnviando(true);
    const resultado = await llamar<Esquemas["Mensaje"]>("POST", "/cuenta/recuperacion", { correo: correo.trim() });
    setEnviando(false);
    if (resultado.ok) {
      setAviso(resultado.datos.mensaje);
      return;
    }
    setErrores(erroresDeCampo(resultado));
    setAviso(mensajeGeneral(resultado));
  }

  return (
    <main>
      <h1>He olvidado mi contraseña</h1>
      <p>Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <form onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Correo electrónico"
          tipo="email"
          valor={correo}
          alCambiar={setCorreo}
          error={errores["correo"]}
          autocompletar="email"
        />
        {aviso && <p role="status">{aviso}</p>}
        <button type="submit" disabled={enviando}>
          Enviarme el enlace
        </button>
      </form>
      <p>
        <Enlace a="/entrar">Volver a Entrar</Enlace>
      </p>
    </main>
  );
}
