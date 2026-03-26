import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DeployGradeCompileRequest,
  FetchWorldSourceResult,
  ResolvedDependencies,
} from "../../compiler/types";
import { compileForDeployment, resetDeployGradeCompilerStateForTests } from "../../compiler/deployGradeCompiler";
import { createGeneratedArtifactStub, createPackageReferenceBundle } from "../compiler/helpers";

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

describe("deployGradeCompiler", () => {
  beforeEach(() => {
    resetDeployGradeCompilerStateForTests();
  });

  it("derives rootGit from target metadata and rewrites Move.toml for git world dependencies", async () => {
    const resolvedDependencies: ResolvedDependencies = {
      files: "{}",
      dependencies: "{}",
      lockfileDependencies: "{}",
    };
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
    const buildMovePackage = vi.fn((input: {
      readonly resolvedDependencies?: ResolvedDependencies;
    }) => Promise.resolve().then(() => {
      expect(input.resolvedDependencies).toBe(resolvedDependencies);
      return {
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [9, 8, 7],
      };
    }));

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
    expect(buildMovePackage).toHaveBeenCalledTimes(1);
  });

  it("reuses cached resolution snapshots for repeated compilations on the same target and version", async () => {
    const resolvedDependencies: ResolvedDependencies = {
      files: "{}",
      dependencies: "{}",
      lockfileDependencies: "{}",
    };
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
    expect(buildMovePackage).toHaveBeenCalledTimes(2);
  });

  it("ignores cached resolution snapshots when the target or source version does not match", async () => {
    const resolveDependencies = vi.fn(() => Promise.resolve({
      files: "{resolved:true}",
      dependencies: "{}",
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
          dependencies: "{}",
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
        dependencies: "{}",
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
        {
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
        },
      ]),
      lockfileDependencies: "{}",
    };
    const buildMovePackage = vi.fn((input: {
      readonly resolvedDependencies?: ResolvedDependencies;
    }) => Promise.resolve().then(() => {
      const dependencyPackages = JSON.parse(input.resolvedDependencies?.dependencies ?? "[]") as Array<{
        readonly name?: string;
        readonly files?: Record<string, string>;
      }>;
      const worldPackage = dependencyPackages.find((dependencyPackage) => dependencyPackage.name === "world");

      expect(worldPackage?.files).not.toHaveProperty("dependencies/world/tests/primitives/location_tests.move");
      expect(worldPackage?.files?.["dependencies/world/sources/access/access_control.move"]).toContain("let is_character = false;");
      expect(worldPackage?.files?.["dependencies/world/sources/access/access_control.move"]).not.toContain("datatype_string()");

      return {
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [3, 2, 1],
      };
    }));

    await compileForDeployment(createRequest(), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies: vi.fn(() => Promise.resolve(resolvedDependencies)),
      buildMovePackage,
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
      now: () => 42,
    });

    expect(buildMovePackage).toHaveBeenCalledTimes(1);
  });

  it("sanitizes resolved World dependency snapshots even when package names and paths are capitalized", async () => {
    const resolvedDependencies: ResolvedDependencies = {
      files: "{}",
      dependencies: JSON.stringify([
        {
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
        },
      ]),
      lockfileDependencies: "{}",
    };
    const buildMovePackage = vi.fn((input: {
      readonly resolvedDependencies?: ResolvedDependencies;
    }) => Promise.resolve().then(() => {
      const dependencyPackages = JSON.parse(input.resolvedDependencies?.dependencies ?? "[]") as Array<{
        readonly name?: string;
        readonly files?: Record<string, string>;
      }>;
      const worldPackage = dependencyPackages.find((dependencyPackage) => dependencyPackage.name === "World");

      expect(worldPackage?.files).not.toHaveProperty("dependencies/World/tests/assemblies/storage_unit_tests.move");
      expect(worldPackage?.files?.["dependencies/World/sources/access/access_control.move"]).toContain("let is_character = false;");
      expect(worldPackage?.files?.["dependencies/World/sources/access/access_control.move"]).not.toContain("datatype_string()");

      return {
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [3, 2, 1],
      };
    }));

    await compileForDeployment(createRequest(), {
      initMoveCompiler: vi.fn(() => Promise.resolve()),
      resolveDependencies: vi.fn(() => Promise.resolve(resolvedDependencies)),
      buildMovePackage,
      getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
      verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
      now: () => 42,
    });

    expect(buildMovePackage).toHaveBeenCalledTimes(1);
  });

  it("patches the world Published.toml address to match the target worldPackageId before the build step", async () => {
    const targetWorldPackageId = "0xcf6b5da20b0c6540895b79b91580ec0734fcfa4298848f0e8382ef217965bfd5";
    const resolvedDependencies: ResolvedDependencies = {
      files: "{}",
      dependencies: JSON.stringify([
        {
          name: "World",
          files: {
            "dependencies/World/Published.toml": [
              "[published.testnet]",
              'chain-id = "4c78adac"',
              'published-at = "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c"',
              'original-id = "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c"',
              "version = 1",
            ].join("\n"),
          },
        },
      ]),
      lockfileDependencies: "{}",
    };
    const buildMovePackage = vi.fn((input: {
      readonly resolvedDependencies?: ResolvedDependencies;
    }) => Promise.resolve().then(() => {
      const dependencyPackages = JSON.parse(input.resolvedDependencies?.dependencies ?? "[]") as Array<{
        readonly name?: string;
        readonly files?: Record<string, string>;
      }>;
      const worldPackage = dependencyPackages.find((pkg) => pkg.name === "World");
      const publishedToml = worldPackage?.files?.["dependencies/World/Published.toml"] ?? "";

      expect(publishedToml).toContain(`published-at = "${targetWorldPackageId}"`);
      expect(publishedToml).toContain(`original-id = "${targetWorldPackageId}"`);
      expect(publishedToml).not.toContain("0x28b497");

      return {
        modules: [toBase64([1, 2, 3])],
        dependencies: ["0x1", "0x2"],
        digest: [3, 2, 1],
      };
    }));

    await compileForDeployment(
      createRequest({ target: createPackageReferenceBundle("local:evefrontier" as Exclude<import("../../compiler/types").DeploymentTargetId, "local">, { worldPackageId: targetWorldPackageId, originalWorldPackageId: targetWorldPackageId }) }),
      {
        initMoveCompiler: vi.fn(() => Promise.resolve()),
        resolveDependencies: vi.fn(() => Promise.resolve(resolvedDependencies)),
        buildMovePackage,
        getSuiMoveVersion: vi.fn(() => Promise.resolve("1.67.1")),
        verifyMoveCompilerIntegrity: vi.fn(() => Promise.resolve()),
        now: () => 42,
      },
    );

    expect(buildMovePackage).toHaveBeenCalledTimes(1);
  });
});