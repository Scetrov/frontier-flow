import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const jsdomRequire = createRequire(require.resolve("jsdom"));
const undiciPath = process.env.UNDICI_TEST_PACKAGE ?? jsdomRequire.resolve("undici");
const undiciRequire = createRequire(undiciPath);
const { fetch } = require(undiciPath);
const { EventSourceStream } = undiciRequire("./lib/web/eventsource/eventsource-stream.js");

// A small configured byte limit makes the independent 1024-item state ceiling
// inexpensive to exercise, without allocating dangerous amounts of memory.
for (const [name, chunk] of [["data fields", "data:\n"], ["unfinished chunks", "a"]]) {
  test(`GHSA-4qv8-2p9j-2685: EventSource bounds retained ${name}`, async () => {
    const parser = new EventSourceStream({ maxEventSize: 4096 });
    let failure;
    parser.on("error", (error) => { failure = error; });
    try {
      for (let i = 0; i < 1100 && !parser.destroyed; i++) {
        parser.write(Buffer.from(chunk));
      }
      await new Promise((resolve) => setImmediate(resolve));
      assert.match(failure?.message ?? "no error", /EventSource message size exceeded/);
    } finally {
      parser.destroy();
    }
  });
}

test("EventSource still emits valid events", async () => {
  const parser = new EventSourceStream({ maxEventSize: 4096 });
  const event = once(parser, "data");
  parser.end("data: hello\n\n");
  assert.equal((await event)[0].options.data, "hello");
});

test("GHSA-f72v-6w45-q472: mixed-case SRI tokens enforce the digest", { timeout: 10000 }, async () => {
  const server = createServer((_request, response) => response.end("actual body"));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/`;
  const digest = createHash("sha256").update("pinned body").digest("base64");
  try {
    for (const algorithm of ["sha256", "SHA256", "Sha256"]) {
      await assert.rejects(fetch(url, { integrity: `${algorithm}-${digest}` }),
        (error) => error.cause?.message === "integrity mismatch");
    }
    const valid = createHash("sha256").update("actual body").digest("base64");
    assert.equal(await (await fetch(url, { integrity: `SHA256-${valid}` })).text(), "actual body");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("GHSA-xjj6-f33q-929c: excessive content codings cannot crash fetch", () => {
  // An unhandled stream error terminates a process, so test in a child rather
  // than letting the vulnerable version terminate the entire test runner.
  const child = spawnSync(process.execPath, ["--input-type=module", "--eval", `
    import assert from "node:assert/strict";
    import { createServer } from "node:net";
    import { once } from "node:events";
    import { createRequire } from "node:module";
    const require = createRequire(import.meta.url);
    const { fetch } = require(${JSON.stringify(undiciPath)});
    const server = createServer((socket) => {
      socket.once("data", () => socket.end(
        "HTTP/1.1 200 OK\\r\\n" +
        "Content-Encoding: gzip, gzip, gzip, gzip, gzip, gzip\\r\\n" +
        "Content-Length: 100\\r\\nConnection: close\\r\\n\\r\\n"
      ));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      await assert.rejects(fetch("http://127.0.0.1:" + server.address().port),
        (error) => /content-encoding/i.test(error.cause?.message ?? ""));
      await new Promise((resolve) => setTimeout(resolve, 100));
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  `], { encoding: "utf8", timeout: 10000 });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr || child.stdout);
});
