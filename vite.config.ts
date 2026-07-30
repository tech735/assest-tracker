import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,

    // Allows all Tunnelmole-generated subdomains
    allowedHosts: [".tunnelmole.net"],

    hmr: {
      overlay: false,
    },
  },

  plugins: [react()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));