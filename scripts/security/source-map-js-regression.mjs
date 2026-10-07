import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../", import.meta.url));
const version = "1.2.2";
const integrity = "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==";
const consumers = ["@tailwindcss/node", "css-tree", "magicast", "postcss"];

function resolvedPackage() {
  const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.overrides["source-map-js"], version);

  // Bun's text lockfile has trailing commas, but each package row is a JSON array.
  // Inspect every matching resolution, including nested copies, not just the override.
  const rows = readFileSync(new URL("../../bun.lock", import.meta.url), "utf8")
    .split("\n")
    .flatMap((line) => {
      const match = line.match(/^\s*"([^"]+)": (\[.*\]),?$/);
      return match ? [[match[1], JSON.parse(match[2])]] : [];
    });
  const resolutions = rows.filter(([name]) => name === "source-map-js" || name.endsWith("/source-map-js"));
  assert.ok(resolutions.length > 0, "Bun must record a source-map-js resolution");
  for (const [name, entry] of resolutions) {
    assert.equal(entry[0], `source-map-js@${version}`, `${name} must be patched`);
    assert.equal(entry[3], integrity, `${name} must match verified registry integrity`);
  }

  let packagePath;
  const installedRoot = realpathSync(`${root}node_modules`);
  for (const name of consumers) {
    assert.ok(rows.find(([key, entry]) => key === name && entry[2].dependencies?.["source-map-js"]),
      `${name} must remain a consumer in the committed graph`);
    const consumerRequire = createRequire(require.resolve(name));
    const path = realpathSync(consumerRequire.resolve("source-map-js/package.json"));
    const location = relative(installedRoot, path);
    assert.ok(location !== ".." && !location.startsWith(`..${sep}`) && !location.startsWith(sep),
      `${name} must resolve inside this repository's node_modules`);
    assert.equal(JSON.parse(readFileSync(path, "utf8")).version, version, `${name} must load the locked version`);
    if (packagePath) assert.equal(path, packagePath, "All consumers must resolve the same patched package");
    packagePath = path;
  }
  return require(dirname(packagePath));
}

function indexedMap(offset) {
  return {
    version: 3,
    sections: [{
      offset,
      map: {
        version: 3,
        sources: ["input.js"],
        sourcesContent: ["const value = 1;"],
        names: [],
        mappings: "AAAA",
      },
    }],
  };
}

test("GHSA-68fv-2mgg-jv7q: every consumer uses the integrity-pinned patched resolution", () => {
  resolvedPackage();
});

test("source-map-js: minimal valid indexed map preserves source mapping data", () => {
  const { SourceMapConsumer } = resolvedPackage();
  const consumer = new SourceMapConsumer(indexedMap({ line: 0, column: 0 }));
  assert.deepEqual(consumer.sources, ["input.js"]);
  assert.equal(consumer.sourceContentFor("input.js"), "const value = 1;");
  const mappings = [];
  consumer.eachMapping((mapping) => mappings.push(mapping));
  assert.equal(mappings.length, 1);
  assert.equal(mappings[0].source, "input.js");
  assert.equal(mappings[0].originalLine, 1);
  assert.equal(mappings[0].originalColumn, 0);
  assert.equal(mappings[0].generatedLine, 1);
  assert.equal(mappings[0].generatedColumn, 0);
});

test("GHSA-68fv-2mgg-jv7q: small malformed line and column offsets are rejected promptly", () => {
  const { SourceMapConsumer } = resolvedPackage();
  // Never use large offsets: a timeout cannot interrupt synchronous event-loop blocking.
  // Version/integrity and OSV evidence cover the upper-bound fix without recreating the DoS.
  for (const value of [-1, 0.5, "1", null, false]) {
    for (const field of ["line", "column"]) {
      const offset = { line: 0, column: 0, [field]: value };
      assert.throws(() => new SourceMapConsumer(indexedMap(offset)),
        /Section offset line and column must be non-negative integers/,
        `Expected rejection for ${field}=${JSON.stringify(value)}`);
    }
  }
});
