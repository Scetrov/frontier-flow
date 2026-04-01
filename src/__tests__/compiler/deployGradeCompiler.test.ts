import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type {
  DeployGradeCompileRequest,
  FetchWorldSourceResult,
  ResolvedDependencies,
} from "../../compiler/types";
import { compileForDeployment, resetDeployGradeCompilerStateForTests } from "../../compiler/deployGradeCompiler";
import type { BuildMovePackageFn } from "../../compiler/moveBuilderLite";
import { createGeneratedArtifactStub, createPackageReferenceBundle, createResolvedDependenciesFixture, createResolvedDependencyPackageSnapshot } from "../compiler/helpers";

function toBase64(bytes: readonly number[]): string {
  return btoa(String.fromCharCode(...bytes));
}

function createWorldSource(versionTag = "v0.0.18"): FetchWorldSourceResult {
  return {
    files: {
      "Move.toml": "[package]\nname = \"world\"\n",
    },
    sourceVersionTag: versionTag,
    fetchedAt: 1,
  };
}

function createRequest(overrides: Partial<DeployGradeCompileRequest> = {}): DeployGradeCompileRequest {
  const artifact = createGeneratedArtifactStub({
    moveToml: [
      "[package]",
      'name = "starter_contract"',
      'edition = "2024.beta"',
      "",
      "[addresses]",
      'builder_extensions = "0x0"',
      'world = "0x0"',
      "",
      "[dependencies]",
      'world = { local = "deps/world" }',
      "",
    ].join("\n"),
    sourceFiles: [
      { path: "sources/starter_contract.move", content: "module builder_extensions::starter_contract {}" },
      { path: "deps/world/Move.toml", content: "[package]\nname = \"world\"\n" },
    ],
  });

  return {
    artifact,
    worldSource: createWorldSource(),
    target: createPackageReferenceBundle("testnet:stillness"),
    ...overrides,
  };
}

function getBuildMovePackageInput(
  buildMovePackage: Mock,
  callIndex: number,
): Parameters<BuildMovePackageFn>[0] {
  const calls = buildMovePackage.mock.calls as unknown as ReadonlyArray<readonly [Parameters<BuildMovePackageFn>[0]]>;
  return calls[callIndex][0];
}

describe("deployGradeCompiler", () => {
  beforeEach(() => {
    resetDeployGradeCompilerStateForTests();
  });

  it("derives rootGit from target metadata and rewrites Move.toml for git world dependencies", async () => {
    const resolvedDependencies: ResolvedDependencies = createResolvedDependenciesFixture();
    const resolveDependencies = vi.fn((input: {
      readonly files: Record<string, string>;
      readonly rootGit?: { readonly git: string; readonly rev: string; readonly subdir?: string };
    }) => Promise.resolve().then(() => {
      expect(input.rootGit).toEqual({
        git: "https://github.com/evefrontier/world-contracts.git",
        rev: "v0.0.18",
        subdir: "contracts/world",
      });
      expect(input.files["Move.toml"]).toContain('world = { git = "https://github.com/evefrontier/world-contracts.git", rev = "v0.0.18", subdir = "contracts/world" }');
      expect(input.files["Move.toml"]).not.toContain('world = "0x0"');
      expect(input.files["Move.toml"]).not.toContain('world = { local = "deps/world" }');
      expect(input.files).not.toHaveProperty("deps/world/Move.toml");
      return resolvedDependencies;
    }));
    const buildMovePackage = vi.fn()
      .mockResolvedValueOnce({
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [9, 8, 7],
      })
      .mockResolvedValueOnce({
        modules: [],
        dependencies: [],
        digest: [],
      });

    const result = await compileForDeployment(createRequest(), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies,
      buildMovePackage,
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
      now: () => 42,
    });

    expect(result).toMatchObject({
      dependencies: ["0x1", "0x2"],
      digest: [9, 8, 7],
      targetId: "testnet:stillness",
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
      compiledAt: 42,
    });
    expect(Array.from(result.modules[0] ?? [])).toEqual([1, 2, 3]);
    expect(resolveDependencies).toHaveBeenCalledTimes(1);
    expect(buildMovePackage).toHaveBeenCalledTimes(2);
    const mainBuildInput = getBuildMovePackageInput(buildMovePackage, 0);
    expect(mainBuildInput.resolvedDependencies).toEqual(resolvedDependencies);
    expect(typeof mainBuildInput.files["deps/world/Move.toml"]).toBe("string");
    expect(typeof mainBuildInput.files["deps/sui/Move.toml"]).toBe("string");
    expect(typeof mainBuildInput.files["deps/move-stdlib/Move.toml"]).toBe("string");
  });

  it("reuses cached resolution snapshots for repeated compilations on the same target and version", async () => {
    const resolvedDependencies: ResolvedDependencies = createResolvedDependenciesFixture();
    const resolveDependencies = vi.fn(() => Promise.resolve(resolvedDependencies));
    const buildMovePackage = vi.fn(() => Promise.resolve({
      modules: [toBase64([4, 5, 6])],
      dependencies: ["0x3"],
      digest: [1, 2, 3],
    }));
    const request = createRequest();
    const dependencies = {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies,
      buildMovePackage,
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
      now: () => 99,
    };

    await compileForDeployment(request, dependencies);
    await compileForDeployment(request, dependencies);

    expect(resolveDependencies).toHaveBeenCalledTimes(1);
    expect(buildMovePackage).toHaveBeenCalledTimes(4);
  });

  it("ignores cached resolution snapshots when the target or source version does not match", async () => {
    const resolveDependencies = vi.fn(() => Promise.resolve({
      files: "{resolved:true}",
      dependencies: createResolvedDependenciesFixture().dependencies,
      lockfileDependencies: "{}",
    }));
    const buildMovePackage = vi.fn(() => Promise.resolve({
      modules: [toBase64([7, 8, 9])],
      dependencies: ["0x4"],
      digest: [4, 5, 6],
    }));

    await compileForDeployment(createRequest({
      cachedResolution: {
        targetId: "testnet:utopia",
        sourceVersionTag: "v0.0.21",
        resolvedDependencies: {
          files: "{stale:true}",
          dependencies: createResolvedDependenciesFixture().dependencies,
          lockfileDependencies: "{}",
        },
        resolvedAt: 1,
      },
    }), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies,
      buildMovePackage,
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
      now: () => 99,
    });

    expect(resolveDependencies).toHaveBeenCalledTimes(1);
  });

  it("classifies dependency resolution failures with a deploy-grade error type", async () => {
    await expect(compileForDeployment(createRequest(), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies: vi.fn(() => Promise.reject(new Error("Network fetch failed while resolving GitHub dependency graph"))),
      buildMovePackage: vi.fn(),
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
    })).rejects.toMatchObject({
      name: "DependencyResolutionError",
      userMessage: "Dependency resolution could not reach the upstream world package.",
    });
  });

  it("classifies linkage failures from buildMovePackage as deploy compilation errors", async () => {
    await expect(compileForDeployment(createRequest(), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies: vi.fn(() => Promise.resolve({
        files: "{}",
        dependencies: createResolvedDependenciesFixture().dependencies,
        lockfileDependencies: "{}",
      })),
      buildMovePackage: vi.fn(() => Promise.resolve({
        error: "address with no value",
      })),
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
    })).rejects.toMatchObject({
      name: "DeployCompilationError",
      userMessage: "Deploy-grade compilation failed because dependency linking did not match the live world package.",
    });
  });

  it("sanitizes resolved world dependency sources before the deploy-grade build step", async () => {
    const resolvedDependencies: ResolvedDependencies = {
      files: "{}",
      dependencies: JSON.stringify([
        createResolvedDependencyPackageSnapshot({
          name: "world",
          files: {
            "dependencies/world/tests/primitives/location_tests.move": "module world::location_tests;",
            "dependencies/world/sources/access/access_control.move": [
              "public fun transfer_owner_cap_to_address<T: key>(owner_cap: OwnerCap<T>, new_owner: address, ctx: &mut TxContext) {",
              "    let cap_type = type_name::with_defining_ids<T>();",
              '    let is_character =',
              '        cap_type.module_string() == std::ascii::string(b"character")',
              '        && cap_type.datatype_string() == std::ascii::string(b"Character");',
              '    assert!(!is_character, ECharacterTransfer);',
              "}",
            ].join("\n"),
          },
        }),
        createResolvedDependencyPackageSnapshot({ name: "Sui" }),
        createResolvedDependencyPackageSnapshot({ name: "MoveStdlib" }),
      ]),
      lockfileDependencies: "{}",
    };
    const buildMovePackage = vi.fn()
      .mockResolvedValue({
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [3, 2, 1],
      });

    await compileForDeployment(createRequest(), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies: vi.fn(() => Promise.resolve(resolvedDependencies)),
      buildMovePackage,
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
      now: () => 42,
    });

    const mainBuildInput = buildMovePackage.mock.calls[0]?.[0] as { readonly files?: Record<string, string> };
    expect(mainBuildInput.files).not.toHaveProperty("deps/world/tests/primitives/location_tests.move");
    expect(mainBuildInput.files?.["deps/world/sources/access/access_control.move"]).toContain("let is_character = false;");
    expect(mainBuildInput.files?.["deps/world/sources/access/access_control.move"]).not.toContain("datatype_string()");
    expect(buildMovePackage).toHaveBeenCalledTimes(2);
  });

  it("sanitizes resolved World dependency snapshots even when package names and paths are capitalized", async () => {
    const resolvedDependencies: ResolvedDependencies = {
      files: "{}",
      dependencies: JSON.stringify([
        createResolvedDependencyPackageSnapshot({
          name: "World",
          files: {
            "dependencies/World/tests/assemblies/storage_unit_tests.move": "module world::storage_unit_tests;",
            "dependencies/World/sources/access/access_control.move": [
              "public fun transfer_owner_cap_to_address<T: key>(owner_cap: OwnerCap<T>, new_owner: address, ctx: &mut TxContext) {",
              "    let cap_type = type_name::with_defining_ids<T>();",
              '    let is_character =',
              '        cap_type.module_string() == std::ascii::string(b"character")',
              '        && cap_type.datatype_string() == std::ascii::string(b"Character");',
              '    assert!(!is_character, ECharacterTransfer);',
              "}",
            ].join("\n"),
          },
        }),
        createResolvedDependencyPackageSnapshot({ name: "Sui" }),
        createResolvedDependencyPackageSnapshot({ name: "MoveStdlib" }),
      ]),
      lockfileDependencies: "{}",
    };
    const buildMovePackage = vi.fn()
      .mockResolvedValue({
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [3, 2, 1],
      });

    await compileForDeployment(createRequest(), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies: vi.fn(() => Promise.resolve(resolvedDependencies)),
      buildMovePackage,
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
      now: () => 42,
    });

    const mainBuildInput = buildMovePackage.mock.calls[0]?.[0] as { readonly files?: Record<string, string> };
    expect(mainBuildInput.files).not.toHaveProperty("deps/world/tests/assemblies/storage_unit_tests.move");
    expect(mainBuildInput.files?.["deps/world/sources/access/access_control.move"]).toContain("let is_character = false;");
    expect(mainBuildInput.files?.["deps/world/sources/access/access_control.move"]).not.toContain("datatype_string()");
    expect(buildMovePackage).toHaveBeenCalledTimes(2);
  });

  it("patches the world dependency Move.toml with published-at to match the target worldPackageId before the build step", async () => {
    const targetWorldPackageId = "0xcf6b5da20b0c6540895b79b91580ec0734fcfa4298848f0e8382ef217965bfd5";
    const resolvedDependencies: ResolvedDependencies = {
      files: "{}",
      dependencies: JSON.stringify([
        createResolvedDependencyPackageSnapshot({
          name: "World",
          files: {
            "dependencies/World/sources/example.move": "module world::example {}",
          },
        }),
        createResolvedDependencyPackageSnapshot({ name: "Sui" }),
        createResolvedDependencyPackageSnapshot({ name: "MoveStdlib" }),
      ]),
      lockfileDependencies: "{}",
    };
    const buildMovePackage = vi.fn()
      .mockResolvedValue({
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [3, 2, 1],
      });

    await compileForDeployment(
      createRequest({ target: createPackageReferenceBundle("local", { worldPackageId: targetWorldPackageId, originalWorldPackageId: targetWorldPackageId }) }),
      {
        initMoveCompiler: vi.fn(() => Promise.resolve()),
        resolveDependencies: vi.fn(() => Promise.resolve(resolvedDependencies)),
        buildMovePackage,
        getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
        verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
        now: () => 42,
      },
    );

    const mainBuildInput = buildMovePackage.mock.calls[0]?.[0] as { readonly files?: Record<string, string> };
    const worldMoveToml = mainBuildInput.files?.["deps/world/Move.toml"] ?? "";
    expect(worldMoveToml).toContain(`published-at = "${targetWorldPackageId}"`);
    expect(worldMoveToml).toContain(`world = "${targetWorldPackageId}"`);
    expect(buildMovePackage).toHaveBeenCalledTimes(2);
  });

  it("links upgraded world packages through the original package id during deploy-grade compilation", async () => {
    const currentWorldPackageId = "0x07e6b810c2dff6df56ea7fbad9ff32f4d84cbee53e496267515887b712924bd1";
    const originalWorldPackageId = "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75";
    const resolvedDependencies: ResolvedDependencies = {
      files: "{}",
      dependencies: JSON.stringify([
        createResolvedDependencyPackageSnapshot({
          name: "world",
          files: {
            "dependencies/world/sources/example.move": "module world::example {}",
          },
        }),
        createResolvedDependencyPackageSnapshot({ name: "Sui" }),
        createResolvedDependencyPackageSnapshot({ name: "MoveStdlib" }),
      ]),
      lockfileDependencies: "{}",
    };
    const buildMovePackage = vi.fn()
      .mockResolvedValue({
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [3, 2, 1],
      });

    await compileForDeployment(
      createRequest({
        target: createPackageReferenceBundle("testnet:utopia", {
          worldPackageId: currentWorldPackageId,
          originalWorldPackageId,
        }),
      }),
      {
        initMoveCompiler: vi.fn(() => Promise.resolve()),
        resolveDependencies: vi.fn(() => Promise.resolve(resolvedDependencies)),
        buildMovePackage,
        getSuiMoveVersion: vi.fn(() => Promise.resolve("1.68.0")),
        verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
        now: () => 42,
      },
    );

    const mainBuildInput = buildMovePackage.mock.calls[0]?.[0] as { readonly files?: Record<string, string> };
    const rootMoveToml = mainBuildInput.files?.["Move.toml"] ?? "";
    const worldMoveToml = mainBuildInput.files?.["deps/world/Move.toml"] ?? "";
    expect(rootMoveToml).toContain(`world = "${originalWorldPackageId}"`);
    expect(worldMoveToml).toContain(`published-at = "${originalWorldPackageId}"`);
    expect(worldMoveToml).toContain(`world = "${originalWorldPackageId}"`);
  });

  it("fails fast when bundled dependency payloads are not parseable", async () => {
    await expect(compileForDeployment(createRequest(), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies: vi.fn(() => Promise.resolve({
        files: "{}",
        dependencies: "not-json",
        lockfileDependencies: "{}",
      })),
      buildMovePackage: vi.fn(),
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
    })).rejects.toMatchObject({
      name: "DependencyResolutionError",
      code: "bundled-snapshot-invalid",
    });
  });
});