import { getPackageReferenceBundle } from "../data/packageReferences";
import type { StoredDeploymentState, TurretInfo } from "../types/authorization";
import type {
  SimulationCandidateDraft,
  SimulationFieldKey,
  SimulationSuggestion,
} from "../types/turretSimulation";
import { fetchTurretById, getTurretGraphQlEndpoint } from "./turretQueries";
import { extractCharacterNameFromCharacterContent } from "./characterProfile";

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
      readonly pageInfo?: {
        readonly hasNextPage?: boolean;
        readonly endCursor?: string | null;
      } | null;
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

interface CharacterSearchResponse {
  readonly objects?: {
    readonly pageInfo?: {
      readonly hasNextPage?: boolean;
      readonly endCursor?: string | null;
    } | null;
    readonly nodes?: ReadonlyArray<{
      readonly address?: unknown;
      readonly asMoveObject?: {
        readonly contents?: {
          readonly json?: unknown;
        } | null;
      } | null;
    }>;
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

const GRAPHQL_PAGE_SIZE = 50;
const MAX_GRAPHQL_PAGES = 20;
const CHARACTER_SUGGESTION_LIMIT = 12;

const PLAYER_PROFILE_QUERY = `query PlayerProfiles($owner: SuiAddress!, $type: String!, $after: String) {
  address(address: $owner) {
    objects(filter: { type: $type }, first: ${String(GRAPHQL_PAGE_SIZE)}, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
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

const CHARACTER_QUERY = `query Character($id: SuiAddress!) {
  object(address: $id) {
    asMoveObject {
      contents {
        json
      }
    }
  }
}`;

const CHARACTER_OBJECTS_QUERY = `query Characters($type: String!, $after: String) {
  objects(filter: { type: $type }, first: ${String(GRAPHQL_PAGE_SIZE)}, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      address
      asMoveObject {
        contents {
          json
        }
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
      query: input.trimmedQuery,
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
  return field === "characterId" || (field === "characterTribe" && trimmedQuery.length === 0);
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
  readonly query: string;
  readonly signal?: AbortSignal;
  readonly walletAddress: string;
}): Promise<readonly SimulationSuggestion[]> {
  const targetId = input.deploymentState.targetId;

  if (targetId === "local") {
    return [];
  }

  if (input.field === "characterId" && input.query.length > 0) {
    return fetchGlobalCharacterSuggestions({
      deploymentState: input.deploymentState,
      endpoint: input.endpoint,
      fetchFn: input.fetchFn,
      field: "characterId",
      query: input.query,
      signal: input.signal,
    });
  }

  const bundle = getPackageReferenceBundle(targetId);
  const nodes = await loadAllPlayerProfileNodes({
    endpoint: input.endpoint,
    fetchFn: input.fetchFn,
    owner: input.walletAddress,
    signal: input.signal,
    type: `${bundle.originalWorldPackageId}::character::PlayerProfile`,
  });

  const suggestions: Array<SimulationSuggestion | null> = await Promise.all(nodes.map(async (node): Promise<SimulationSuggestion | null> => {
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
    return buildCharacterSuggestion({
      content: characterContent,
      field: input.field,
      sourceObjectId: characterObjectId,
    });
  }));

  return suggestions.filter((suggestion): suggestion is SimulationSuggestion => suggestion !== null && suggestion.value.trim().length > 0);
}

async function fetchGlobalCharacterSuggestions(input: {
  readonly deploymentState: StoredDeploymentState;
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly field: "characterId";
  readonly query: string;
  readonly signal?: AbortSignal;
}): Promise<readonly SimulationSuggestion[]> {
  const bundle = getPackageReferenceBundle(input.deploymentState.targetId);
  const characterType = `${bundle.originalWorldPackageId}::character::Character`;
  const normalizedQuery = input.query.trim().toLowerCase();
  const suggestions: SimulationSuggestion[] = [];
  const seenKeys = new Set<string>();
  let after: string | null = null;

  for (let page = 0; page < MAX_GRAPHQL_PAGES; page += 1) {
    const response: CharacterSearchResponse = await postGraphQl<CharacterSearchResponse>({
      endpoint: input.endpoint,
      fetchFn: input.fetchFn,
      query: CHARACTER_OBJECTS_QUERY,
      signal: input.signal,
      variables: buildCharacterSearchVariables(characterType, after),
    });

    appendMatchingCharacterSuggestions({
      field: input.field,
      nodes: response.objects?.nodes ?? [],
      normalizedQuery,
      seenKeys,
      suggestions,
    });

    if (suggestions.length >= CHARACTER_SUGGESTION_LIMIT) {
      break;
    }

    after = getNextGraphQlCursor(response.objects?.pageInfo);

    if (after === null) {
      break;
    }
  }

  return suggestions;
}

function buildCharacterSearchVariables(characterType: string, after: string | null): Record<string, string> {
  return after === null ? { type: characterType } : { after, type: characterType };
}

function appendMatchingCharacterSuggestions(input: {
  readonly field: "characterId";
  readonly nodes: ReadonlyArray<NonNullable<NonNullable<CharacterSearchResponse["objects"]>["nodes"]>[number]>;
  readonly normalizedQuery: string;
  readonly seenKeys: Set<string>;
  readonly suggestions: SimulationSuggestion[];
}): void {
  for (const node of input.nodes) {
    const sourceObjectId = typeof node.address === "string" ? node.address : null;
    const suggestion = buildCharacterSuggestion({
      content: node.asMoveObject?.contents?.json,
      field: input.field,
      sourceObjectId,
    });

    if (suggestion === null || !matchesCharacterSuggestion(suggestion, input.normalizedQuery)) {
      continue;
    }

    const dedupeKey = `${suggestion.value}:${suggestion.sourceObjectId ?? suggestion.label}`;
    if (input.seenKeys.has(dedupeKey)) {
      continue;
    }

    input.seenKeys.add(dedupeKey);
    input.suggestions.push(suggestion);

    if (input.suggestions.length >= CHARACTER_SUGGESTION_LIMIT) {
      return;
    }
  }
}

function buildCharacterSuggestion(input: {
  readonly content: unknown;
  readonly field: "characterId" | "characterTribe";
  readonly sourceObjectId: string | null;
}): SimulationSuggestion | null {
  const characterId = findFirstIntegerAtKeys(input.content, ["item_id", "itemId"]);
  const characterTribe = findFirstIntegerAtKeys(input.content, ["character_tribe", "characterTribe", "tribe_id", "tribeId", "tribe"]);
  const characterName = extractCharacterNameFromCharacterContent(input.content);
  const characterTenant = findFirstStringAtKeys(input.content, ["tenant"]);

  if (characterId === null) {
    return null;
  }

  const description = [
    characterName === null ? null : `Name ${characterName}`,
    characterTenant === null ? null : `Tenant ${characterTenant}`,
    characterTribe === null ? null : `Tribe ${String(characterTribe)}`,
  ].filter((part): part is string => part !== null).join(" · ");

  return {
    field: input.field,
    label: characterName === null ? `Character ${String(characterId)}` : `${characterName} (${String(characterId)})`,
    value: String(input.field === "characterTribe" ? (characterTribe ?? "") : characterId),
    description: description.length === 0 ? null : description,
    derivedFields: {
      characterId,
      characterTribe,
    },
    sourceObjectId: input.sourceObjectId,
  } satisfies SimulationSuggestion;
}

function matchesCharacterSuggestion(suggestion: SimulationSuggestion, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  return [
    suggestion.label,
    suggestion.value,
    suggestion.description,
    suggestion.sourceObjectId,
  ].some((value) => value !== null && value.toLowerCase().includes(normalizedQuery));
}

async function fetchCharacterContent(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly id: string;
  readonly signal?: AbortSignal;
}): Promise<unknown> {
  const response = await postGraphQl<CharacterObjectResponse>({
    endpoint: input.endpoint,
    fetchFn: input.fetchFn,
    query: CHARACTER_QUERY,
    signal: input.signal,
    variables: { id: input.id },
  });

  return response.object?.asMoveObject?.contents?.json;
}

async function loadAllPlayerProfileNodes(input: {
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly owner: string;
  readonly signal?: AbortSignal;
  readonly type: string;
}): Promise<ReadonlyArray<NonNullable<NonNullable<NonNullable<PlayerProfileResponse["address"]>["objects"]>["nodes"]>[number]>> {
  const nodes: Array<NonNullable<NonNullable<NonNullable<PlayerProfileResponse["address"]>["objects"]>["nodes"]>[number]> = [];
  let after: string | null = null;

  for (let page = 0; page < MAX_GRAPHQL_PAGES; page += 1) {
    const response: PlayerProfileResponse = await postGraphQl<PlayerProfileResponse>({
      endpoint: input.endpoint,
      fetchFn: input.fetchFn,
      query: PLAYER_PROFILE_QUERY,
      signal: input.signal,
      variables: buildPlayerProfileVariables(input.owner, input.type, after),
    });

    nodes.push(...(response.address?.objects?.nodes ?? []));

    after = getNextGraphQlCursor(response.address?.objects?.pageInfo);

    if (after === null) {
      break;
    }
  }

  return nodes;
}

function buildPlayerProfileVariables(owner: string, type: string, after: string | null): Record<string, string> {
  return after === null
    ? { owner, type }
    : { after, owner, type };
}

function getNextGraphQlCursor(pageInfo: { readonly hasNextPage?: boolean; readonly endCursor?: string | null } | null | undefined): string | null {
  if (pageInfo?.hasNextPage !== true || typeof pageInfo.endCursor !== "string") {
    return null;
  }

  return pageInfo.endCursor;
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

function isSuiAddress(value: string | null): value is string {
  return value !== null && /^0x[0-9a-f]+$/iu.test(value);
}