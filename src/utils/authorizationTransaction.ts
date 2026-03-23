import { Transaction } from "@mysten/sui/transactions";

import { getPackageReferenceBundle } from "../data/packageReferences";
import type { StoredDeploymentState } from "../types/authorization";

interface GraphQlError {
  readonly message?: string;
}

interface GraphQlResponse<TData> {
  readonly data?: TData | null;
  readonly errors?: readonly GraphQlError[];
}

interface AuthorizationLookupResponse {
  readonly address?: {
    readonly objects?: {
      readonly nodes?: ReadonlyArray<{
        readonly address?: unknown;
        readonly contents?: {
          readonly json?: unknown;
        } | null;
      }>;
    } | null;
  } | null;
}

type AuthorizationLookupNode = NonNullable<NonNullable<NonNullable<AuthorizationLookupResponse["address"]>["objects"]>["nodes"]>[number];

interface FetchAuthorizationCharacterIdInput {
  readonly targetId: Exclude<StoredDeploymentState["targetId"], "local">;
  readonly walletAddress: string;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
}

export interface FetchOwnerCapInput {
  readonly deploymentState: StoredDeploymentState;
  readonly walletAddress: string;
  readonly turretObjectId: string;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
}

export interface BuildAuthorizeTurretTransactionInput {
  readonly deploymentState: StoredDeploymentState;
  readonly characterId: string;
  readonly ownerCapId: string;
  readonly turretObjectId: string;
}

const TESTNET_GRAPHQL_ENDPOINT = "https://graphql.testnet.sui.io/graphql";

const PLAYER_PROFILE_QUERY = `query PlayerProfile($owner: SuiAddress!, $type: String!) {
  address(address: $owner) {
    objects(filter: { type: $type }, first: 1) {
      nodes {
        contents {
          json
        }
      }
    }
  }
}`;

const OWNER_CAPS_QUERY = `query OwnerCaps($owner: SuiAddress!, $type: String!) {
  address(address: $owner) {
    objects(filter: { type: $type }, first: 100) {
      nodes {
        address
        contents {
          json
        }
      }
    }
  }
}`;

/**
 * Resolve the active character id for a wallet on a published deployment target.
 */
export async function fetchAuthorizationCharacterId(
  input: FetchAuthorizationCharacterIdInput,
): Promise<string | null> {
  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const bundle = getPackageReferenceBundle(input.targetId);
  const data = await postGraphQl<AuthorizationLookupResponse>({
    endpoint: TESTNET_GRAPHQL_ENDPOINT,
    fetchFn,
    query: PLAYER_PROFILE_QUERY,
    signal: input.signal,
    variables: {
      owner: input.walletAddress,
      type: `${bundle.worldPackageId}::character::PlayerProfile`,
    },
  });
  const content = data.address?.objects?.nodes?.[0]?.contents?.json;
  const characterId = findFirstStringAtKeys(content, ["character_id", "characterId"]);

  return isSuiAddress(characterId) ? characterId : null;
}

/**
 * Resolve the wallet-owned OwnerCap object id for a specific turret.
 */
export async function fetchOwnerCap(input: FetchOwnerCapInput): Promise<string> {
  validateFetchOwnerCapInput(input);
  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const targetId = getPublishedTargetId(input.deploymentState);
  const bundle = getPackageReferenceBundle(targetId);
  const characterId = await fetchAuthorizationCharacterId({
    targetId,
    walletAddress: input.walletAddress,
    signal: input.signal,
    fetchFn,
  });

  if (characterId === null) {
    throw new Error("Could not resolve the active character for this wallet.");
  }

  const data = await postGraphQl<AuthorizationLookupResponse>({
    endpoint: TESTNET_GRAPHQL_ENDPOINT,
    fetchFn,
    query: OWNER_CAPS_QUERY,
    signal: input.signal,
    variables: {
      owner: characterId,
      type: `${bundle.worldPackageId}::character::OwnerCap<${bundle.worldPackageId}::turret::Turret>`,
    },
  });

  const ownerCapId = findOwnerCapId(data.address?.objects?.nodes ?? [], input.turretObjectId);

  if (ownerCapId !== null) {
    return ownerCapId;
  }

  throw new Error("Could not find ownership capability for this turret.");
}

function validateFetchOwnerCapInput(input: FetchOwnerCapInput): void {
  if (!isSuiAddress(input.turretObjectId)) {
    throw new Error("Turret id must be a valid Sui object id.");
  }

  if (input.deploymentState.targetId === "local") {
    throw new Error("Turret authorization is only available for published testnet deployments.");
  }
}

function getPublishedTargetId(deploymentState: StoredDeploymentState): Exclude<StoredDeploymentState["targetId"], "local"> {
  if (deploymentState.targetId === "local") {
    throw new Error("Turret authorization is only available for published testnet deployments.");
  }

  return deploymentState.targetId;
}

function findOwnerCapId(nodes: readonly AuthorizationLookupNode[], turretObjectId: string): string | null {
  for (const node of nodes) {
    if (typeof node.address !== "string" || !isSuiAddress(node.address)) {
      throw new Error("GraphQL owner capability response was malformed.");
    }

    const turretId = findFirstMatchingAddress(node.contents?.json, turretObjectId, [
      "authorized_object_id",
      "authorizedObjectId",
      "assembly_uid",
      "assemblyUid",
      "assembly_id",
      "assemblyId",
      "target_id",
      "targetId",
      "turret_id",
      "turretId",
      "object_id",
      "objectId",
    ]);

    if (turretId === turretObjectId) {
      return node.address;
    }
  }

  return null;
}

/**
 * Construct the borrow-authorize-return transaction required by the EVE Frontier world contracts.
 */
export function buildAuthorizeTurretTransaction(input: BuildAuthorizeTurretTransactionInput): Transaction {
  validateSuiAddress(input.characterId, "Character id");
  validateSuiAddress(input.ownerCapId, "Owner capability id");
  validateSuiAddress(input.turretObjectId, "Turret id");

  if (input.deploymentState.targetId === "local") {
    throw new Error("Turret authorization is only available for published testnet deployments.");
  }

  const bundle = getPackageReferenceBundle(input.deploymentState.targetId);
  const tx = new Transaction();
  const turretType = `${bundle.worldPackageId}::turret::Turret`;
  const authWitnessType = `${input.deploymentState.packageId}::${input.deploymentState.moduleName}::TurretAuth`;
  const [ownerCap, receipt] = tx.moveCall({
    target: `${bundle.worldPackageId}::character::borrow_owner_cap`,
    typeArguments: [turretType],
    arguments: [tx.object(input.characterId), tx.object(input.ownerCapId)],
  });

  tx.moveCall({
    target: `${bundle.worldPackageId}::turret::authorize_extension`,
    typeArguments: [authWitnessType],
    arguments: [tx.object(input.turretObjectId), ownerCap],
  });

  tx.moveCall({
    target: `${bundle.worldPackageId}::character::return_owner_cap`,
    typeArguments: [turretType],
    arguments: [tx.object(input.characterId), ownerCap, receipt],
  });

  return tx;
}

async function postGraphQl<TData>(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly query: string;
  readonly signal?: AbortSignal;
  readonly variables: Record<string, string>;
}): Promise<TData> {
  const response = await input.fetchFn(input.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: input.query,
      variables: input.variables,
    }),
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with ${String(response.status)} ${response.statusText}`.trim());
  }

  const body = await response.json() as GraphQlResponse<TData>;

  if ((body.errors?.length ?? 0) > 0) {
    throw new Error(body.errors?.map((error) => error.message ?? "Unknown GraphQL error").join("; "));
  }

  if (body.data === undefined || body.data === null) {
    throw new Error("GraphQL response did not include data.");
  }

  return body.data;
}

function findFirstMatchingAddress(input: unknown, expectedAddress: string, keys: readonly string[]): string | null {
  const value = findFirstValueAtKeys(input, keys);

  return typeof value === "string" && value.toLowerCase() === expectedAddress.toLowerCase() ? value : null;
}

function findFirstStringAtKeys(input: unknown, keys: readonly string[]): string | null {
  const value = findFirstValueAtKeys(input, keys);

  return typeof value === "string" ? value : null;
}

function findFirstValueAtKeys(input: unknown, keys: readonly string[]): unknown {
  const visited = new Set<object>();
  const queue: unknown[] = [input];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!isRecord(current) && !Array.isArray(current)) {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    for (const key of keys) {
      if (key in current) {
        return current[key];
      }
    }

    for (const value of Object.values(current)) {
      queue.push(value);
    }
  }

  return undefined;
}

function validateSuiAddress(value: string, label: string): void {
  if (!isSuiAddress(value)) {
    throw new Error(`${label} must be a valid Sui object id.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSuiAddress(value: string | null | undefined): value is string {
  return typeof value === "string" && /^0x[a-f0-9]+$/i.test(value);
}