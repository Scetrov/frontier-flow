import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
// Resolve the actual Ajv dependency, not an unrelated hoisted copy.
function resolveConsumerPackage() {
  const validatorRequire = createRequire(require.resolve("@commitlint/config-validator"));
  const ajvRequire = createRequire(validatorRequire.resolve("ajv"));
  return ajvRequire.resolve("fast-uri");
}
const uri = require(process.env.FAST_URI_TEST_PACKAGE ?? resolveConsumerPackage());

test("GHSA-58mr-gqgx-xq4g: reject unterminated bracket hosts", () => {
  for (const input of ["http://[fe80", "http://[", "http://[not-an-ip"]) {
    assert.ok(uri.parse(input).error, `Expected malformed host error for ${input}`);
  }
});

test("GHSA-hrr3-gc8f-f4qj: canonicalize encoded uppercase hosts", () => {
  assert.equal(uri.parse("//%41.com").host, "a.com");
  assert.equal(uri.normalize("//%41.com"), "//a.com");
  assert.equal(uri.equal("//%41.com", "//a.com"), true);
});

test("GHSA-qw65-cvwx-89v3: reject authority delimiters in ports", () => {
  const components = {
    scheme: "http",
    host: "trusted.example",
    port: "@127.0.0.1:8124",
    path: "/app",
  };
  assert.throws(() => uri.serialize({ ...components }), /URI port is malformed/);
  assert.throws(() => uri.normalize({ ...components }), /URI port is malformed/);
  assert.equal(uri.equal({ ...components }, { ...components }), false);
});

test("valid IPv6 hosts and numeric ports remain supported", () => {
  const parsed = uri.parse("http://[::1]:8124/app");
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.host, "::1");
  assert.equal(parsed.port, 8124);
  assert.equal(uri.serialize({ scheme: "http", host: "trusted.example", port: 8124, path: "/app" }),
    "http://trusted.example:8124/app");
});
