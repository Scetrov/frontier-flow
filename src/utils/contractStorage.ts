import type { FlowEdge, FlowNode } from "../types/nodes";

export const CONTRACT_LIBRARY_STORAGE_KEY = "frontier-flow:contracts";

export interface PublishedGraphProvenance {
  readonly blobId: string;
  readonly blobObjectId?: string;
  readonly network: "testnet";
  readonly publishedAt: string;
  readonly contentType: "application/x.frontier-flow+yaml";
}

export interface NamedFlowContract {
  readonly id?: string;
  readonly name: string;
  readonly description?: string;
  readonly nodes: FlowNode[];
  readonly edges: FlowEdge[];
  readonly updatedAt: string;
  readonly isSeeded?: boolean;
  readonly walrusProvenance?: PublishedGraphProvenance;
}

export interface ContractLibrary {
  readonly version: 2;
  readonly activeContractName: string;
  readonly contracts: NamedFlowContract[];
}

interface CreateNamedFlowContractOptions {
  readonly id?: string;
  readonly description?: string;
  readonly updatedAt?: string;
  readonly isSeeded?: boolean;
  readonly walrusProvenance?: PublishedGraphProvenance;
}

interface UpdateNamedFlowContractOptions {
  readonly preserveUpdatedAt?: boolean;
  readonly walrusProvenance?: PublishedGraphProvenance;
}

export interface MergeImportedContractRequest {
  readonly library: ContractLibrary;
  readonly importedContract: NamedFlowContract;
  readonly makeUniqueName?: (baseName: string, existingNames: readonly string[]) => string;
  readonly activateImportedContract?: boolean;
}

export interface MergeImportedContractResult {
  readonly library: ContractLibrary;
  readonly importedContract: NamedFlowContract;
  readonly importedContractName: string;
  readonly originalImportedContractName: string;
}

function createContractId(name: string): string {
  return `contract:${sanitizeContractName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
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
  options: CreateNamedFlowContractOptions = {},
): NamedFlowContract {
  const sanitizedName = sanitizeContractName(name);

  return {
    id: options.id ?? createContractId(sanitizedName),
    name: sanitizedName,
    description: options.description,
    nodes: [...nodes],
    edges: [...edges],
    updatedAt: options.updatedAt ?? new Date().toISOString(),
    isSeeded: options.isSeeded,
    walrusProvenance: options.walrusProvenance,
  };
}

/**
 * Rebuilds an existing named contract with new flow contents while preserving its metadata.
 */
export function updateNamedFlowContract(
  contract: NamedFlowContract,
  nodes: readonly FlowNode[],
  edges: readonly FlowEdge[],
  options: UpdateNamedFlowContractOptions = {},
): NamedFlowContract {
  return createNamedFlowContract(contract.name, nodes, edges, {
    id: contract.id,
    description: contract.description,
    updatedAt: options.preserveUpdatedAt === true ? contract.updatedAt : undefined,
    isSeeded: contract.isSeeded,
    walrusProvenance: options.walrusProvenance ?? contract.walrusProvenance,
  });
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
 * Adds an imported contract to the library without overwriting existing contracts.
 */
export function mergeImportedContract(request: MergeImportedContractRequest): MergeImportedContractResult {
  const makeUniqueName = request.makeUniqueName ?? createUniqueContractName;
  const existingNames = request.library.contracts.map((contract) => contract.name);
  const importedContractName = makeUniqueName(request.importedContract.name, existingNames);
  const importedContract = importedContractName === request.importedContract.name
    ? request.importedContract
    : createNamedFlowContract(importedContractName, request.importedContract.nodes, request.importedContract.edges, {
        id: request.importedContract.id,
        description: request.importedContract.description,
        updatedAt: request.importedContract.updatedAt,
        walrusProvenance: request.importedContract.walrusProvenance,
      });

  return {
    library: {
      ...request.library,
      activeContractName: request.activateImportedContract === false ? request.library.activeContractName : importedContract.name,
      contracts: request.library.contracts.concat(importedContract),
    },
    importedContract,
    importedContractName: importedContract.name,
    originalImportedContractName: request.importedContract.name,
  };
}

/**
 * Loads the saved contract library from local storage, or falls back to the provided starter contract.
 */
export function loadContractLibrary(
  storage: Storage | undefined,
  fallbackContract: NamedFlowContract,
  seededContracts: readonly NamedFlowContract[] = [],
): ContractLibrary {
  const rawValue = storage?.getItem(CONTRACT_LIBRARY_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return createFallbackLibrary(fallbackContract, seededContracts);
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    return parseContractLibrary(parsedValue, fallbackContract, seededContracts);
  } catch {
    return createFallbackLibrary(fallbackContract, seededContracts);
  }
}

/**
 * Persists the full contract library to local storage.
 */
export function saveContractLibrary(storage: Storage | undefined, library: ContractLibrary): void {
  storage?.setItem(CONTRACT_LIBRARY_STORAGE_KEY, JSON.stringify(library));
}

function mergeContracts(
  contracts: readonly NamedFlowContract[],
  seededContracts: readonly NamedFlowContract[],
): NamedFlowContract[] {
  const mergedContracts = new Map<string, NamedFlowContract>();

  for (const contract of [...seededContracts, ...contracts]) {
    const key = sanitizeContractName(contract.name);
    mergedContracts.set(key, contract);
  }

  return [...mergedContracts.values()];
}

function createFallbackLibrary(
  fallbackContract: NamedFlowContract,
  seededContracts: readonly NamedFlowContract[],
): ContractLibrary {
  const contracts = mergeContracts([fallbackContract], seededContracts);

  return {
    version: 2,
    activeContractName: fallbackContract.name,
    contracts,
  };
}

function parseContractLibrary(
  parsedValue: unknown,
  fallbackContract: NamedFlowContract,
  seededContracts: readonly NamedFlowContract[],
): ContractLibrary {
  if (!isRecord(parsedValue)) {
    return createFallbackLibrary(fallbackContract, seededContracts);
  }

  const rawContracts = Array.isArray(parsedValue.contracts) ? parsedValue.contracts : [];
  const parsedContracts = rawContracts.flatMap((rawContract) => {
    const parsedContract = parseNamedFlowContract(rawContract);
    return parsedContract === undefined ? [] : [parsedContract];
  });

  const contracts = mergeContracts(parsedContracts, seededContracts);

  if (contracts.length === 0) {
    return createFallbackLibrary(fallbackContract, seededContracts);
  }

  const activeContractName =
    typeof parsedValue.activeContractName === "string" && contracts.some((contract) => contract.name === parsedValue.activeContractName)
      ? parsedValue.activeContractName
      : contracts[0].name;

  return {
    version: 2,
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
    id: typeof rawContract.id === "string" ? rawContract.id : createContractId(rawContract.name),
    name: sanitizeContractName(rawContract.name),
    description: typeof rawContract.description === "string" ? rawContract.description : undefined,
    nodes: rawContract.nodes as FlowNode[],
    edges: rawContract.edges as FlowEdge[],
    updatedAt: typeof rawContract.updatedAt === "string" ? rawContract.updatedAt : new Date(0).toISOString(),
    isSeeded: rawContract.isSeeded === true,
    walrusProvenance: parsePublishedGraphProvenance(rawContract.walrusProvenance),
  };
}

function parsePublishedGraphProvenance(value: unknown): PublishedGraphProvenance | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    typeof value.blobId !== "string"
    || typeof value.publishedAt !== "string"
    || value.network !== "testnet"
    || value.contentType !== "application/x.frontier-flow+yaml"
  ) {
    return undefined;
  }

  return {
    blobId: value.blobId,
    blobObjectId: typeof value.blobObjectId === "string" ? value.blobObjectId : undefined,
    network: "testnet",
    publishedAt: value.publishedAt,
    contentType: "application/x.frontier-flow+yaml",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}