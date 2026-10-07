import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const roots = ["src", "scripts"];
const skipped = [
  "src/__tests__/",
  "scripts/security/no-legacy-sui-jsonrpc.mjs",
];
const patterns = [
  /SuiJsonRpcClient/,
  /@mysten\/sui\/jsonRpc/,
  /@mysten\/dapp-kit(?!-)/,
  /executeTransactionBlock\(/,
  /devInspectTransactionBlock\(/,
  /"jsonrpc"\s*:/,
];

function files(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx|mjs|js)$/.test(path) ? [path] : [];
  });
}

test("maintained runtime does not reintroduce legacy Sui JSON-RPC", () => {
  const violations = [];
  for (const directory of roots) {
    for (const path of files(join(root, directory))) {
      const rel = relative(root, path);
      if (skipped.some((prefix) => rel.startsWith(prefix))) continue;
      const source = readFileSync(path, "utf8");
      for (const pattern of patterns) {
        if (pattern.test(source)) violations.push(`${rel}: ${pattern}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});
