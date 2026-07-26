/**
 * Typed comparison helpers that produce target- and field-level drift
 * diagnostics without applying metadata to an active bundle.
 *
 * Used by the runtime observation layer and the repository integrity command
 * to compare checked-in bundles against upstream manifest data.
 */

import type { PackageReferenceBundle } from "../compiler/types";
import type { PublishedTargetMetadata } from "./publishedManifestParser";

export type MaintainedTargetId = "testnet:stillness" | "testnet:utopia";

/**
 * A single field-level drift between a checked-in bundle and an observed value.
 */
export interface FieldDrift {
  readonly field: string;
  readonly expected: string;
  readonly actual: string;
}

/**
 * Drift diagnostic for a single maintained target.
 */
export interface TargetDriftDiagnostic {
  readonly targetId: MaintainedTargetId;
  /** True when all compared fields match (no drift). */
  readonly isMatch: boolean;
  /** Individual drifted fields, empty when isMatch is true. */
  readonly driftedFields: readonly FieldDrift[];
}

/**
 * Result of comparing checked-in bundles against observed manifest metadata.
 */
export interface DriftComparisonResult {
  readonly targetDiagnostics: readonly TargetDriftDiagnostic[];
  /** True when every maintained target has no drift. */
  readonly allMatch: boolean;
}

type BundleLookup = (targetId: MaintainedTargetId) => PackageReferenceBundle | undefined;

/**
 * Fields to compare between a checked-in bundle and observed manifest metadata.
 */
type ComparableField = {
  readonly field: string;
  readonly bundleKey: "worldPackageId" | "originalWorldPackageId" | "toolchainVersion";
  readonly manifestKey: "worldPackageId" | "originalWorldPackageId" | "toolchainVersion";
};

const COMPARABLE_FIELDS: readonly ComparableField[] = [
  { field: "published-at", bundleKey: "worldPackageId", manifestKey: "worldPackageId" },
  { field: "original-id", bundleKey: "originalWorldPackageId", manifestKey: "originalWorldPackageId" },
  { field: "toolchain-version", bundleKey: "toolchainVersion", manifestKey: "toolchainVersion" },
];

function compareTarget(
  targetId: MaintainedTargetId,
  bundle: PackageReferenceBundle,
  manifestMetadata: PublishedTargetMetadata,
): TargetDriftDiagnostic {
  const driftedFields: FieldDrift[] = [];

  for (const comparable of COMPARABLE_FIELDS) {
    const bundleValue = bundle[comparable.bundleKey];
    const manifestValue = manifestMetadata[comparable.manifestKey];

    if (bundleValue !== manifestValue) {
      driftedFields.push({
        field: comparable.field,
        expected: bundleValue,
        actual: manifestValue,
      });
    }
  }

  return {
    targetId,
    isMatch: driftedFields.length === 0,
    driftedFields,
  };
}

/**
 * Compare a set of checked-in bundles against observed manifest metadata.
 *
 * For each maintained target present in both the bundle lookup and the manifest
 * metadata, produces a diagnostic identifying which fields (if any) have drifted.
 *
 * Does NOT modify or apply any metadata to bundles.
 */
export function compareBundlesToManifest(
  bundles: BundleLookup,
  manifestTargets: ReadonlyMap<MaintainedTargetId, PublishedTargetMetadata>,
): DriftComparisonResult {
  const targetIds: readonly MaintainedTargetId[] = ["testnet:stillness", "testnet:utopia"];
  const diagnostics: TargetDriftDiagnostic[] = [];

  for (const targetId of targetIds) {
    const bundle = bundles(targetId);
    const manifestMetadata = manifestTargets.get(targetId);

    if (bundle === undefined || manifestMetadata === undefined) {
      // Cannot compare — skip (caller decides how to handle missing data).
      continue;
    }

    diagnostics.push(compareTarget(targetId, bundle, manifestMetadata));
  }

  return {
    targetDiagnostics: diagnostics,
    allMatch: diagnostics.every((d) => d.isMatch),
  };
}

/**
 * Format a drift diagnostic as a human-readable string for logging or UI display.
 */
export function formatDriftDiagnostic(diagnostic: TargetDriftDiagnostic): string {
  if (diagnostic.isMatch) {
    return `✓ ${diagnostic.targetId}: all checked fields match`;
  }

  const fieldDescriptions = diagnostic.driftedFields.map(
    (drift) => `  - ${drift.field}: expected "${drift.expected}", found "${drift.actual}"`,
  );

  return [
    `✗ ${diagnostic.targetId}: ${String(diagnostic.driftedFields.length)} drifted field(s)`,
    ...fieldDescriptions,
  ].join("\n");
}
