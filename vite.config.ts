import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,

    // Allows all Tunnelmole-generated subdomains
    allowedHosts: [".tunnelmole.net"],

    hmr: {
      overlay: false,
    },
  },

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    rollupOptions: {
      output: {
        // Libraries that rarely change get their own files, so browsers keep them cached across
        // deploys. Lazy-only libraries (charts, barcode reader, QR) stay with the pages that use them.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui") || id.includes("@floating-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("@tanstack")) return "query";
        },
      },
    },
  },
});