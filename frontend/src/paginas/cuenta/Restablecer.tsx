// Restablecer la contraseña con el enlace del correo (T-19; REQ-21; research R9).
//
// Lee el token de la dirección y lo quita enseguida de la barra de direcciones (y del historial). La página
// se sirve con Referrer-Policy: no-referrer (despliegue/Caddyfile). Al terminar no inicia sesión.
import { useEffect, useState } from "react";
import { llamar } from "../../api/cliente";
import { Campo } from "../../componentes/Campo";
import { Enlace } from "../../componentes/Enlace";
import { validarContrasena } from "../../dominio/validacion";
import { AYUDA_CONTRASENA, erroresDeCampo, mensajeGeneral, type Errores } from "./comun";

type Estado = "formulario" | "hecho" | "enlace-no-valido";

export function Restablecer() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [estado, setEstado] = useState<Estado>(token ? "formulario" : "enlace-no-valido");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setAviso("");
    const error = validarContrasena(contrasena);
    setErrores(error ? { contrasena: error.mensaje } : {});
    if (error) return;

    setEnviando(true);
    const resultado = await llamar("POST", "/cuenta/recuperacion/confirmar", { token, contrasena });
    setEnviando(false);
    if (resultado.ok) {
      setEstado("hecho");
      return;
    }
    if (resultado.estado === 400) setEstado("enlace-no-valido");
    setErrores(erroresDeCampo(resultado));
    setAviso(mensajeGeneral(resultado));
  }

  if (estado === "hecho") {
    return (
      <main>
        <h1>Nueva contraseña</h1>
        <p role="status">Contraseña cambiada. Por seguridad hemos cerrado tus sesiones: entra con la nueva.</p>
        <Enlace a="/entrar">Entrar</Enlace>
      </main>
    );
  }

  if (estado === "enlace-no-valido") {
    return (
      <main>
        <h1>Nueva contraseña</h1>
        <p role="alert">{aviso || "El enlace no es válido o ha caducado. Pide otro."}</p>
        <Enlace a="/recuperar">Pedir otro enlace</Enlace>
      </main>
    );
  }

  return (
    <main>
      <h1>Nueva contraseña</h1>
      <form onSubmit={enviar} noValidate>
        <Campo
          etiqueta="Contraseña nueva"
          tipo="password"
          valor={contrasena}
          alCambiar={setContrasena}
          error={errores["contrasena"]}
          ayuda={AYUDA_CONTRASENA}
          autocompletar="new-password"
        />
        {aviso && <p role="alert">{aviso}</p>}
        <button type="submit" disabled={enviando}>
          Guardar la contraseña
        </button>
      </form>
    </main>
  );
}
