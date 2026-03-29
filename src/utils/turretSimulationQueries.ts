import { getPackageReferenceBundle } from "../data/packageReferences";
import type { StoredDeploymentState, TurretInfo } from "../types/authorization";
import type {
  SimulationCandidateDraft,
  SimulationFieldKey,
  SimulationSuggestion,
} from "../types/turretSimulation";
import { fetchTurretById, getTurretGraphQlEndpoint } from "./turretQueries";

interface GraphQlError {
  readonly message?: string;
}

interface GraphQlResponse<TData> {
  readonly data?: TData | null;
  readonly errors?: readonly GraphQlError[];
}

interface SimulationObjectResponse {
  readonly object?: {
    readonly asMoveObject?: {
      readonly contents?: {
        readonly json?: unknown;
      } | null;
    } | null;
  } | null;
}

interface PlayerProfileResponse {
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

export interface FetchSimulationSuggestionsInput {
  readonly deploymentState: StoredDeploymentState;
  readonly turretObjectId: string;
  readonly walletAddress: string;
  readonly ownerCharacterId: string | null;
  readonly query: string;
  readonly field: SimulationFieldKey;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
}

export interface FetchSimulationSuggestionsResult {
  readonly suggestions: readonly SimulationSuggestion[];
  readonly refreshedTurret: TurretInfo | null;
}

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

const OBJECT_QUERY = `query SimulationObject($id: SuiAddress!) {
  object(address: $id) {
    asMoveObject {
      contents {
        json
      }
    }
  }
}`;

/**
 * Load remote suggestion candidates for unresolved simulation identity fields.
 */
export async function fetchSimulationSuggestions(
  input: FetchSimulationSuggestionsInput,
): Promise<FetchSimulationSuggestionsResult> {
  const endpoint = getTurretGraphQlEndpoint(input.deploymentState.targetId);

  if (endpoint === null) {
    return {
      suggestions: [],
      refreshedTurret: null,
    };
  }

  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const trimmedQuery = input.query.trim();
  const suggestions = await loadSuggestionCandidates({
    endpoint,
    fetchFn,
    input,
    trimmedQuery,
  });
  const refreshedTurret = await maybeRefreshTurret({
    deploymentState: input.deploymentState,
    fetchFn,
    signal: input.signal,
    trimmedQuery,
    turretObjectId: input.turretObjectId,
  });

  return {
    suggestions: dedupeSuggestions(suggestions),
    refreshedTurret,
  };
}

async function loadSuggestionCandidates(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly input: FetchSimulationSuggestionsInput;
  readonly trimmedQuery: string;
}): Promise<SimulationSuggestion[]> {
  const suggestions: SimulationSuggestion[] = [];

  if (shouldLoadCharacterSuggestions(input.input.field, input.trimmedQuery)) {
    suggestions.push(...await fetchCharacterSuggestions({
      deploymentState: input.input.deploymentState,
      endpoint: input.endpoint,
      fetchFn: input.fetchFn,
      field: input.input.field,
      signal: input.input.signal,
      walletAddress: input.input.walletAddress,
    }));
  }

  if (isSuiAddress(input.trimmedQuery)) {
    const objectSuggestion = await fetchObjectSuggestion({
      endpoint: input.endpoint,
      fetchFn: input.fetchFn,
      field: input.input.field,
      query: input.trimmedQuery,
      signal: input.input.signal,
    });

    if (objectSuggestion !== null) {
      suggestions.unshift(objectSuggestion);
    }
  }

  return suggestions;
}

function shouldLoadCharacterSuggestions(field: SimulationFieldKey, trimmedQuery: string): field is "characterId" | "characterTribe" {
  return (field === "characterId" || field === "characterTribe") && trimmedQuery.length === 0;
}

async function fetchObjectSuggestion(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly field: SimulationFieldKey;
  readonly query: string;
  readonly signal?: AbortSignal;
}): Promise<SimulationSuggestion | null> {
  const objectData = await postGraphQl<SimulationObjectResponse>({
    endpoint: input.endpoint,
    fetchFn: input.fetchFn,
    query: OBJECT_QUERY,
    signal: input.signal,
    variables: { id: input.query },
  });
  const content = objectData.object?.asMoveObject?.contents?.json;
  const derivedFields = extractCandidateDerivedFields(content);
  const primaryValue = getSuggestionValue(input.field, derivedFields);

  if (primaryValue === null) {
    return null;
  }

  return {
    field: input.field,
    label: findFirstStringAtKeys(content, ["name", "displayName", "label"]) ?? input.query,
    value: primaryValue,
    description: buildSuggestionDescription(derivedFields),
    derivedFields,
    sourceObjectId: input.query,
  };
}

async function maybeRefreshTurret(input: {
  readonly deploymentState: StoredDeploymentState;
  readonly fetchFn: typeof fetch;
  readonly signal?: AbortSignal;
  readonly trimmedQuery: string;
  readonly turretObjectId: string;
}): Promise<TurretInfo | null> {
  if (input.trimmedQuery.toLowerCase() !== input.turretObjectId.toLowerCase()) {
    return null;
  }

  return fetchTurretById({
    deploymentState: input.deploymentState,
    fetchFn: input.fetchFn,
    signal: input.signal,
    turretId: input.trimmedQuery,
  });
}

async function fetchCharacterSuggestions(input: {
  readonly deploymentState: StoredDeploymentState;
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly field: "characterId" | "characterTribe";
  readonly signal?: AbortSignal;
  readonly walletAddress: string;
}): Promise<readonly SimulationSuggestion[]> {
  const targetId = input.deploymentState.targetId;

  if (targetId === "local") {
    return [];
  }

  const bundle = getPackageReferenceBundle(targetId);
  const data = await postGraphQl<PlayerProfileResponse>({
    endpoint: input.endpoint,
    fetchFn: input.fetchFn,
    query: PLAYER_PROFILE_QUERY,
    signal: input.signal,
    variables: {
      owner: input.walletAddress,
      type: `${bundle.originalWorldPackageId}::character::PlayerProfile`,
    },
  });
  const nodes = data.address?.objects?.nodes ?? [];

  return nodes.flatMap((node) => {
    const content = node.contents?.json;
    const characterId = findFirstIntegerAtKeys(content, ["character_id", "characterId"]);
    const characterTribe = findFirstIntegerAtKeys(content, ["character_tribe", "characterTribe", "tribe_id", "tribeId", "tribe"]);

    if (characterId === null) {
      return [];
    }

    return [{
      field: input.field,
      label: `Character ${String(characterId)}`,
      value: String(input.field === "characterTribe" ? (characterTribe ?? "") : characterId),
      description: characterTribe === null ? null : `Tribe ${String(characterTribe)}`,
      derivedFields: {
        characterId,
        characterTribe,
      },
      sourceObjectId: typeof node.address === "string" ? node.address : null,
    } satisfies SimulationSuggestion];
  }).filter((suggestion) => suggestion.value.trim().length > 0);
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

function extractCandidateDerivedFields(content: unknown): Partial<SimulationCandidateDraft> {
  const itemId = findFirstUnsignedStringAtKeys(content, ["item_id", "itemId"]);
  const typeId = findFirstUnsignedStringAtKeys(content, ["type_id", "typeId"]);
  const groupId = findFirstUnsignedStringAtKeys(content, ["group_id", "groupId"]);
  const characterId = findFirstIntegerAtKeys(content, ["character_id", "characterId"]);
  const characterTribe = findFirstIntegerAtKeys(content, ["character_tribe", "characterTribe", "tribe_id", "tribeId", "tribe"]);

  return {
    ...(itemId === null ? {} : { itemId }),
    ...(typeId === null ? {} : { typeId }),
    ...(groupId === null ? {} : { groupId }),
    ...(characterId === null ? {} : { characterId }),
    ...(characterTribe === null ? {} : { characterTribe }),
  };
}

function getSuggestionValue(field: SimulationFieldKey, derivedFields: Partial<SimulationCandidateDraft>): string | null {
  const value = derivedFields[field];

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function buildSuggestionDescription(derivedFields: Partial<SimulationCandidateDraft>): string | null {
  const parts = [
    typeof derivedFields.typeId === "string" ? `Type ${derivedFields.typeId}` : null,
    typeof derivedFields.groupId === "string" ? `Group ${derivedFields.groupId}` : null,
    typeof derivedFields.characterId === "number" ? `Character ${String(derivedFields.characterId)}` : null,
    typeof derivedFields.characterTribe === "number" ? `Tribe ${String(derivedFields.characterTribe)}` : null,
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? null : parts.join(" · ");
}

function dedupeSuggestions(suggestions: readonly SimulationSuggestion[]): readonly SimulationSuggestion[] {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = `${suggestion.field}:${suggestion.value}:${suggestion.sourceObjectId ?? ""}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function findFirstUnsignedStringAtKeys(input: unknown, keys: readonly string[]): string | null {
  const value = findFirstValueAtKeys(input, keys);

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return value;
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return String(value);
  }

  return null;
}

function findFirstIntegerAtKeys(input: unknown, keys: readonly string[]): number | null {
  const value = findFirstValueAtKeys(input, keys);

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
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

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSuiAddress(value: string): boolean {
  return /^0x[0-9a-f]+$/iu.test(value);
}