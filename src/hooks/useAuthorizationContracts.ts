import { bcs } from "@mysten/sui/bcs";
import { normalizeStructTag, normalizeSuiAddress, toBase64 } from "@mysten/sui/utils";
import { useEffect, useMemo, useState } from "react";

import type { StoredDeploymentState } from "../types/authorization";
import { getSuiTargetClient } from "../utils/suiTargetClient";

const MAX_OWNED_OBJECT_PAGES = 20;
const UNKNOWN_DEPLOYED_AT = new Date(0).toISOString();
const UPGRADE_CAP_TYPE = normalizeStructTag("0x2::package::UpgradeCap");
const UpgradeCap = bcs.struct("UpgradeCap", { id: bcs.Address, package: bcs.Address, version: bcs.U64, policy: bcs.U8 });

export interface AuthorizationContractDiscoveryClient {
  readonly listOwnedObjects: (input: {
    readonly owner: string;
    readonly cursor: string | null;
    readonly type: string;
    readonly limit: number;
    readonly include: { readonly content: true };
    readonly signal: AbortSignal;
  }) => Promise<unknown>;
  readonly getPackage: (input: { readonly packageId: string }, options: { readonly abort: AbortSignal; readonly timeout: number }) => { readonly response: Promise<unknown> };
}

interface LoadAuthorizationContractsInput {
  readonly fallbackDeploymentState: StoredDeploymentState | null;
  readonly suiClient?: AuthorizationContractDiscoveryClient;
  readonly targetId: StoredDeploymentState["targetId"] | null;
  readonly walletAddress: string | null;
  readonly signal?: AbortSignal;
}

interface UseAuthorizationContractsResult {
  readonly contracts: readonly StoredDeploymentState[];
  readonly errorMessage: string | null;
  readonly isLoading: boolean;
}

interface AuthorizationContractDiscoveryState {
  readonly contracts: readonly StoredDeploymentState[];
  readonly errorMessage: string | null;
  readonly requestKey: string | null;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Malformed authorization discovery response.");
  return value as Record<string, unknown>;
}

function requiredAddress(value: unknown): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(value)) throw new Error("Missing or invalid object identity in authorization discovery.");
  return normalizeSuiAddress(value);
}

function createDiscoveryClient(targetId: StoredDeploymentState["targetId"], signal: AbortSignal): AuthorizationContractDiscoveryClient {
  const client = getSuiTargetClient(targetId, { timeout: 8_000, abort: signal });
  return {
    listOwnedObjects: client.listOwnedObjects.bind(client),
    getPackage: client.movePackageService.getPackage.bind(client.movePackageService),
  };
}

/** Discover authorization-capable package/module pairs from authoritative wallet-owned UpgradeCaps. */
export async function loadAuthorizationContractsFromUpgradeCaps(input: LoadAuthorizationContractsInput): Promise<readonly StoredDeploymentState[]> {
  const { targetId, walletAddress } = input;
  if (targetId === null || targetId === "local" || walletAddress === null) return mergeAuthorizationContracts([], input.fallbackDeploymentState);
  const deadline = AbortSignal.timeout(15_000);
  const signal = input.signal ? AbortSignal.any([input.signal, deadline]) : deadline;
  signal.throwIfAborted();
  const client = input.suiClient ?? createDiscoveryClient(targetId, signal);
  const packageIds = await loadUpgradeCapPackageIds(client, walletAddress, signal);
  const discovered: StoredDeploymentState[] = [];
  // Avoid unbounded fan-out of package reads; all pages/packages share one operation deadline.
  for (const packageId of packageIds) {
    signal.throwIfAborted();
    const response = await client.getPackage({ packageId }, { abort: signal, timeout: 8_000 }).response;
    signal.throwIfAborted();
    const moduleName = resolveAuthorizationModuleName(response, packageId);
    if (moduleName === null) continue;
    const fallback = input.fallbackDeploymentState;
    const matchesFallback = matchesFallbackContract(fallback, packageId, moduleName);
    discovered.push(matchesFallback ? fallback : {
      version: 1, packageId, moduleName, targetId,
      transactionDigest: packageId,
      deployedAt: UNKNOWN_DEPLOYED_AT,
      contractName: humanizeModuleName(moduleName),
    });
  }
  return mergeAuthorizationContracts(discovered, input.fallbackDeploymentState);
}

function matchesFallbackContract(fallback: StoredDeploymentState | null, packageId: string, moduleName: string): fallback is StoredDeploymentState {
  return fallback !== null && requiredAddress(fallback.packageId) === packageId && fallback.moduleName === moduleName;
}

/** Select contracts for the current owner/target; never present earlier discovery as current. */
export function useAuthorizationContracts(input: LoadAuthorizationContractsInput): UseAuthorizationContractsResult {
  const fallbackContracts = useMemo(() => mergeAuthorizationContracts([], input.fallbackDeploymentState), [input.fallbackDeploymentState]);
  const requestKey = input.targetId === null || input.targetId === "local" || input.walletAddress === null
    ? null : `${input.targetId}:${input.walletAddress}`;
  const [state, setState] = useState<AuthorizationContractDiscoveryState>({ contracts: fallbackContracts, errorMessage: null, requestKey: null });
  useEffect(() => {
    const controller = new AbortController();
    if (requestKey === null) return () => { controller.abort(); };
    void loadAuthorizationContractsFromUpgradeCaps({
      fallbackDeploymentState: input.fallbackDeploymentState,
      suiClient: input.suiClient,
      targetId: input.targetId,
      walletAddress: input.walletAddress,
      signal: controller.signal,
    }).then((contracts) => {
      if (!controller.signal.aborted) setState({ contracts, errorMessage: null, requestKey });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({
        contracts: fallbackContracts,
        errorMessage: error instanceof Error ? error.message : "Could not load contracts from wallet UpgradeCaps.",
        requestKey,
      });
    });
    return () => { controller.abort(); };
  }, [fallbackContracts, input.fallbackDeploymentState, input.suiClient, input.targetId, input.walletAddress, requestKey]);
  if (requestKey === null) return { contracts: fallbackContracts, errorMessage: null, isLoading: false };
  if (state.requestKey !== requestKey) return { contracts: fallbackContracts, errorMessage: null, isLoading: true };
  return { contracts: state.contracts, errorMessage: state.errorMessage, isLoading: false };
}

async function loadUpgradeCapPackageIds(client: AuthorizationContractDiscoveryClient, owner: string, signal: AbortSignal): Promise<readonly string[]> {
  const packages = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < MAX_OWNED_OBJECT_PAGES; pageIndex += 1) {
    signal.throwIfAborted();
    const response = record(await client.listOwnedObjects({ owner, cursor, type: UPGRADE_CAP_TYPE, limit: 50, include: { content: true }, signal }));
    signal.throwIfAborted();
    if (!Array.isArray(response.objects) || typeof response.hasNextPage !== "boolean") throw new Error("Malformed owned-object page.");
    for (const entry of response.objects) packages.add(extractUpgradeCapPackageId(entry, owner));
    if (!response.hasNextPage) return [...packages].sort();
    if (typeof response.cursor !== "string" || response.cursor.length === 0 || seenCursors.has(response.cursor)) {
      throw new Error("Authorization discovery returned missing or repeated pagination cursor.");
    }
    seenCursors.add(response.cursor);
    cursor = response.cursor;
  }
  throw new Error("Authorization discovery exceeded its bounded page limit; no partial discovery was accepted.");
}

function extractUpgradeCapPackageId(entry: unknown, owner: string): string {
  const object = record(entry);
  if (typeof object.type !== "string" || normalizeStructTag(object.type) !== UPGRADE_CAP_TYPE) throw new Error("Unexpected UpgradeCap object type.");
  const ownership = record(object.owner);
  if (ownership.$kind !== "AddressOwner" || requiredAddress(ownership.AddressOwner) !== requiredAddress(owner)) throw new Error("UpgradeCap is not owned by the connected account.");
  if (!(object.content instanceof Uint8Array) || object.content.length !== 73) throw new Error("Missing or malformed UpgradeCap BCS content.");
  const cap = UpgradeCap.parse(object.content);
  if (requiredAddress(cap.id) !== requiredAddress(object.objectId) || toBase64(UpgradeCap.serialize(cap).toBytes()) !== toBase64(object.content)) {
    throw new Error("UpgradeCap content does not match its authoritative object identity.");
  }
  return requiredAddress(cap.package);
}

function resolveAuthorizationModuleName(response: unknown, packageId: string): string | null {
  const pkg = record(record(response).package);
  if (requiredAddress(pkg.storageId) !== packageId || !Array.isArray(pkg.modules)) throw new Error("Missing or mismatched package descriptor.");
  const modules = pkg.modules.map((module: unknown) => record(module));
  for (const module of modules) hasAuthorizationWitness(module);
  modules.sort((left, right) => (left.name as string).localeCompare(right.name as string));
  const witnessModules = modules.filter(hasAuthorizationWitness);
  const exact = witnessModules.find((module) => Array.isArray(module.functions)
    && module.functions.some((fn: unknown) => record(fn).name === "get_target_priority_list"));
  // Preserve the existing deterministic witness-only fallback for older extension packages.
  const name = (exact ?? witnessModules.at(0))?.name;
  return typeof name === "string" ? name : null;
}

function hasAuthorizationWitness(module: Record<string, unknown>): boolean {
  if (typeof module.name !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(module.name)
    || !Array.isArray(module.datatypes) || !Array.isArray(module.functions)) throw new Error("Malformed Move module descriptor.");
  return module.datatypes.some((value: unknown) => {
    const datatype = record(value);
    return datatype.name === "TurretAuth" && datatype.module === module.name;
  });
}

function humanizeModuleName(moduleName: string): string {
  return moduleName.split(/[_\-\s]+/).filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ");
}

function getAuthorizationContractKey(contract: Pick<StoredDeploymentState, "moduleName" | "packageId" | "targetId">): string {
  return `${contract.targetId}:${contract.packageId}:${contract.moduleName}`;
}

function mergeAuthorizationContracts(discovered: readonly StoredDeploymentState[], fallback: StoredDeploymentState | null): readonly StoredDeploymentState[] {
  const merged = new Map<string, StoredDeploymentState>();
  if (fallback !== null) merged.set(getAuthorizationContractKey(fallback), fallback);
  for (const contract of discovered) {
    const key = getAuthorizationContractKey(contract);
    if (!merged.has(key)) merged.set(key, contract);
  }
  return [...merged.values()].sort((left, right) => {
    if (fallback !== null) {
      const key = getAuthorizationContractKey(fallback);
      if (getAuthorizationContractKey(left) === key) return -1;
      if (getAuthorizationContractKey(right) === key) return 1;
    }
    return left.contractName.localeCompare(right.contractName) || left.moduleName.localeCompare(right.moduleName) || left.packageId.localeCompare(right.packageId);
  });
}
