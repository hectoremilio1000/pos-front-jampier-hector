import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // v4.x compatible con Vite 6 :contentReference[oaicite:2]{index=2}
import tailwind from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    port: 5004, // Cambia este puerto al que desees
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
