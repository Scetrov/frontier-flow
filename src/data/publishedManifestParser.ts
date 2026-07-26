/**
 * Strict, fail-closed parser for maintained Published.toml target sections.
 *
 * Extracts the required [published.testnet_stillness] and [published.testnet_utopia]
 * sections, validates identity fields, detects duplicate keys, and classifies each
 * target as a lineage replacement or upgrade.
 */

export type MaintainedTargetId = "testnet:stillness" | "testnet:utopia";

export const MAINTAINED_TARGET_IDS: readonly MaintainedTargetId[] = [
  "testnet:stillness",
  "testnet:utopia",
];

/**
 * Maps Published.toml section names (e.g. "testnet_stillness") to target IDs.
 */
const SECTION_NAME_TO_TARGET_ID: ReadonlyMap<string, MaintainedTargetId> = new Map([
  ["testnet_stillness", "testnet:stillness"],
  ["testnet_utopia", "testnet:utopia"],
]);

export type LineageClassification = "replacement" | "upgrade";

/**
 * Complete, validated metadata for a single maintained target section.
 */
export interface PublishedTargetMetadata {
  readonly targetId: MaintainedTargetId;
  /** The `published-at` value — the deployed package ID. */
  readonly worldPackageId: string;
  /** The `original-id` value — the lineage root package ID. */
  readonly originalWorldPackageId: string;
  /** The `toolchain-version` value. */
  readonly toolchainVersion: string;
  /**
   * "replacement" when published-at equals original-id (new lineage).
   * "upgrade" when published-at differs from original-id (same lineage, new version).
   */
  readonly lineage: LineageClassification;
}

/**
 * A single structured parse error.
 */
export interface ManifestParseError {
  /** Target id the error relates to, or "*" for whole-manifest issues. */
  readonly target: string;
  /** Specific field if applicable (e.g. "published-at"). */
  readonly field?: string;
  /** Human-readable error description. */
  readonly message: string;
}

export type ManifestParseResult =
  | { readonly ok: true; readonly targets: ReadonlyMap<MaintainedTargetId, PublishedTargetMetadata> }
  | { readonly ok: false; readonly errors: readonly ManifestParseError[] };

const HEX_ID_PATTERN = /^0x[0-9a-f]+$/i;

function isValidHexId(value: string): boolean {
  // Must be 0x followed by at least one hex digit (standard Sui address/object id).
  return HEX_ID_PATTERN.test(value) && value.length > 2;
}

/**
 * Raw key-value pairs extracted from a single TOML section.
 */
interface RawSection {
  readonly sectionName: string;
  readonly entries: ReadonlyMap<string, string>;
  readonly duplicateKeys: readonly string[];
}

/**
 * Extract [published.<section>] sections from manifest content.
 * Detects duplicate keys within each section.
 */
function extractPublishedSections(manifest: string): RawSection[] {
  const sections: RawSection[] = [];
  const sectionPattern = /\[published\.([\w]+)\]/g;

  const sectionStarts: Array<{ name: string; index: number; headerEnd: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = sectionPattern.exec(manifest)) !== null) {
    sectionStarts.push({
      name: match[1],
      index: match.index,
      headerEnd: match.index + match[0].length,
    });
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const section = sectionStarts[i];
    if (!SECTION_NAME_TO_TARGET_ID.has(section.name)) {
      continue;
    }

    const contentEnd = i + 1 < sectionStarts.length
      ? sectionStarts[i + 1].index
      : manifest.length;
    const content = manifest.slice(section.headerEnd, contentEnd);

    const entries = new Map<string, string>();
    const duplicateKeys: string[] = [];
    const fieldPattern = /^\s*([\w-]+)\s*=\s*"([^"]*)"/gm;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldPattern.exec(content)) !== null) {
      const key = fieldMatch[1];
      if (entries.has(key)) {
        duplicateKeys.push(key);
      } else {
        entries.set(key, fieldMatch[2]);
      }
    }

    sections.push({ sectionName: section.name, entries, duplicateKeys });
  }

  return sections;
}

function validateRequiredField(
  targetId: MaintainedTargetId,
  section: RawSection,
  field: "published-at" | "original-id" | "toolchain-version",
  requiresPackageId: boolean,
): ManifestParseError | undefined {
  const value = section.entries.get(field);
  if (value === undefined || value.length === 0) {
    return { target: targetId, field, message: `Missing required field "${field}" in section [published.${section.sectionName}]` };
  }
  if (requiresPackageId && !isValidHexId(value)) {
    return { target: targetId, field, message: `Malformed package ID "${value}" in "${field}"` };
  }
  return undefined;
}

/** Parse and validate a single target section without accepting partial metadata. */
function parseTargetSection(
  targetId: MaintainedTargetId,
  section: RawSection,
): { metadata: PublishedTargetMetadata | null; errors: ManifestParseError[] } {
  const duplicateErrors = section.duplicateKeys.map((field) => ({
    target: targetId,
    field,
    message: `Duplicate key "${field}" in section [published.${section.sectionName}]`,
  }));
  if (duplicateErrors.length > 0) return { metadata: null, errors: duplicateErrors };

  const errors = [
    validateRequiredField(targetId, section, "published-at", true),
    validateRequiredField(targetId, section, "original-id", true),
    validateRequiredField(targetId, section, "toolchain-version", false),
  ].filter((error): error is ManifestParseError => error !== undefined);
  if (errors.length > 0) return { metadata: null, errors };

  const worldPackageId = section.entries.get("published-at") as string;
  const originalWorldPackageId = section.entries.get("original-id") as string;
  return {
    metadata: {
      targetId,
      worldPackageId,
      originalWorldPackageId,
      toolchainVersion: section.entries.get("toolchain-version") as string,
      lineage: worldPackageId === originalWorldPackageId ? "replacement" : "upgrade",
    },
    errors: [],
  };
}

/**
 * Parse a Published.toml manifest and validate all maintained target sections.
 *
 * Fails closed: returns an error result when any section is missing, has duplicate
 * required keys, contains malformed IDs, or is missing required identity fields.
 */
export function parsePublishedManifestStrict(manifest: string): ManifestParseResult {
  const sections = extractPublishedSections(manifest);
  const errors: ManifestParseError[] = [];
  const targets = new Map<MaintainedTargetId, PublishedTargetMetadata>();

  // Check for missing sections
  const foundSectionNames = new Set(sections.map((s) => s.sectionName));
  for (const targetId of MAINTAINED_TARGET_IDS) {
    const expectedSectionName = targetId === "testnet:stillness" ? "testnet_stillness" : "testnet_utopia";
    if (!foundSectionNames.has(expectedSectionName)) {
      errors.push({
        target: targetId,
        message: `Missing required section [published.${expectedSectionName}]`,
      });
    }
  }

  // Parse each found section
  for (const section of sections) {
    const targetId = SECTION_NAME_TO_TARGET_ID.get(section.sectionName);
    if (targetId === undefined) {
      continue;
    }

    const result = parseTargetSection(targetId, section);
    if (result.metadata !== null) {
      targets.set(targetId, result.metadata);
    }
    errors.push(...result.errors);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Final check: all maintained targets must be present
  for (const targetId of MAINTAINED_TARGET_IDS) {
    if (!targets.has(targetId)) {
      return {
        ok: false,
        errors: [
          {
            target: targetId,
            message: `Maintained target "${targetId}" not found in manifest`,
          },
        ],
      };
    }
  }

  return { ok: true, targets };
}
