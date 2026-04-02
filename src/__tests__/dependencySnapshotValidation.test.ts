import { describe, expect, it } from "vitest";

import type { ResolvedDependencyPackageSnapshot } from "../compiler/types";
import {
  canonicalizeResolvedDependencies,
  createSnapshotValidationResult,
  normalizeDependencyPackageName,
  parseBundledDependencySnapshot,
  parseResolvedDependencyPackages,
} from "../deployment/dependencySnapshotValidation";
import {
  createBundledDependencySnapshotFixture,
  createResolvedDependenciesFixture,
  createResolvedDependencyPackageSnapshot,
} from "./compiler/helpers";

describe("dependencySnapshotValidation", () => {
  it("accepts bundled snapshots that include MoveStdlib, Sui, and World payloads", () => {
    const validation = createSnapshotValidationResult(createResolvedDependenciesFixture());

    expect(validation).toEqual({
      isValid: true,
      missingPackages: [],
      emptyPackageNames: [],
      fallbackAllowed: true,
      message: "Bundled dependency snapshot includes the required package payloads.",
    });
  });

  it("rejects bundled snapshots when a required package is missing", () => {
    const validation = createSnapshotValidationResult(createResolvedDependenciesFixture([
      createResolvedDependencyPackageSnapshot({ name: "MoveStdlib" }),
      createResolvedDependencyPackageSnapshot({ name: "World" }),
    ]));

    expect(validation.isValid).toBe(false);
    expect(validation.missingPackages).toEqual(["Sui"]);
    expect(validation.message).toContain("missing package payloads for Sui");
  });

  it("rejects bundled snapshots when a required package has no files", () => {
    const packages: ResolvedDependencyPackageSnapshot[] = [
      createResolvedDependencyPackageSnapshot({ name: "MoveStdlib" }),
      createResolvedDependencyPackageSnapshot({ name: "Sui" }),
      createResolvedDependencyPackageSnapshot({ name: "World", files: {} }),
    ];

    const validation = createSnapshotValidationResult(createResolvedDependenciesFixture(packages));

    expect(validation.isValid).toBe(false);
    expect(validation.emptyPackageNames).toEqual(["World"]);
    expect(validation.message).toContain("empty file payloads for World");
  });

  it("treats package names case-insensitively when validating required packages", () => {
    const validation = createSnapshotValidationResult(createResolvedDependenciesFixture([
      createResolvedDependencyPackageSnapshot({ name: "movestdlib" }),
      createResolvedDependencyPackageSnapshot({ name: "sUi" }),
      createResolvedDependencyPackageSnapshot({ name: "WORLD" }),
    ]));

    expect(validation.isValid).toBe(true);
  });

  it("parses bundled dependency snapshots with the expected shape", () => {
    const snapshot = createBundledDependencySnapshotFixture();

    expect(parseBundledDependencySnapshot(snapshot)).toEqual(snapshot);
  });

  it("returns null when resolved dependency packages cannot be parsed", () => {
    expect(parseResolvedDependencyPackages({
      files: "{}",
      dependencies: "not-json",
      lockfileDependencies: "{}",
    })).toBeNull();
  });

  it("canonicalizes dependency package ordering and file ordering for deterministic snapshots", () => {
    const canonical = canonicalizeResolvedDependencies(createResolvedDependenciesFixture([
      createResolvedDependencyPackageSnapshot({
        name: "World",
        files: {
          "dependencies/World/sources/z.move": "module world::z {}",
          "dependencies/World/Move.toml": "[package]\nname = \"World\"\n",
        },
      }),
      createResolvedDependencyPackageSnapshot({ name: "MoveStdlib" }),
      createResolvedDependencyPackageSnapshot({ name: "Sui" }),
    ]));

    const packages = parseResolvedDependencyPackages(canonical);
    expect(packages?.map((entry) => entry.name)).toEqual(["MoveStdlib", "Sui", "World"]);
    expect(Object.keys(packages?.[2]?.files ?? {})).toEqual([
      "dependencies/World/Move.toml",
      "dependencies/World/sources/z.move",
    ]);
  });

  it("normalizes package names for stable lookup", () => {
    expect(normalizeDependencyPackageName("Move-Stdlib")).toBe("movestdlib");
    expect(normalizeDependencyPackageName("World")).toBe("world");
  });
});