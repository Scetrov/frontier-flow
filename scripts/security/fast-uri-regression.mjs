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

test("GHSA-333x-w4r6-6crp: suffix references cannot activate a scheme", () => {
  for (const scheme of ["javascript", "data", "vbscript"]) {
    // Exercise suffix serialization directly: a path colon must stay inert
    // when the reference emits neither a scheme nor an authority.
    const output = uri.serialize({ scheme: "custom", path: `${scheme}:payload` }, { reference: "suffix" });
    assert.equal(output, `${scheme}%3Apayload`);
  }
});

test("GHSA-w74x-v6f9-j3xg: encoded schemes are not decoded into live schemes", () => {
  for (const input of [
    "%6Aavascript:alert(1)", "%u006Aavascript:alert(1)",
    "%64ata:text/plain,payload", "%u0064ata:text/plain,payload",
    "%76bscript:payload", "%u0076bscript:payload",
  ]) {
    assert.match(uri.parse(input).error ?? "", /URI scheme is malformed/);
    assert.equal(uri.normalize(input), input);
    assert.throws(() => uri.resolve("https://safe.example/", input), /URI scheme is malformed/);
  }
  assert.equal(uri.equal("%68ttp://a/", "http://a/"), false);
});

test("GHSA-wjr9-j795-jxcr: malformed hosts are not silently canonicalized", () => {
  for (const input of ["http://a@b@evil.example/", "http://exa\tmple.com/",
    "http://exa\rmple.com/", "http://exa\nmple.com/"]) {
    assert.ok(uri.parse(input).error, JSON.stringify(input));
  }
});

test("GHSA-xhq7-xmqj-769h: normalization preserves relative destinations", () => {
  const base = "https://safe.example/one/two/index.html";
  for (const reference of ["a/../b", "../x", "../../x"]) {
    assert.equal(uri.resolve(base, uri.normalize(reference)), uri.resolve(base, reference));
  }
  assert.equal(uri.equal("../x", "x"), false);
});

test("valid IPv6 hosts and numeric ports remain supported", () => {
  const parsed = uri.parse("http://[::1]:8124/app");
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.host, "::1");
  assert.equal(parsed.port, 8124);
  assert.equal(uri.serialize({ scheme: "http", host: "trusted.example", port: 8124, path: "/app" }),
    "http://trusted.example:8124/app");
});
