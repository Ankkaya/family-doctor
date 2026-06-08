import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    var host = env.TAURI_DEV_HOST || process.env.TAURI_DEV_HOST;
    var hmrHost = env.VITE_HMR_HOST ||
        process.env.VITE_HMR_HOST ||
        (host === "0.0.0.0" ? "localhost" : host);
    var disableCustomHmr = env.VITE_DISABLE_CUSTOM_HMR === "true" ||
        process.env.VITE_DISABLE_CUSTOM_HMR === "true";
    var apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:13001";
    var stripApiPrefix = env.VITE_API_PROXY_STRIP_PREFIX !== "false";
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
                    rewrite: function (requestPath) {
                        return stripApiPrefix ? requestPath.replace(/^\/api/, "") : requestPath;
                    },
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
