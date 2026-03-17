import type { FlowEdge, FlowNode } from "../types/nodes";

export const CONTRACT_LIBRARY_STORAGE_KEY = "frontier-flow:contracts";

export interface NamedFlowContract {
  readonly name: string;
  readonly nodes: FlowNode[];
  readonly edges: FlowEdge[];
  readonly updatedAt: string;
}

export interface ContractLibrary {
  readonly version: 1;
  readonly activeContractName: string;
  readonly contracts: NamedFlowContract[];
}

/**
 * Normalizes a user-supplied contract name into a compact storage-safe label.
 */
export function sanitizeContractName(name: string): string {
  const trimmedName = name.trim().replace(/\s+/g, " ");
  return trimmedName.length > 0 ? trimmedName.slice(0, 48) : "Untitled Contract";
}

/**
 * Creates a storable named contract snapshot from the current flow state.
 */
export function createNamedFlowContract(
  name: string,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
): NamedFlowContract {
  return {
    name: sanitizeContractName(name),
    nodes: [...nodes],
    edges: [...edges],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns a unique contract name derived from the requested base label.
 */
export function createUniqueContractName(baseName: string, existingNames: readonly string[]): string {
  const normalizedBaseName = sanitizeContractName(baseName);
  if (!existingNames.includes(normalizedBaseName)) {
    return normalizedBaseName;
  }

  let suffix = 2;
  while (existingNames.includes(`${normalizedBaseName} (${String(suffix)})`)) {
    suffix += 1;
  }

  return `${normalizedBaseName} (${String(suffix)})`;
}

/**
 * Loads the saved contract library from local storage, or falls back to the provided starter contract.
 */
export function loadContractLibrary(storage: Storage | undefined, fallbackContract: NamedFlowContract): ContractLibrary {
  const rawValue = storage?.getItem(CONTRACT_LIBRARY_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return createFallbackLibrary(fallbackContract);
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return parseContractLibrary(parsedValue, fallbackContract);
  } catch {
    return createFallbackLibrary(fallbackContract);
  }
}

/**
 * Persists the full contract library to local storage.
 */
export function saveContractLibrary(storage: Storage | undefined, library: ContractLibrary): void {
  storage?.setItem(CONTRACT_LIBRARY_STORAGE_KEY, JSON.stringify(library));
}

function createFallbackLibrary(fallbackContract: NamedFlowContract): ContractLibrary {
  return {
    version: 1,
    activeContractName: fallbackContract.name,
    contracts: [fallbackContract],
  };
}

function parseContractLibrary(parsedValue: unknown, fallbackContract: NamedFlowContract): ContractLibrary {
  if (!isRecord(parsedValue)) {
    return createFallbackLibrary(fallbackContract);
  }

  const rawContracts = Array.isArray(parsedValue.contracts) ? parsedValue.contracts : [];
  const contracts = rawContracts.flatMap((rawContract) => {
    const parsedContract = parseNamedFlowContract(rawContract);
    return parsedContract === undefined ? [] : [parsedContract];
  });

  if (contracts.length === 0) {
    return createFallbackLibrary(fallbackContract);
  }

  const activeContractName =
    typeof parsedValue.activeContractName === "string" && contracts.some((contract) => contract.name === parsedValue.activeContractName)
      ? parsedValue.activeContractName
      : contracts[0].name;

  return {
    version: 1,
    activeContractName,
    contracts,
  };
}

function parseNamedFlowContract(rawContract: unknown): NamedFlowContract | undefined {
  if (!isRecord(rawContract)) {
    return undefined;
  }

  if (typeof rawContract.name !== "string" || !Array.isArray(rawContract.nodes) || !Array.isArray(rawContract.edges)) {
    return undefined;
  }

  return {
    name: sanitizeContractName(rawContract.name),
    nodes: rawContract.nodes as FlowNode[],
    edges: rawContract.edges as FlowEdge[],
    updatedAt: typeof rawContract.updatedAt === "string" ? rawContract.updatedAt : new Date(0).toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}