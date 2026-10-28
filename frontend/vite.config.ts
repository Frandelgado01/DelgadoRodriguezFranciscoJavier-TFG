import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// La configuración de la PWA (manifiesto y service worker) se añade en T-18.
export default defineConfig({
  plugins: [react()],
});
