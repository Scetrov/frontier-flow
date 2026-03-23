import { getPackageReferenceBundle } from "../data/packageReferences";
import type { StoredDeploymentState, TurretExtensionInfo, TurretInfo } from "../types/authorization";
import { fetchAuthorizationCharacterId } from "./authorizationTransaction";
import { overlayMockAuthorizedTurrets } from "./authorizationMocking";

interface GraphQlError {
  readonly message?: string;
}

interface GraphQlResponse<TData> {
  readonly data?: TData | null;
  readonly errors?: readonly GraphQlError[];
}

interface TurretLookupResponse {
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

interface TurretObjectResponse {
  readonly object?: {
    readonly asMoveObject?: {
      readonly contents?: {
        readonly json?: unknown;
      } | null;
    } | null;
  } | null;
}

type TurretLookupNode = {
  readonly address?: unknown;
  readonly contents?: {
    readonly json?: unknown;
  } | null;
};

type RemoteDeploymentTargetId = Exclude<StoredDeploymentState["targetId"], "local">;

interface FetchTurretsInput {
  readonly deploymentState: StoredDeploymentState;
  readonly walletAddress: string;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
}

const TESTNET_GRAPHQL_ENDPOINT = "https://graphql.testnet.sui.io/graphql";

const TURRETS_QUERY = `query Turrets($owner: SuiAddress!, $type: String!) {
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

const TURRET_OBJECT_QUERY = `query TurretObject($id: SuiAddress!) {
  object(address: $id) {
    asMoveObject {
      contents {
        json
      }
    }
  }
}`;

/**
 * Resolve the GraphQL endpoint used for turret lookups.
 */
export function getTurretGraphQlEndpoint(targetId: StoredDeploymentState["targetId"]): string | null {
  if (targetId === "local") {
    return null;
  }

  return TESTNET_GRAPHQL_ENDPOINT;
}

/**
 * Parse the turret lookup payload returned by GraphQL into UI-facing turret rows.
 */
export function parseTurretResponse(response: unknown, deploymentState: StoredDeploymentState): readonly TurretInfo[] {
  const nodes = getTurretNodes(response);

  return nodes.map((node) => {
    if (typeof node.address !== "string" || !isSuiAddress(node.address)) {
      throw new Error("GraphQL turret response was malformed.");
    }

    const content = node.contents?.json;

    return {
      objectId: node.address,
      displayName: extractTurretDisplayName(content),
      currentExtension: extractTurretExtension(content, deploymentState),
    } satisfies TurretInfo;
  });
}

/**
 * Fetch the connected wallet's turrets for the active deployment target.
 */
export async function fetchTurrets(input: FetchTurretsInput): Promise<readonly TurretInfo[]> {
  const remoteTargetId = getRemoteDeploymentTargetId(input.deploymentState.targetId);
  const endpoint = TESTNET_GRAPHQL_ENDPOINT;

  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const bundle = getPackageReferenceBundle(remoteTargetId);
  const characterId = await fetchAuthorizationCharacterId({
    targetId: remoteTargetId,
    walletAddress: input.walletAddress,
    signal: input.signal,
    fetchFn,
  });

  if (characterId === null) {
    return [];
  }

  const ownerCapType = `${bundle.worldPackageId}::character::OwnerCap<${bundle.worldPackageId}::turret::Turret>`;
  const data = await postGraphQl<TurretLookupResponse>({
    endpoint,
    fetchFn,
    query: TURRETS_QUERY,
    signal: input.signal,
    variables: {
      owner: characterId,
      type: ownerCapType,
    },
  });

  const turretIds = getTurretNodes(data)
    .map((node) => extractTurretIdFromOwnerCap(node.contents?.json))
    .filter(isNonNullable)
    .filter(isSuiAddress);

  const uniqueTurretIds = [...new Set(turretIds)];

  if (uniqueTurretIds.length === 0) {
    return [];
  }

  const turrets = await Promise.all(uniqueTurretIds.map(async (turretId) => loadTurretInfo({
    deploymentState: input.deploymentState,
    endpoint,
    fetchFn,
    signal: input.signal,
    turretId,
  })));

  return overlayMockAuthorizedTurrets(turrets.filter(isNonNullable), input.deploymentState);
}

async function loadTurretInfo(input: {
  readonly deploymentState: StoredDeploymentState;
  readonly endpoint: string;
  readonly fetchFn: typeof fetch;
  readonly signal?: AbortSignal;
  readonly turretId: string;
}): Promise<TurretInfo | null> {
  const data = await postGraphQl<TurretObjectResponse>({
    endpoint: input.endpoint,
    fetchFn: input.fetchFn,
    query: TURRET_OBJECT_QUERY,
    signal: input.signal,
    variables: { id: input.turretId },
  });

  const content = data.object?.asMoveObject?.contents?.json;

  if (content === undefined || content === null) {
    return null;
  }

  return {
    objectId: input.turretId,
    displayName: extractTurretDisplayName(content),
    currentExtension: extractTurretExtension(content, input.deploymentState),
  } satisfies TurretInfo;
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

function getTurretNodes(response: unknown): readonly TurretLookupNode[] {
  if (!isRecord(response)) {
    throw new Error("GraphQL turret response was malformed.");
  }

  const address = response.address;

  if (address === null) {
    return [];
  }

  if (!isRecord(address)) {
    throw new Error("GraphQL turret response was malformed.");
  }

  const objects = address.objects;

  if (objects === null) {
    return [];
  }

  if (!isRecord(objects) || !Array.isArray(objects.nodes)) {
    throw new Error("GraphQL turret response was malformed.");
  }

  return objects.nodes.map((node) => {
    if (!isTurretLookupNode(node)) {
      throw new Error("GraphQL turret response was malformed.");
    }

    return node;
  });
}

function extractTurretDisplayName(content: unknown): string | null {
  const displayName = findFirstStringAtKeys(content, ["name", "displayName", "label"]);

  return displayName === null || displayName.trim().length === 0 ? null : displayName;
}

function extractTurretExtension(content: unknown, deploymentState: StoredDeploymentState): TurretExtensionInfo | null {
  const extensionContainer = getExtensionContainer(content);
  const extensionIdentity = getExtensionIdentity(extensionContainer);

  if (extensionIdentity === null) {
    return null;
  }

  return {
    packageId: extensionIdentity.packageId,
    moduleName: extensionIdentity.moduleName,
    typeName: extensionIdentity.typeName,
    isCurrentDeployment: extensionIdentity.packageId === deploymentState.packageId && extensionIdentity.moduleName === deploymentState.moduleName,
  };
}

function getExtensionContainer(content: unknown): unknown {
  return findFirstValueAtKeys(content, [
    "extension",
    "currentExtension",
    "current_extension",
    "authorizedExtension",
    "authorized_extension",
  ]) ?? content;
}

function extractTurretIdFromOwnerCap(content: unknown): string | null {
  const turretId = findFirstStringAtKeys(content, [
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

  return isSuiAddress(turretId) ? turretId : null;
}

function getExtensionIdentity(content: unknown): { readonly packageId: string; readonly moduleName: string; readonly typeName: string } | null {
  const rawTypeName = findFirstStringAtKeys(content, ["typeName", "type_name", "authorizationType", "authorization_type"]);
  const rawPackageId = findFirstStringAtKeys(content, ["packageId", "package_id"]);
  const rawModuleName = findFirstStringAtKeys(content, ["moduleName", "module_name"]);
  const derivedTypeParts = parseTypeName(rawTypeName);
  const packageId = rawPackageId ?? derivedTypeParts?.packageId ?? null;
  const moduleName = rawModuleName ?? derivedTypeParts?.moduleName ?? null;
  const typeName = buildExtensionTypeName(rawTypeName, packageId, moduleName);

  if (packageId === null || moduleName === null || typeName === null) {
    return null;
  }

  return { packageId, moduleName, typeName };
}

function buildExtensionTypeName(typeName: string | null, packageId: string | null, moduleName: string | null): string | null {
  if (typeName !== null) {
    return typeName;
  }

  if (packageId === null || moduleName === null) {
    return null;
  }

  return `${packageId}::${moduleName}::TurretAuth`;
}

function parseTypeName(typeName: string | null): { readonly packageId: string; readonly moduleName: string } | null {
  if (typeName === null) {
    return null;
  }

  const [packageId, moduleName] = typeName.split("::");

  if (!isSuiAddress(packageId) || moduleName.length === 0) {
    return null;
  }

  return { packageId, moduleName };
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

function getRemoteDeploymentTargetId(targetId: StoredDeploymentState["targetId"]): RemoteDeploymentTargetId {
  if (targetId === "local") {
    throw new Error("Turret authorization is only available for published testnet deployments.");
  }

  return targetId;
}

function isTurretLookupNode(value: unknown): value is TurretLookupNode {
  return isRecord(value);
}

function findFirstStringAtKeys(input: unknown, keys: readonly string[]): string | null {
  const value = findFirstValueAtKeys(input, keys);

  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNullable<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

function isSuiAddress(value: string | null): value is string {
  return value !== null && /^0x[a-f0-9]+$/i.test(value);
}