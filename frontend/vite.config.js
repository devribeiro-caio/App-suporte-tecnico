import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: './',  // Base relativa para funcionar com file:// protocol no Electron
  server: {
    port: 5173,
  },
});
