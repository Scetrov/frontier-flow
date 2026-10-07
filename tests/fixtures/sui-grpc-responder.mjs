import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";

function frame(flag, bytes) {
  const header = Buffer.alloc(5);
  header[0] = flag;
  header.writeUInt32BE(bytes.length, 1);
  return Buffer.concat([header, bytes]);
}

/** Real protobuf/gRPC-web frames for a successful 12.5 SUI balance. */
export function createSuiGrpcBalanceResponseBody() {
  const protobuf = Buffer.from("ChUKDTB4Mjo6c3VpOjpTVUkYgLq7yC4=", "base64");
  return Buffer.concat([frame(0, protobuf), frame(128, Buffer.from("grpc-status: 0\r\n"))]).toString("base64");
}

/** Actual cross-origin responder; OPTIONS is not bypassed by browser routing. */
export async function startSuiGrpcResponder({ origin, mode = "success", port = 0, tls = null } = {}) {
  if (!origin) throw new Error("An explicit allowed browser origin is required.");
  const requests = [];
  const handler = (req, res) => {
    const entry = { method: req.method, path: req.url, origin: req.headers.origin, jsonRpc: false };
    requests.push(entry);
    if (req.method === "OPTIONS" && mode === "rejected-preflight") {
      res.writeHead(403);
      res.end();
      return;
    }
    if (req.headers.origin === origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "content-type,x-grpc-web,x-sui-client-protocol-version,grpc-timeout,x-user-agent");
      res.setHeader("Access-Control-Expose-Headers", "grpc-status,grpc-message");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      entry.jsonRpc = body.includes('"jsonrpc"');
      if (entry.jsonRpc || req.url !== "/sui.rpc.v2.StateService/GetBalance") {
        res.writeHead(400);
        res.end("Legacy JSON-RPC or unexpected gRPC service path");
        return;
      }
      if (mode === "unavailable") {
        res.writeHead(503);
        res.end("Sui service unavailable");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/grpc-web-text" });
      res.end(createSuiGrpcBalanceResponseBody());
    });
  };
  const server = tls === null ? createHttpServer(handler) : createHttpsServer(tls, handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    baseUrl: `${tls === null ? "http" : "https"}://127.0.0.1:${server.address().port}`,
    requests,
    close: () => new Promise((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => error && error.code !== "ERR_SERVER_NOT_RUNNING" ? reject(error) : resolve());
    }),
  };
}
