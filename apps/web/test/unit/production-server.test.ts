import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProductionFetch, serveStaticOrSpa } from "../../src/server/main.js";

const fakeApi = {
  fetch: async (request: Request) => new Response(`api:${new URL(request.url).pathname}`),
};

describe("production server dispatch", () => {
  let clientDir: string;

  beforeEach(() => {
    clientDir = mkdtempSync(join(tmpdir(), "fibonaipe-client-"));
    mkdirSync(join(clientDir, "assets"));
    writeFileSync(join(clientDir, "index.html"), "<!doctype html><div id=root></div>");
    writeFileSync(join(clientDir, "assets", "app.js"), "console.log(1);");
    writeFileSync(join(clientDir, "secret.txt"), "nope");
  });

  afterEach(() => {
    rmSync(clientDir, { recursive: true, force: true });
  });

  const dispatch = () => createProductionFetch(fakeApi, clientDir);

  it("routes /healthz and /api/* to the Hono app", async () => {
    const handler = dispatch();
    expect(await (await handler(new Request("http://x/healthz"))).text()).toBe("api:/healthz");
    expect(await (await handler(new Request("http://x/api/auth/me"))).text()).toBe("api:/api/auth/me");
  });

  it("serves the SPA shell for client routes", async () => {
    const handler = dispatch();
    for (const path of ["/", "/teams", "/login", "/r/ABC123"]) {
      const response = await handler(new Request(`http://x${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
      expect(await response.text()).toContain("id=root");
    }
  });

  it("serves built assets with the right type and cache policy", async () => {
    const response = await dispatch()(new Request("http://x/assets/app.js"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/javascript; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it("returns 404 for a missing asset instead of the SPA shell", async () => {
    const response = await dispatch()(new Request("http://x/assets/missing.js"));
    expect(response.status).toBe(404);
  });

  it("refuses paths that escape the client directory", () => {
    // The URL parser already collapses plain `..` segments, so feed the encoded
    // separator straight to the static server, where it is decoded later.
    expect(serveStaticOrSpa(clientDir, "/..%2fsecret.txt").status).toBe(403);
    expect(serveStaticOrSpa(clientDir, "/..%2f..%2fetc%2fpasswd").status).toBe(403);
  });

  it("rejects malformed percent-encoding", () => {
    expect(serveStaticOrSpa(clientDir, "/%E0%A4%A").status).toBe(400);
  });
});
