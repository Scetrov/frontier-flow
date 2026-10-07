import assert from "node:assert/strict";
import { test } from "node:test";
import { startSuiGrpcResponder } from "./sui-grpc-responder.mjs";

const origin = "http://127.0.0.1:5173";
for (const mode of ["success", "unavailable", "rejected-preflight"]) {
  test(`gRPC responder ${mode}`, async () => {
    const fixture = await startSuiGrpcResponder({ origin, mode });
    try {
      const path = `${fixture.baseUrl}/sui.rpc.v2.StateService/GetBalance`;
      const preflight = await fetch(path, {
        method: "OPTIONS",
        headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-grpc-web,x-sui-client-protocol-version" },
      });
      assert.equal(preflight.status, mode === "rejected-preflight" ? 403 : 204);
      assert.equal(preflight.headers.get("access-control-allow-origin"), mode === "rejected-preflight" ? null : origin);
      if (mode === "rejected-preflight") return;
      const response = await fetch(path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/grpc-web-text" }, body: "AAAAAAA=" });
      assert.equal(response.status, mode === "unavailable" ? 503 : 200);
      if (mode === "success") assert.equal(response.headers.get("content-type"), "application/grpc-web-text");
      const legacy = await fetch(fixture.baseUrl, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", method: "suix_getBalance", params: ["0x1"] }) });
      assert.equal(legacy.status, 400);
    } finally {
      await fixture.close();
    }
  });
}
