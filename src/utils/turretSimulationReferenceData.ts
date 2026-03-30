import { getPackageReferenceBundle } from "../data/packageReferences";
import type {
  SimulationCharacterOption,
  SimulationReferenceDataPayload,
  SimulationShipOption,
  SimulationTribeOption,
} from "../types/turretSimulation";
import type { StoredDeploymentState } from "../types/authorization";
import { extractCharacterNameFromCharacterContent } from "./characterProfile";
import { getTurretGraphQlEndpoint } from "./turretQueries";

interface GraphQlError {
  readonly message?: string;
}

interface GraphQlResponse<TData> {
  readonly data?: TData | null;
  readonly errors?: readonly GraphQlError[];
}

interface WorldApiCollectionResponse<TValue> {
  readonly data?: readonly TValue[];
}

interface WorldApiShipRecord {
  readonly classId?: unknown;
  readonly className?: unknown;
  readonly id?: unknown;
  readonly name?: unknown;
}

interface WorldApiTribeRecord {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly nameShort?: unknown;
}

interface CharacterProfileResponse {
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

interface CharacterObjectResponse {
  readonly object?: {
    readonly asMoveObject?: {
      readonly contents?: {
        readonly json?: unknown;
      } | null;
    } | null;
  } | null;
}

interface LoadSimulationReferenceDataInput {
  readonly deploymentState: StoredDeploymentState | null;
  readonly fetchFn?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly walletAddress: string | null;
}

const TESTNET_GRAPHQL_ENDPOINT = "https://graphql.testnet.sui.io/graphql";
const PLAYER_PROFILE_QUERY = `query PlayerProfiles($owner: SuiAddress!, $type: String!) {
  address(address: $owner) {
    objects(filter: { type: $type }, first: 50) {
      nodes {
        address
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
const WORLD_API_SHIPS_URL = "https://world-api-stillness.live.tech.evefrontier.com/v2/ships";
const WORLD_API_TRIBES_URL = "https://world-api-stillness.live.tech.evefrontier.com/v2/tribes";

let cachedShipOptions: readonly SimulationShipOption[] | null = null;
let cachedTribeOptions: readonly SimulationTribeOption[] | null = null;

/**
 * Clear cached simulation reference data so tests can control remote fixtures.
 */
export function resetSimulationReferenceDataCacheForTests(): void {
  cachedShipOptions = null;
  cachedTribeOptions = null;
}

/**
 * Load simulation dropdown data from WorldAPI and GraphQL, keeping partial results when one source fails.
 */
export async function loadSimulationReferenceData(
  input: LoadSimulationReferenceDataInput,
): Promise<SimulationReferenceDataPayload> {
  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const [shipOptionsResult, tribeOptionsResult, characterOptionsResult] = await Promise.allSettled([
    loadSimulationShipOptions({ fetchFn, signal: input.signal }),
    loadSimulationTribeOptions({ fetchFn, signal: input.signal }),
    loadSimulationCharacterOptions({
      deploymentState: input.deploymentState,
      fetchFn,
      signal: input.signal,
      walletAddress: input.walletAddress,
    }),
  ]);

  const errorMessages = [
    getSettledErrorMessage(shipOptionsResult, "Could not load ship types from World API."),
    getSettledErrorMessage(tribeOptionsResult, "Could not load tribes from World API."),
    getSettledErrorMessage(characterOptionsResult, "Could not load character ids from GraphQL."),
  ].filter((value): value is string => value !== null);

  return {
    characterOptions: characterOptionsResult.status === "fulfilled" ? characterOptionsResult.value : [],
    errorMessages,
    shipOptions: shipOptionsResult.status === "fulfilled" ? shipOptionsResult.value : [],
    tribeOptions: tribeOptionsResult.status === "fulfilled" ? tribeOptionsResult.value : [],
  };
}

async function loadSimulationShipOptions(input: {
  readonly fetchFn: typeof fetch;
  readonly signal?: AbortSignal;
}): Promise<readonly SimulationShipOption[]> {
  if (input.signal === undefined && cachedShipOptions !== null) {
    return cachedShipOptions;
  }

  const payload = await getWorldApiCollection<WorldApiShipRecord>({
    fetchFn: input.fetchFn,
    signal: input.signal,
    url: WORLD_API_SHIPS_URL,
  });
  const options = payload
    .map((record) => buildShipOption(record))
    .filter((option): option is SimulationShipOption => option !== null)
    .sort((left, right) => left.label.localeCompare(right.label));

  if (input.signal === undefined) {
    cachedShipOptions = options;
  }

  return options;
}

async function loadSimulationTribeOptions(input: {
  readonly fetchFn: typeof fetch;
  readonly signal?: AbortSignal;
}): Promise<readonly SimulationTribeOption[]> {
  if (input.signal === undefined && cachedTribeOptions !== null) {
    return cachedTribeOptions;
  }

  const payload = await getWorldApiCollection<WorldApiTribeRecord>({
    fetchFn: input.fetchFn,
    signal: input.signal,
    url: WORLD_API_TRIBES_URL,
  });
  const options = payload
    .map((record) => buildTribeOption(record))
    .filter((option): option is SimulationTribeOption => option !== null)
    .sort((left, right) => left.label.localeCompare(right.label));

  if (input.signal === undefined) {
    cachedTribeOptions = options;
  }

  return options;
}

async function loadSimulationCharacterOptions(input: {
  readonly deploymentState: StoredDeploymentState | null;
  readonly fetchFn: typeof fetch;
  readonly signal?: AbortSignal;
  readonly walletAddress: string | null;
}): Promise<readonly SimulationCharacterOption[]> {
  if (!canLoadSimulationCharacterOptions(input)) {
    return [];
  }

  const endpoint = getTurretGraphQlEndpoint(input.deploymentState.targetId) ?? TESTNET_GRAPHQL_ENDPOINT;
  const bundle = getPackageReferenceBundle(input.deploymentState.targetId);
  const response = await postGraphQl<CharacterProfileResponse>({
    endpoint,
    fetchFn: input.fetchFn,
    query: PLAYER_PROFILE_QUERY,
    signal: input.signal,
    variables: {
      owner: input.walletAddress,
      type: `${bundle.originalWorldPackageId}::character::PlayerProfile`,
    },
  });

  return buildSimulationCharacterOptions(response.address?.objects?.nodes ?? [], {
    endpoint,
    fetchFn: input.fetchFn,
    signal: input.signal,
  });
}

function canLoadSimulationCharacterOptions(input: {
  readonly deploymentState: StoredDeploymentState | null;
  readonly walletAddress: string | null;
}): input is {
  readonly deploymentState: Exclude<StoredDeploymentState, null>;
  readonly walletAddress: string;
} {
  return input.deploymentState !== null && input.deploymentState.targetId !== "local" && input.walletAddress !== null;
}

async function buildSimulationCharacterOptions(
  nodes: ReadonlyArray<NonNullable<NonNullable<NonNullable<CharacterProfileResponse["address"]>["objects"]>["nodes"]>[number]>,
  input: {
    readonly endpoint: string;
    readonly fetchFn: typeof fetch;
    readonly signal?: AbortSignal;
  },
): Promise<readonly SimulationCharacterOption[]> {
  const uniqueByCharacterId = new Map<number, SimulationCharacterOption>();

  const resolvedOptions = await Promise.all(nodes.map(async (node) => {
    const characterObjectId = findFirstStringAtKeys(node.contents?.json, ["character_id", "characterId"]);

    if (!isSuiAddress(characterObjectId)) {
      return null;
    }

    const characterContent = await fetchCharacterContent({
      endpoint: input.endpoint,
      fetchFn: input.fetchFn,
      id: characterObjectId,
      signal: input.signal,
    });

    return buildSimulationCharacterOption({
      characterContent,
      sourceObjectId: characterObjectId,
    });
  }));

  for (const option of resolvedOptions) {

    if (option !== null) {
      uniqueByCharacterId.set(option.characterId, option);
    }
  }

  return [...uniqueByCharacterId.values()].sort((left, right) => left.characterId - right.characterId);
}

function buildSimulationCharacterOption(
  input: {
    readonly characterContent: unknown;
    readonly sourceObjectId: string;
  },
): SimulationCharacterOption | null {
  const characterId = findFirstIntegerAtKeys(input.characterContent, ["item_id", "itemId", "character_id", "characterId"]);

  if (characterId === null) {
    return null;
  }

  const characterTribe = findFirstIntegerAtKeys(input.characterContent, ["character_tribe", "characterTribe", "tribe_id", "tribeId", "tribe"]);
  const characterName = extractCharacterNameFromCharacterContent(input.characterContent);
  const tenant = findFirstStringAtKeys(input.characterContent, ["tenant"]);
  const descriptionParts = [
    tenant === null ? null : `Tenant ${tenant}`,
    characterTribe === null ? null : `Tribe ${String(characterTribe)}`,
  ].filter((value): value is string => value !== null);

  return {
    characterId,
    characterTribe,
    description: descriptionParts.length === 0 ? null : descriptionParts.join(" · "),
    label: characterName === null ? `Character ${String(characterId)}` : `${characterName} (${String(characterId)})`,
    sourceObjectId: input.sourceObjectId,
  };
}

async function fetchCharacterContent(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly id: string;
  readonly signal?: AbortSignal;
}): Promise<unknown> {
  const characterResponse = await postGraphQl<CharacterObjectResponse>({
    endpoint: input.endpoint,
    fetchFn: input.fetchFn,
    query: CHARACTER_QUERY,
    signal: input.signal,
    variables: { id: input.id },
  });

  return characterResponse.object?.asMoveObject?.contents?.json;
}

async function getWorldApiCollection<TValue>(input: {
  readonly fetchFn: typeof fetch;
  readonly signal?: AbortSignal;
  readonly url: string;
}): Promise<readonly TValue[]> {
  const response = await input.fetchFn(input.url, { signal: input.signal });

  if (!response.ok) {
    throw new Error(`Request failed with status ${String(response.status)}`);
  }

  const payload = await response.json() as WorldApiCollectionResponse<TValue>;
  const data = payload.data;

  return Array.isArray(data) ? data as readonly TValue[] : [];
}

function buildShipOption(record: WorldApiShipRecord): SimulationShipOption | null {
  const typeId = asFiniteInteger(record.id);
  const groupId = asFiniteInteger(record.classId);
  const label = typeof record.name === "string" ? record.name.trim() : "";

  if (typeId === null || groupId === null || label.length === 0) {
    return null;
  }

  const className = typeof record.className === "string" ? record.className.trim() : "";

  return {
    description: className.length > 0 ? `${className} · Group ${String(groupId)}` : `Group ${String(groupId)}`,
    groupId: String(groupId),
    label,
    typeId: String(typeId),
  };
}

function buildTribeOption(record: WorldApiTribeRecord): SimulationTribeOption | null {
  const tribeId = asFiniteInteger(record.id);
  const label = typeof record.name === "string" ? record.name.trim() : "";

  if (tribeId === null || label.length === 0) {
    return null;
  }

  return {
    description: typeof record.nameShort === "string" && record.nameShort.trim().length > 0
      ? record.nameShort.trim()
      : undefined,
    label,
    value: tribeId,
  };
}

async function postGraphQl<TData>(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly query: string;
  readonly signal?: AbortSignal;
  readonly variables: Record<string, string>;
}): Promise<TData> {
  const response = await input.fetchFn(input.endpoint, {
    body: JSON.stringify({
      query: input.query,
      variables: input.variables,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
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

function getSettledErrorMessage<TValue>(
  result: PromiseSettledResult<TValue>,
  prefix: string,
): string | null {
  if (result.status === "fulfilled") {
    return null;
  }

  const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
  return `${prefix} ${message}`.trim();
}

function findFirstIntegerAtKeys(value: unknown, keys: readonly string[]): number | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findFirstIntegerAtKeys(entry, keys);
      if (match !== null) {
        return match;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (keys.includes(key)) {
      const match = asFiniteInteger(entry);
      if (match !== null) {
        return match;
      }
    }

    const nestedMatch = findFirstIntegerAtKeys(entry, keys);
    if (nestedMatch !== null) {
      return nestedMatch;
    }
  }

  return null;
}

function findFirstStringAtKeys(value: unknown, keys: readonly string[]): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const match = findFirstStringAtKeys(entry, keys);
      if (match !== null) {
        return match;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (keys.includes(key) && typeof entry === "string" && entry.trim().length > 0) {
      return entry.trim();
    }

    const nestedMatch = findFirstStringAtKeys(entry, keys);
    if (nestedMatch !== null) {
      return nestedMatch;
    }
  }

  return null;
}

function isSuiAddress(value: string | null): value is string {
  return value !== null && /^0x[a-f0-9]+$/i.test(value);
}

function asFiniteInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}