import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

async function readRequestBody(req: NodeJS.ReadableStream & { method?: string }): Promise<Uint8Array | null> {
  const method = req.method?.toUpperCase() ?? "GET";
  if (method === "GET" || method === "HEAD") return null;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return null;
  return Buffer.concat(chunks);
}

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
        void server
          .ssrLoadModule("/src/server/dev-gateway.ts")
          .then(async (loaded: { createDevGateway: () => { fetch: (request: Request) => Promise<Response> } }) => {
            const { createDevGateway } = loaded;
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers)) {
              if (typeof value === "string") headers.set(key, value);
              else if (Array.isArray(value)) headers.set(key, value.join(", "));
            }
            headers.delete("content-length");
            const host = headers.get("host") ?? "localhost:5173";
            const body = await readRequestBody(req);
            const request = new Request(`http://${host}${url}`, {
              method: req.method,
              headers,
              body: body ?? undefined,
            });
            const response = await createDevGateway().fetch(request);
            res.statusCode = response.status;
            response.headers.forEach((value, key) => {
              if (key.toLowerCase() === "set-cookie") return;
              res.setHeader(key, value);
            });
            const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
            if (cookies.length > 0) res.setHeader("set-cookie", cookies);
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
  ssr: {
    noExternal: [/^@fibonaipe\//],
  },
});
