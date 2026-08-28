import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The iTunes Search API is proxied in dev so the browser never hits a
// cross-origin wall. In production either keep a matching proxy in front of
// the app, or call https://itunes.apple.com directly (it currently returns
// permissive CORS headers) - see src/lib/itunes.ts.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5180,
    proxy: {
      "/itunes": {
        target: "https://itunes.apple.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/itunes/, ""),
      },
    },
  },
});
