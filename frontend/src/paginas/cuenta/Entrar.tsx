// Iniciar sesión (T-19; REQ-20 y REQ-22). Con 429 explica la espera con los minutos que faltan.
import { useState } from "react";
import { llamar, type Esquemas } from "../../api/cliente";
import { Campo } from "../../componentes/Campo";
import { Enlace } from "../../componentes/Enlace";
import { navegar } from "../../navegacion";
import { guardarSesion } from "../../sesion";
import { erroresDeCampo, mensajeGeneral, type Errores } from "./comun";

function mensajeEspera(segundos: number): string {
  const minutos = Math.ceil(segundos / 60);
  return `Has fallado la contraseña 5 veces. Espera ${minutos} ${minutos === 1 ? "minuto" : "minutos"} o recupera tu contraseña.`;
}

export function Entrar() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [enEspera, setEnEspera] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setAviso("");
    setEnEspera(false);
    setEnviando(true);
    const resultado = await llamar("POST", "/sesion", { correo: correo.trim(), contrasena });
    if (resultado.ok) {
      const yo = await llamar<Esquemas["Cuenta"]>("GET", "/cuenta/yo");
      setEnviando(false);
      if (yo.ok) {
        await guardarSesion(yo.datos);
        navegar("/");
        return;
      }
      setAviso(mensajeGeneral(yo));
      return;
    }
    setEnviando(false);
    setErrores(erroresDeCampo(resultado));
    if (resultado.estado === 429) {
      setEnEspera(true);
      setAviso(resultado.error.mensaje ?? mensajeEspera(resultado.error.segundosRestantes ?? 900));
      return;
    }
    setAviso(mensajeGeneral(resultado));
  }

  return (
    <main>
      <h1>Entrar</h1>
      <form onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Correo electrónico"
          tipo="email"
          valor={correo}
          alCambiar={setCorreo}
          error={errores["correo"]}
          autocompletar="email"
        />
        <Campo
          etiqueta="Contraseña"
          tipo="password"
          valor={contrasena}
          alCambiar={setContrasena}
          error={errores["contrasena"]}
          autocompletar="current-password"
        />
        {aviso && <p role="alert">{aviso}</p>}
        {enEspera && <Enlace a="/recuperar">Recuperar la contraseña</Enlace>}
        <button type="submit" disabled={enviando}>
          Entrar
        </button>
      </form>
      <p>
        <Enlace a="/recuperar">He olvidado mi contraseña</Enlace>
      </p>
      <p>
        ¿Aún no tienes cuenta? <Enlace a="/crear-cuenta">Crear cuenta</Enlace>
      </p>
    </main>
  );
}
