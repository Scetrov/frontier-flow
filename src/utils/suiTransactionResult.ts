import { normalizeSuiAddress } from "@mysten/sui/utils";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Missing required gRPC transaction evidence.");
  return value as Record<string, unknown>;
}

/** Validate native evidence as well as SDK normalization; a digest alone is never success. */
export function readSuccessfulSuiTransaction(response: unknown, expectedDigest?: string): {
  readonly digest: string;
  readonly transaction: Record<string, unknown>;
} {
  const result = record(response);
  const proto = record(result.protoJson);
  const nativeStatus = record(record(proto.effects).status);
  assertExecutionSucceeded(result.$kind, nativeStatus);
  const transaction = record(result.Transaction);
  assertNormalizedSuccess(result.$kind, nativeStatus.success, record(transaction.status).success);
  const digest = requireMatchingDigest(transaction.digest, proto.digest, expectedDigest);
  return { digest, transaction };
}

function assertExecutionSucceeded(kind: unknown, nativeStatus: Record<string, unknown>): void {
  if (kind !== "FailedTransaction" && nativeStatus.success !== false) return;
  const description = nativeStatus.error === undefined ? undefined : record(nativeStatus.error).description;
  throw new Error(`Sui transaction execution failed.${typeof description === "string" ? ` ${description}` : ""}`);
}

function assertNormalizedSuccess(kind: unknown, nativeSuccess: unknown, normalizedSuccess: unknown): void {
  if (kind === "Transaction" && nativeSuccess === true && normalizedSuccess === true) return;
  throw new Error("Missing explicit successful gRPC transaction effects.");
}

function requireMatchingDigest(transactionDigest: unknown, protoDigest: unknown, expectedDigest?: string): string {
  if (typeof transactionDigest !== "string" || transactionDigest.length === 0 || protoDigest !== transactionDigest
    || (expectedDigest !== undefined && expectedDigest !== transactionDigest)) {
    throw new Error("Missing or mismatched gRPC transaction digest.");
  }
  return transactionDigest;
}

export function extractPublishedPackageId(transaction: Record<string, unknown>): string {
  const effects = record(transaction.effects);
  if (!Array.isArray(effects.changedObjects)) throw new Error("Missing publication object effects.");
  const packages = effects.changedObjects.map((value: unknown) => record(value))
    .filter((object) => object.outputState === "PackageWrite" && object.idOperation === "Created");
  if (packages.length !== 1) throw new Error("Publication effects did not identify exactly one created package.");
  const packageId = packages[0].objectId;
  if (typeof packageId !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(packageId)) throw new Error("Invalid published package identity.");
  return normalizeSuiAddress(packageId);
}
