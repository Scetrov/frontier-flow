import { createServer } from "node:https";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";

const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".wasm", "application/wasm"],
  [".webmanifest", "application/manifest+json"],
  [".woff2", "font/woff2"],
]);

/** Exact deployed policy, including the approved loopback gRPC sources. */
export function readProductionContentSecurityPolicy() {
  const toml = readFileSync(new URL("../../netlify.toml", import.meta.url), "utf8");
  const match = /Content-Security-Policy = "([^"]+)"/.exec(toml);
  if (match === null) throw new Error("Production Content-Security-Policy is missing from netlify.toml.");
  return match[1];
}

/** Serves the production build with the deployed CSP. This is not the Vite dev server. */
export async function startProductionCspApp({ cert, key, distDir = "dist", contentSecurityPolicy = readProductionContentSecurityPolicy() }) {
  const root = resolve(distDir);
  if (!existsSync(join(root, "index.html"))) throw new Error("Production build is missing. Run bun run build first.");
  const server = createServer({ cert, key }, (request, response) => {
    const pathname = new URL(request.url ?? "/", "https://127.0.0.1").pathname;
    const candidate = resolve(root, `.${pathname}`);
    const insideRoot = candidate === root || candidate.startsWith(`${root}${sep}`);
    const file = insideRoot && existsSync(candidate) && extname(candidate) !== "" ? candidate : join(root, "index.html");
    response.writeHead(200, {
      "Content-Security-Policy": contentSecurityPolicy,
      "Content-Type": CONTENT_TYPES.get(extname(file)) ?? "application/octet-stream",
    });
    response.end(readFileSync(file));
  });
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Production CSP server did not bind a loopback port.");
  return {
    contentSecurityPolicy,
    origin: `https://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveClose, reject) => {
      server.closeAllConnections();
      server.close((error) => error && error.code !== "ERR_SERVER_NOT_RUNNING" ? reject(error) : resolveClose());
    }),
  };
}
