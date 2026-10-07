interface WorldApiEnvelope<TItem> {
  readonly data?: readonly TItem[];
}

export interface WorldApiListOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly signal?: AbortSignal;
  readonly fetchFn?: typeof fetch;
}

export interface WorldApiShipRecord {
  readonly classId?: unknown;
  readonly className?: unknown;
  readonly description?: unknown;
  readonly id?: unknown;
  readonly name?: unknown;
}

export interface WorldApiTribeRecord {
  readonly description?: unknown;
  readonly id?: unknown;
  readonly name?: unknown;
  readonly nameShort?: unknown;
  readonly taxRate?: unknown;
  readonly tribeUrl?: unknown;
}

const WORLD_API_BASE_URL = "https://world-api-stillness.live.pub.evefrontier.com";

/**
 * Resolve the documented World API base URL used for reference lookups.
 */
export function getWorldApiBaseUrl(): string {
  return WORLD_API_BASE_URL;
}

/**
 * Fetch the documented `/v2/ships` collection from World API.
 */
export async function fetchWorldApiShips(input: WorldApiListOptions = {}): Promise<readonly WorldApiShipRecord[]> {
  return fetchWorldApiList<WorldApiShipRecord>("/v2/ships", input);
}

/**
 * Fetch the documented `/v2/tribes` collection from World API.
 */
export async function fetchWorldApiTribes(input: WorldApiListOptions = {}): Promise<readonly WorldApiTribeRecord[]> {
  return fetchWorldApiList<WorldApiTribeRecord>("/v2/tribes", input);
}

async function fetchWorldApiList<TItem>(path: string, input: WorldApiListOptions): Promise<readonly TItem[]> {
  return fetchWorldApiCollection<TItem>(buildWorldApiUrl(path, input), input);
}

/** Fetch a collection without treating failed or malformed responses as empty data. */
export async function fetchWorldApiCollection<TItem>(
  url: string,
  input: Pick<WorldApiListOptions, "fetchFn" | "signal"> = {},
): Promise<readonly TItem[]> {
  const fetchFn = input.fetchFn ?? ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  try {
    const response = await fetchFn(url, { signal: input.signal });
    if (!response.ok) {
      throw new Error(`Request failed with status ${String(response.status)}`);
    }
    const rawPayload: unknown = await response.json();
    if (typeof rawPayload !== "object" || rawPayload === null || !Array.isArray((rawPayload as WorldApiEnvelope<unknown>).data)) {
      throw new Error("Invalid collection response: expected a data array.");
    }
    return (rawPayload as { readonly data: readonly TItem[] }).data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to retrieve collection.";
    throw new Error(`World API lookup failed. ${message}`, { cause: error });
  }
}

export function buildWorldApiUrl(path: string, input: Pick<WorldApiListOptions, "limit" | "offset"> = {}): string {
  const url = new URL(path, `${WORLD_API_BASE_URL}/`);

  if (typeof input.limit === "number") {
    url.searchParams.set("limit", String(input.limit));
  }

  if (typeof input.offset === "number") {
    url.searchParams.set("offset", String(input.offset));
  }

  return url.toString();
}