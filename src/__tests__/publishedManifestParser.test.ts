import { describe, expect, it } from "vitest";

import { parsePublishedManifestStrict } from "../data/publishedManifestParser";

import {
  DUPLICATE_ORIGINAL_ID,
  DUPLICATE_PUBLISHED_AT,
  EMPTY_HEX_ID,
  EMPTY_MANIFEST,
  MALFORMED_ORIGINAL_ID,
  MALFORMED_PUBLISHED_AT,
  MISSING_PUBLISHED_AT,
  MISSING_STILLNESS_SECTION,
  MISSING_TOOLCHAIN_VERSION,
  MISSING_UTOPIA_SECTION,
  VALID_REPLACEMENT_MANIFEST,
  VALID_UPGRADE_MANIFEST,
} from "../data/__fixtures__/publishedManifests";

describe("publishedManifestParser", () => {
  describe("parsePublishedManifestStrict - valid manifests", () => {
    it("parses a valid replacement manifest and classifies Stillness as replacement", () => {
      const result = parsePublishedManifestStrict(VALID_REPLACEMENT_MANIFEST);
      expect(result.ok).toBe(true);
      if (!result.ok) { return; }

      const stillness = result.targets.get("testnet:stillness");
      expect(stillness).toBeDefined();
      expect(stillness?.worldPackageId).toBe(
        "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
      );
      expect(stillness?.originalWorldPackageId).toBe(
        "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1",
      );
      expect(stillness?.toolchainVersion).toBe("1.74.0");
      expect(stillness?.lineage).toBe("replacement");

      const utopia = result.targets.get("testnet:utopia");
      expect(utopia).toBeDefined();
      expect(utopia?.lineage).toBe("upgrade");
    });

    it("parses a valid upgrade manifest and classifies both targets as upgrade", () => {
      const result = parsePublishedManifestStrict(VALID_UPGRADE_MANIFEST);
      expect(result.ok).toBe(true);
      if (!result.ok) { return; }

      const stillness = result.targets.get("testnet:stillness");
      expect(stillness).toBeDefined();
      expect(stillness?.lineage).toBe("upgrade");
      expect(stillness?.worldPackageId).not.toBe(stillness?.originalWorldPackageId);

      const utopia = result.targets.get("testnet:utopia");
      expect(utopia).toBeDefined();
      expect(utopia?.lineage).toBe("upgrade");
    });

    it("preserves the targetId in the metadata", () => {
      const result = parsePublishedManifestStrict(VALID_REPLACEMENT_MANIFEST);
      expect(result.ok).toBe(true);
      if (!result.ok) { return; }

      expect(result.targets.get("testnet:stillness")?.targetId).toBe("testnet:stillness");
      expect(result.targets.get("testnet:utopia")?.targetId).toBe("testnet:utopia");
    });
  });

  describe("parsePublishedManifestStrict - missing sections", () => {
    it("fails when the Stillness section is absent", () => {
      const result = parsePublishedManifestStrict(MISSING_STILLNESS_SECTION);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.target === "testnet:stillness")).toBe(true);
      expect(result.errors.some((e) => e.message.includes("Missing required section"))).toBe(true);
    });

    it("fails when the Utopia section is absent", () => {
      const result = parsePublishedManifestStrict(MISSING_UTOPIA_SECTION);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.target === "testnet:utopia")).toBe(true);
    });

    it("fails when the manifest is empty", () => {
      const result = parsePublishedManifestStrict(EMPTY_MANIFEST);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      // Should report errors for both targets
      expect(result.errors.some((e) => e.target === "testnet:stillness")).toBe(true);
      expect(result.errors.some((e) => e.target === "testnet:utopia")).toBe(true);
    });
  });

  describe("parsePublishedManifestStrict - duplicate keys", () => {
    it("fails when published-at is duplicated", () => {
      const result = parsePublishedManifestStrict(DUPLICATE_PUBLISHED_AT);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.some((e) => e.target === "testnet:stillness" && e.field === "published-at")).toBe(true);
      expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
    });

    it("fails when original-id is duplicated", () => {
      const result = parsePublishedManifestStrict(DUPLICATE_ORIGINAL_ID);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.some((e) => e.target === "testnet:stillness" && e.field === "original-id")).toBe(true);
    });
  });

  describe("parsePublishedManifestStrict - malformed IDs", () => {
    it("fails when published-at is not a valid hex ID", () => {
      const result = parsePublishedManifestStrict(MALFORMED_PUBLISHED_AT);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.some((e) => e.target === "testnet:stillness" && e.field === "published-at")).toBe(true);
      expect(result.errors.some((e) => e.message.includes("Malformed"))).toBe(true);
    });

    it("fails when original-id is not a valid hex ID", () => {
      const result = parsePublishedManifestStrict(MALFORMED_ORIGINAL_ID);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.some((e) => e.target === "testnet:stillness" && e.field === "original-id")).toBe(true);
    });

    it("fails when published-at is an empty hex prefix", () => {
      const result = parsePublishedManifestStrict(EMPTY_HEX_ID);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.some((e) => e.target === "testnet:stillness" && e.field === "published-at")).toBe(true);
    });
  });

  describe("parsePublishedManifestStrict - incomplete identity fields", () => {
    it("fails when toolchain-version is missing", () => {
      const result = parsePublishedManifestStrict(MISSING_TOOLCHAIN_VERSION);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.some((e) => e.target === "testnet:stillness" && e.field === "toolchain-version")).toBe(true);
    });

    it("fails when published-at is missing entirely", () => {
      const result = parsePublishedManifestStrict(MISSING_PUBLISHED_AT);
      expect(result.ok).toBe(false);
      if (result.ok) { return; }

      expect(result.errors.some((e) => e.target === "testnet:utopia" && e.field === "published-at")).toBe(true);
    });
  });

  describe("parsePublishedManifestStrict - ignores unrelated sections", () => {
    it("ignores sections for un-maintained targets", () => {
      const manifest = `[published.other_target]
published-at = "0xabc"
original-id = "0xdef"
toolchain-version = "1.0.0"

${VALID_REPLACEMENT_MANIFEST}`;

      const result = parsePublishedManifestStrict(manifest);
      expect(result.ok).toBe(true);
      if (!result.ok) { return; }

      // Only the two maintained targets should be present
      expect(result.targets.size).toBe(2);
    });
  });
});
