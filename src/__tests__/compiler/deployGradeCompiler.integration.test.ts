/// <reference types="node" />
// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";
import { resetDeployGradeCompilerStateForTests } from "../../compiler/deployGradeCompiler";
import { resetMoveBuilderLiteForTests } from "../../compiler/moveBuilderLite";

interface ExecFileSyncForTests {
  (command: string, args: readonly string[], options: {
    readonly cwd: string;
    readonly encoding: "utf8";
  }): string;
}

interface ProcessModuleForTests {
  readonly env: Record<string, string | undefined>;
  cwd(): string;
}

interface PathModuleForTests {
  resolve(...paths: readonly string[]): string;
}

interface RealBuilderFixtureResult {
  readonly moduleCount: number;
  readonly dependencyCount: number;
  readonly digestLength: number;
  readonly builderToolchainVersion: string;
}

async function runRealDeployGradeFixtureCompile(): Promise<RealBuilderFixtureResult> {
  const { execFileSync } = await import("node:child_process") as { readonly execFileSync: ExecFileSyncForTests };
  const processModule = await import("node:process") as ProcessModuleForTests;
  const pathModule = await import("node:path") as PathModuleForTests;
  const repositoryRoot = processModule.cwd();
  const bunExecutable = processModule.env.BUN_INSTALL
    ? pathModule.resolve(processModule.env.BUN_INSTALL, "bin/bun")
    : processModule.env.HOME
      ? pathModule.resolve(processModule.env.HOME, ".bun/bin/bun")
      : "bun";
  const script = [
    'import { readFileSync } from "node:fs";',
    'import { compileForDeployment } from "./src/compiler/deployGradeCompiler.ts";',
    'import { loadMoveBuilderLite, verifyMoveBuilderLiteIntegrity } from "./src/compiler/moveBuilderLite.ts";',
    'import { getPackageReferenceBundle } from "./src/data/packageReferences.ts";',
    'const snapshot = JSON.parse(readFileSync("./public/deploy-grade-resolution-snapshots/v0.0.23.json", "utf8"));',
    'const target = getPackageReferenceBundle("testnet:stillness");',
    'const artifact = {',
    '  artifactId: "fixture-1",',
    '  moduleName: "starter_contract",',
    '  requestedModuleName: "starter_contract",',
    '  sourceDagId: "starter_contract",',
    '  moveToml: `[package]\nname = "starter_contract"\nedition = "2024.beta"\n\n[addresses]\nbuilder_extensions = "0x0"\nworld = "0x0"\n\n[dependencies]\nworld = { local = "deps/world" }\n`,',
    '  moveSource: "module builder_extensions::starter_contract {}",',
    '  sourceFilePath: "sources/starter_contract.move",',
    '  sourceMap: [],',
    '  packageName: "starter_contract",',
    '  sourceFiles: [',
    '    { path: "sources/starter_contract.move", content: "module builder_extensions::starter_contract {}" },',
    '    { path: "deps/world/Move.toml", content: `[package]\\nname = "world"\\n` },',
    '  ],',
    '};',
    'const { initMoveCompiler, resolveDependencies, buildMovePackage, getSuiMoveVersion } = await loadMoveBuilderLite();',
    'const result = await compileForDeployment({',
    '  artifact,',
    '  worldSource: { files: { "Move.toml": `[package]\\nname = "world"\\n` }, sourceVersionTag: "v0.0.23", fetchedAt: 1 },',
    '  target,',
    '  cachedResolution: {',
    '    targetId: target.targetId,',
    '    sourceVersionTag: snapshot.sourceVersionTag,',
    '    resolvedAt: snapshot.resolvedAt,',
    '    resolvedDependencies: snapshot.resolvedDependencies,',
    '  },',
    '}, {',
    '  initMoveCompiler,',
    '  resolveDependencies,',
    '  buildMovePackage,',
    '  getSuiMoveVersion,',
    '  verifyMoveCompilerIntegrity: verifyMoveBuilderLiteIntegrity,',
    '});',
    'console.log(JSON.stringify({ moduleCount: result.modules.length, dependencyCount: result.dependencies.length, digestLength: result.digest.length, builderToolchainVersion: result.builderToolchainVersion }));',
  ].join("\n");
  const output = execFileSync(bunExecutable, ["-e", script], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const resultLine = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .at(-1);

  if (resultLine === undefined) {
    throw new Error("Expected deploy-grade fixture compile output.");
  }

  return JSON.parse(resultLine) as RealBuilderFixtureResult;
}

describe("deployGradeCompiler integration", () => {
  beforeEach(() => {
    resetDeployGradeCompilerStateForTests();
    resetMoveBuilderLiteForTests();
  });

  it("compiles the real Stillness v0.0.23 bundled snapshot with the live builder", async () => {
    const result = await runRealDeployGradeFixtureCompile();

    expect(result.moduleCount).toBeGreaterThan(0);
    expect(result.dependencyCount).toBeGreaterThan(0);
    expect(result.digestLength).toBe(32);
    expect(result.builderToolchainVersion).toBeTruthy();
  }, 120000);
});