import type { DeploymentTargetId } from "../compiler/types";
import { getPackageReferenceBundle } from "../data/packageReferences";

type RemoteDeploymentTargetId = Exclude<DeploymentTargetId, "local">;

const REMOTE_DEPLOYMENT_TARGET_IDS: readonly RemoteDeploymentTargetId[] = ["testnet:stillness", "testnet:utopia"];

interface GraphQlError {
  readonly message?: string;
}

interface GraphQlResponse<TData> {
  readonly data?: TData | null;
  readonly errors?: readonly GraphQlError[];
}

interface PlayerProfileLookupResponse {
  readonly address: {
    readonly objects: {
      readonly nodes: ReadonlyArray<{
        readonly contents: {
          readonly json: unknown;
        } | null;
      }>;
    } | null;
  } | null;
}

interface CharacterLookupResponse {
  readonly object: {
    readonly asMoveObject: {
      readonly contents: {
        readonly json: unknown;
      } | null;
    } | null;
  } | null;
}

interface CharacterNameLookupInput {
  readonly walletAddress: string;
  readonly targetId: RemoteDeploymentTargetId;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
}

interface CharacterNameAcrossTargetsLookupInput {
  readonly walletAddress: string;
  readonly preferredTargetId?: DeploymentTargetId;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
}

export interface ResolvedWalletCharacterIdentity {
  readonly characterName: string;
  readonly targetId: RemoteDeploymentTargetId;
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

const CHARACTER_QUERY = `query Character($id: SuiAddress!) {
  object(address: $id) {
    asMoveObject {
      contents {
        json
      }
    }
  }
}`;

/**
 * Resolve the public GraphQL endpoint used for published Sui testnet targets.
 */
export function getCharacterProfileGraphQlEndpoint(targetId: DeploymentTargetId): string | null {
  if (targetId === "local") {
    return null;
  }

  return TESTNET_GRAPHQL_ENDPOINT;
}

/**
 * Extract a character id from the wallet-owned PlayerProfile payload.
 */
export function extractCharacterIdFromProfileContent(content: unknown): string | null {
  const characterId = findFirstStringAtKeys(content, ["character_id", "characterId"]);

  return isSuiAddress(characterId) ? characterId : null;
}

/**
 * Extract a character name from the Character object's metadata payload.
 */
export function extractCharacterNameFromCharacterContent(content: unknown): string | null {
  const metadata = findFirstValueAtKeys(content, ["metadata"]);

  if (metadata === undefined) {
    return null;
  }

  const characterName = findFirstStringAtKeys(metadata, ["name"]);

  return characterName === null || characterName.trim().length === 0 ? null : characterName;
}

/**
 * Resolve the displayable character name for a connected wallet on a published world target.
 */
export async function fetchCharacterNameForWallet(input: CharacterNameLookupInput): Promise<string | null> {
  const endpoint = getCharacterProfileGraphQlEndpoint(input.targetId);

  if (endpoint === null) {
    return null;
  }

  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const playerProfileContent = await fetchPlayerProfileContent({
    endpoint,
    fetchFn,
    signal: input.signal,
    targetId: input.targetId,
    walletAddress: input.walletAddress,
  });
  const characterId = extractCharacterIdFromProfileContent(playerProfileContent);

  if (characterId === null) {
    return null;
  }

  const characterContent = await fetchCharacterContent({
    endpoint,
    fetchFn,
    signal: input.signal,
    characterId,
  });

  return extractCharacterNameFromCharacterContent(characterContent);
}

/**
 * Resolve the first available character name for a wallet across the published world targets.
 */
export async function fetchCharacterNameForWalletAcrossTargets(
  input: CharacterNameAcrossTargetsLookupInput,
): Promise<string | null> {
  const identity = await fetchCharacterIdentityForWalletAcrossTargets(input);

  return identity?.characterName ?? null;
}

/**
 * Resolve the first available character identity for a wallet across the published world targets.
 */
export async function fetchCharacterIdentityForWalletAcrossTargets(
  input: CharacterNameAcrossTargetsLookupInput,
): Promise<ResolvedWalletCharacterIdentity | null> {
  const candidateTargets = getCandidateTargets(input.preferredTargetId);

  for (const targetId of candidateTargets) {
    const characterName = await fetchCharacterNameForWallet({
      walletAddress: input.walletAddress,
      targetId,
      signal: input.signal,
      fetchFn: input.fetchFn,
    });

    if (characterName !== null) {
      return {
        characterName,
        targetId,
      };
    }
  }

  return null;
}

async function postGraphQl<TData>(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly query: string;
  readonly variables: Record<string, string>;
  readonly signal?: AbortSignal;
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

async function fetchPlayerProfileContent(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly signal?: AbortSignal;
  readonly targetId: RemoteDeploymentTargetId;
  readonly walletAddress: string;
}): Promise<unknown> {
  const playerProfileType = `${getPackageReferenceBundle(input.targetId).originalWorldPackageId}::character::PlayerProfile`;
  const playerProfileData = await postGraphQl<PlayerProfileLookupResponse>({
    endpoint: input.endpoint,
    fetchFn: input.fetchFn,
    query: PLAYER_PROFILE_QUERY,
    signal: input.signal,
    variables: {
      owner: input.walletAddress,
      type: playerProfileType,
    },
  });

  return playerProfileData.address?.objects?.nodes[0]?.contents?.json;
}

async function fetchCharacterContent(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly signal?: AbortSignal;
  readonly characterId: string;
}): Promise<unknown> {
  const characterData = await postGraphQl<CharacterLookupResponse>({
    endpoint: input.endpoint,
    fetchFn: input.fetchFn,
    query: CHARACTER_QUERY,
    signal: input.signal,
    variables: { id: input.characterId },
  });

  return characterData.object?.asMoveObject?.contents?.json;
}

function findFirstValueAtKeys(input: unknown, keys: readonly string[]): unknown {
  const visited = new Set<object>();
  const queue: unknown[] = [input];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === null || typeof current !== "object") {
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

    const record = current as Record<string, unknown>;

    for (const key of keys) {
      if (key in current) {
        return record[key];
      }
    }

    for (const value of Object.values(record)) {
      queue.push(value);
    }
  }

  return undefined;
}

function getCandidateTargets(preferredTargetId?: DeploymentTargetId): readonly RemoteDeploymentTargetId[] {
  if (preferredTargetId === undefined || preferredTargetId === "local") {
    return REMOTE_DEPLOYMENT_TARGET_IDS;
  }

  return [preferredTargetId, ...REMOTE_DEPLOYMENT_TARGET_IDS.filter((targetId) => targetId !== preferredTargetId)];
}

function findFirstStringAtKeys(input: unknown, keys: readonly string[]): string | null {
  const value = findFirstValueAtKeys(input, keys);

  return typeof value === "string" ? value : null;
}

function isSuiAddress(value: string | null): value is string {
  return value !== null && /^0x[a-f0-9]+$/i.test(value);
}