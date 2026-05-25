import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const host = env.TAURI_DEV_HOST || process.env.TAURI_DEV_HOST;
  const hmrHost =
    env.VITE_HMR_HOST ||
    process.env.VITE_HMR_HOST ||
    (host === "0.0.0.0" ? "localhost" : host);
  const disableCustomHmr =
    env.VITE_DISABLE_CUSTOM_HMR === "true" ||
    process.env.VITE_DISABLE_CUSTOM_HMR === "true";
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:13001";
  const stripApiPrefix = env.VITE_API_PROXY_STRIP_PREFIX !== "false";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: host || false,
      port: 1420,
      strictPort: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          rewrite: (requestPath) =>
            stripApiPrefix ? requestPath.replace(/^\/api/, "") : requestPath,
        },
      },
      hmr: !disableCustomHmr && hmrHost
        ? {
            protocol: "ws",
            host: hmrHost,
            port: 1421,
          }
        : undefined,
    },
    clearScreen: false,
  };
});
