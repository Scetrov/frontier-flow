import { describe, expect, it } from "vitest";

import {
  compareBundlesToManifest,
  formatDriftDiagnostic,
  type FieldDrift,
  type TargetDriftDiagnostic,
} from "../data/manifestDriftComparison";
import type { PackageReferenceBundle } from "../compiler/types";
import type { PublishedTargetMetadata } from "../data/publishedManifestParser";

function makeBundle(overrides: Partial<PackageReferenceBundle> = {}): PackageReferenceBundle {
  return {
    targetId: "testnet:stillness",
    environmentLabel: "Stillness",
    worldPackageId: "0xaaa",
    originalWorldPackageId: "0xbbb",
    objectRegistryId: "0xccc",
    serverAddressRegistryId: "0xddd",
    sourceVersionTag: "v0.0.24",
    toolchainVersion: "1.74.0",
    source: "https://docs.evefrontier.com/tools/resources",
    lastVerifiedOn: "2026-04-02",
    ...overrides,
  };
}

function makeManifestMeta(overrides: Partial<PublishedTargetMetadata> = {}): PublishedTargetMetadata {
  return {
    targetId: "testnet:stillness",
    worldPackageId: "0xaaa",
    originalWorldPackageId: "0xbbb",
    toolchainVersion: "1.74.0",
    lineage: "upgrade",
    ...overrides,
  };
}

describe("manifestDriftComparison", () => {
  describe("compareBundlesToManifest", () => {
    it("returns allMatch when all fields are identical", () => {
      const bundle = makeBundle();
      const meta = makeManifestMeta();
      const manifestTargets = new Map<"testnet:stillness" | "testnet:utopia", PublishedTargetMetadata>([
        ["testnet:stillness", meta],
      ]);

      const result = compareBundlesToManifest(
        (targetId) => targetId === "testnet:stillness" ? bundle : undefined,
        manifestTargets,
      );

      expect(result.allMatch).toBe(true);
      expect(result.targetDiagnostics).toHaveLength(1);
      expect(result.targetDiagnostics[0].isMatch).toBe(true);
      expect(result.targetDiagnostics[0].driftedFields).toHaveLength(0);
    });

    it("detects drift in published-at field", () => {
      const bundle = makeBundle({ worldPackageId: "0xaaa" });
      const meta = makeManifestMeta({ worldPackageId: "0xfff" });
      const manifestTargets = new Map<"testnet:stillness" | "testnet:utopia", PublishedTargetMetadata>([
        ["testnet:stillness", meta],
      ]);

      const result = compareBundlesToManifest(
        (targetId) => targetId === "testnet:stillness" ? bundle : undefined,
        manifestTargets,
      );

      expect(result.allMatch).toBe(false);
      const diag = result.targetDiagnostics[0];
      expect(diag.isMatch).toBe(false);
      expect(diag.driftedFields).toHaveLength(1);
      expect(diag.driftedFields[0]).toEqual({
        field: "published-at",
        expected: "0xaaa",
        actual: "0xfff",
      });
    });

    it("detects drift in multiple fields simultaneously", () => {
      const bundle = makeBundle({
        worldPackageId: "0xaaa",
        originalWorldPackageId: "0xbbb",
        toolchainVersion: "1.74.0",
      });
      const meta = makeManifestMeta({
        worldPackageId: "0xfff",
        originalWorldPackageId: "0xeee",
        toolchainVersion: "1.80.0",
      });
      const manifestTargets = new Map<"testnet:stillness" | "testnet:utopia", PublishedTargetMetadata>([
        ["testnet:stillness", meta],
      ]);

      const result = compareBundlesToManifest(
        (targetId) => targetId === "testnet:stillness" ? bundle : undefined,
        manifestTargets,
      );

      expect(result.allMatch).toBe(false);
      expect(result.targetDiagnostics[0].driftedFields).toHaveLength(3);
    });

    it("compares multiple targets", () => {
      const stillnessBundle = makeBundle({ targetId: "testnet:stillness" });
      const utopiaBundle = makeBundle({
        targetId: "testnet:utopia",
        worldPackageId: "0x111",
        originalWorldPackageId: "0x222",
        toolchainVersion: "1.68.0",
      });
      const stillnessMeta = makeManifestMeta();
      const utopiaMeta = makeManifestMeta({
        targetId: "testnet:utopia",
        worldPackageId: "0x111",
        originalWorldPackageId: "0x222",
        toolchainVersion: "1.68.0",
      });

      const manifestTargets = new Map<"testnet:stillness" | "testnet:utopia", PublishedTargetMetadata>([
        ["testnet:stillness", stillnessMeta],
        ["testnet:utopia", utopiaMeta],
      ]);

      const lookup = (targetId: "testnet:stillness" | "testnet:utopia") =>
        (targetId === "testnet:stillness" ? stillnessBundle : utopiaBundle);

      const result = compareBundlesToManifest(lookup, manifestTargets);

      expect(result.allMatch).toBe(true);
      expect(result.targetDiagnostics).toHaveLength(2);
    });

    it("skips targets missing from the bundle lookup", () => {
      const meta = makeManifestMeta();
      const manifestTargets = new Map<"testnet:stillness" | "testnet:utopia", PublishedTargetMetadata>([
        ["testnet:stillness", meta],
      ]);

      // Empty lookup — bundle not found
      const result = compareBundlesToManifest(
        () => undefined,
        manifestTargets,
      );

      expect(result.targetDiagnostics).toHaveLength(0);
      expect(result.allMatch).toBe(true);
    });
  });

  describe("formatDriftDiagnostic", () => {
    it("displays a pass message for matching diagnostics", () => {
      const diag: TargetDriftDiagnostic = {
        targetId: "testnet:stillness",
        isMatch: true,
        driftedFields: [],
      };

      expect(formatDriftDiagnostic(diag)).toContain("✓");
      expect(formatDriftDiagnostic(diag)).toContain("testnet:stillness");
    });

    it("lists drifted fields with expected and actual values", () => {
      const diag: TargetDriftDiagnostic = {
        targetId: "testnet:stillness",
        isMatch: false,
        driftedFields: [
          { field: "published-at", expected: "0xaaa", actual: "0xfff" } satisfies FieldDrift,
          { field: "toolchain-version", expected: "1.74.0", actual: "1.80.0" } satisfies FieldDrift,
        ],
      };

      const output = formatDriftDiagnostic(diag);
      expect(output).toContain("✗");
      expect(output).toContain("testnet:stillness");
      expect(output).toContain("published-at");
      expect(output).toContain("expected \"0xaaa\"");
      expect(output).toContain("found \"0xfff\"");
      expect(output).toContain("toolchain-version");
    });
  });
});
