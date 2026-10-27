import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function honoDevApi(): Plugin {
  return {
    name: "fibonaipe-hono-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        const path = url.split("?")[0] ?? "";
        if (path !== "/healthz" && !path.startsWith("/api/")) {
          next();
          return;
        }
        void import("./src/server/dev-gateway.ts")
          .then(async ({ createDevGateway }) => {
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (typeof value === "string") headers.set(key, value);
              else if (Array.isArray(value)) headers.set(key, value.join(", "));
            }
            const host = headers.get("host") ?? "localhost:5173";
            const request = new Request(`http://${host}${url}`, { method: req.method, headers });
            const response = await createDevGateway().fetch(request);
            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
              res.setHeader(key, value);
            });
            res.end(new Uint8Array(await response.arrayBuffer()));
          })
          .catch((error: unknown) => {
            res.statusCode = 500;
            res.end(error instanceof Error ? error.message : "API error");
          });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), honoDevApi()],
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
  build: {
    target: "es2022",
    outDir: "dist/client",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) return "react";
          if (id.includes("node_modules/@tanstack/")) return "tanstack";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
