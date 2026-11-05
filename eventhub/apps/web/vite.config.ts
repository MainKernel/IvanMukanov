import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Конфігурація збирача фронтенду.
 *
 * strictPort: true — якщо 5173 зайнятий, Vite впаде з помилкою,
 * а не мовчки візьме 5174.
 *
 * proxy "/api" — робить сторінку та API одним сайтом (localhost:5173),
 * щоб працювала cookie з SameSite=Strict, а cookiePathRewrite переписує
 * Path=/auth у Set-Cookie на /api/auth.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        cookiePathRewrite: { "/auth": "/api/auth" },
      },
    },
  },
});
