// Crear cuenta (T-19; REQ-20). Valida antes de enviar con las reglas compartidas y sugiere usar una frase.
import { useState } from "react";
import { llamar, type Esquemas } from "../../api/cliente";
import { Enlace } from "../../componentes/Enlace";
import { Campo } from "../../componentes/Campo";
import { validarContrasena, validarCorreo } from "../../dominio/validacion";
import { navegar } from "../../navegacion";
import { guardarSesion } from "../../sesion";
import { AYUDA_CONTRASENA, erroresDeCampo, mensajeGeneral, type Errores } from "./comun";

export function CrearCuenta() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setAviso("");
    const locales = [validarCorreo(correo), validarContrasena(contrasena)].filter((e) => e !== null);
    setErrores(Object.fromEntries(locales.map((e) => [e.campo, e.mensaje])));
    if (locales.length > 0) return;

    setEnviando(true);
    const resultado = await llamar<Esquemas["Cuenta"]>("POST", "/cuenta", { correo: correo.trim(), contrasena });
    setEnviando(false);
    if (resultado.ok) {
      await guardarSesion(resultado.datos);
      navegar("/");
      return;
    }
    setErrores(erroresDeCampo(resultado));
    setAviso(mensajeGeneral(resultado));
  }

  return (
    <main>
      <h1>Crear cuenta</h1>
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
          ayuda={AYUDA_CONTRASENA}
          autocompletar="new-password"
        />
        {aviso && <p role="alert">{aviso}</p>}
        {aviso && <Enlace a="/recuperar">He olvidado mi contraseña</Enlace>}
        <button type="submit" disabled={enviando}>
          Crear cuenta
        </button>
      </form>
      <p>
        ¿Ya tienes cuenta? <Enlace a="/entrar">Entrar</Enlace>
      </p>
    </main>
  );
}
