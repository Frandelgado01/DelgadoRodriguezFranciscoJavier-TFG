import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Solo se monta en el navegador; en las pruebas de Node no hay `document`.
const raiz = typeof document === "undefined" ? null : document.getElementById("raiz");
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
