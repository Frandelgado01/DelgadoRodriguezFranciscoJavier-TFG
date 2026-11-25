/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { opcionesPwa } from "./src/pwa/opciones";

// Manifiesto y service worker de la PWA (T-18; research R3 y R11): ver src/pwa/opciones.ts.
export default defineConfig({
  plugins: [react(), VitePWA(opcionesPwa)],
  // Las pruebas de formularios escriben letra a letra y con el equipo cargado pasan de los 5 s por defecto.
  test: { testTimeout: 20_000 },
});
