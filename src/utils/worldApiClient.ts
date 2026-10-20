interface WorldApiEnvelope<TItem> {
  readonly data?: readonly TItem[];
  readonly metadata?: WorldApiPaginationMetadata;
}

interface WorldApiPaginationMetadata {
  readonly limit?: unknown;
  readonly offset?: unknown;
  readonly total?: unknown;
}

export interface WorldApiListOptions {
  readonly limit?: number;
  /**
   * Skip records before the page. Prefer a single large `limit`: the service drops two
   * records per unit of offset, so `offset=1` loses two tribes rather than one.
   */
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
 * Largest page size the World API accepts; `limit=1001` and above answer HTTP 400
 * `invalid pagination parameters`.
 *
 * Requests that omit `limit` receive the service default of 100 records in ascending
 * id order, which silently hides every tribe created after the hundredth. Reported
 * `metadata.total` is capped at `limit + 1`, so a truncated page looks complete.
 */
export const WORLD_API_MAX_PAGE_SIZE = 1000;

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
    const envelope = rawPayload as { readonly data: readonly TItem[]; readonly metadata?: WorldApiPaginationMetadata };
    warnWhenCollectionTruncated(url, envelope.metadata);
    return dedupeRecordsById(envelope.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to retrieve collection.";
    throw new Error(`World API lookup failed. ${message}`, { cause: error });
  }
}

/**
 * Resolve a World API collection URL, requesting the full collection unless the caller
 * asks for a narrower page. The default guards against the service's 100-record page,
 * which no response field reports as partial.
 */
export function buildWorldApiUrl(path: string, input: Pick<WorldApiListOptions, "limit" | "offset"> = {}): string {
  const url = new URL(path, `${WORLD_API_BASE_URL}/`);

  url.searchParams.set("limit", String(input.limit ?? WORLD_API_MAX_PAGE_SIZE));

  if (typeof input.offset === "number") {
    url.searchParams.set("offset", String(input.offset));
  }

  return url.toString();
}

/**
 * Collapse records repeating an `id`, keeping each id's first position and last value.
 *
 * World API answers `/v2/tribes` with `1000167` twice: the placeholder `NPC Corp 1000167`
 * in id order, then the resolved `Clonebank 86` appended after the final record. Taking the
 * later value keeps the resolved name, and collapsing them keeps option values unique.
 */
function dedupeRecordsById<TItem>(records: readonly TItem[]): readonly TItem[] {
  const positionById = new Map<string, number>();
  const deduped: TItem[] = [];

  for (const record of records) {
    const id = readRecordId(record);

    if (id === null) {
      deduped.push(record);
      continue;
    }

    const existingPosition = positionById.get(id);

    if (existingPosition === undefined) {
      positionById.set(id, deduped.length);
      deduped.push(record);
      continue;
    }

    deduped[existingPosition] = record;
  }

  return deduped;
}

function readRecordId(record: unknown): string | null {
  if (typeof record !== "object" || record === null) {
    return null;
  }

  const id = (record as { readonly id?: unknown }).id;

  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id);
  }

  return typeof id === "string" && id.length > 0 ? id : null;
}

/** Report a page the service truncated, since `metadata` never marks one as partial. */
function warnWhenCollectionTruncated(url: string, metadata: WorldApiPaginationMetadata | undefined): void {
  const total = asPositiveInteger(metadata?.total);
  const limit = asPositiveInteger(metadata?.limit);

  if (total === null || limit === null || total <= limit) {
    return;
  }

  console.warn(
    `World API truncated ${url}: at least ${String(total)} records exist for a limit of ${String(limit)}. `
    + `Offset paging drops records on this service, so request up to limit=${String(WORLD_API_MAX_PAGE_SIZE)} instead.`,
  );
}

function asPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}