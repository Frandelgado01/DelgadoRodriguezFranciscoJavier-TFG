// Opciones de vite-plugin-pwa (T-18; research R3 y R11).
//
// - generateSW (Workbox) solo precachea la carcasa de la app: HTML, JS, CSS e iconos.
// - Sin runtimeCaching y sin Background Sync: los datos viven en IndexedDB (Dexie) y la cola de
//   operaciones se vacía desde la app al abrirla, con el evento online y cada 60 s (R3). Así se comporta
//   igual en Android y en iOS, donde Safari no implementa Background Sync.
// - Las navegaciones devuelven index.html (la app decide la página), salvo las de /api.
import type { VitePWAOptions } from "vite-plugin-pwa";

export const opcionesPwa = {
  strategies: "generateSW",
  registerType: "autoUpdate",
  injectRegister: "auto",
  includeAssets: [],
  manifest: {
    name: "Cuaderno de Campo",
    short_name: "Cuaderno",
    description: "Cuaderno de explotación digital para registrar los tratamientos fitosanitarios.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2e7d32",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-512-adaptable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
    runtimeCaching: [],
    cleanupOutdatedCaches: true,
  },
} satisfies Partial<VitePWAOptions>;
