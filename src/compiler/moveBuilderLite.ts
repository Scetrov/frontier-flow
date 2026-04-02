import type * as MoveBuilderLiteModule from "@zktx.io/sui-move-builder/lite";

export type BuildMovePackageFn = typeof MoveBuilderLiteModule.buildMovePackage;
export type FetchPackageFromGitHubFn = typeof MoveBuilderLiteModule.fetchPackageFromGitHub;
export type GetSuiMoveVersionFn = typeof MoveBuilderLiteModule.getSuiMoveVersion;
export type InitMoveCompilerFn = typeof MoveBuilderLiteModule.initMoveCompiler;
export type ResolveDependenciesFn = typeof MoveBuilderLiteModule.resolveDependencies;

interface MoveBuilderLiteRawWasmModule {
  readonly default: (options?: { readonly module_or_path?: string | URL | BufferSource }) => Promise<unknown>;
}

interface CachedRawGithubResponse {
  readonly body: string;
  readonly headers: readonly [string, string][];
  readonly status: number;
  readonly statusText: string;
}

interface TimedCachedRawGithubResponse extends CachedRawGithubResponse {
  readonly cachedAt: number;
}

const MOVE_BUILDER_LITE_WASM_SHA256 = "710212f879fef4feb0bf6932a8ecece1323ca3b675b07691df927977492105a0";
const LOCAL_UPSTREAM_SOURCE_ROOT = "upstream-sources";
const RAW_GITHUB_HOSTNAME = "raw.githubusercontent.com";
const RAW_GITHUB_RATE_LIMIT_RETRY_MS = 30_000;
const MOVE_BUILDER_VERBOSE_LOG_PREFIXES = [
  "[Compile]",
  "[V3 Files]",
  "[V4 Files]",
  "[V4 Load]",
  "[Lockfile]",
] as const;

let moveBuilderLitePromise: Promise<typeof MoveBuilderLiteModule> | null = null;
let moveBuilderLiteIntegrityPromise: Promise<void> | null = null;
let moveBuilderLiteRawWasmPromise: Promise<MoveBuilderLiteRawWasmModule> | null = null;
let moveBuilderLiteRawWasmInitialisationPromise: Promise<void> | null = null;
let moveBuilderConsoleLogPatchDepth = 0;
let originalMoveBuilderConsoleLog: ((...args: unknown[]) => void) | null = null;
let moveBuilderFetchPatchDepth = 0;
let originalMoveBuilderFetch: typeof fetch | null = null;
const rawGithubResponseCache = new Map<string, CachedRawGithubResponse>();
const rawGithubRateLimitCache = new Map<string, TimedCachedRawGithubResponse>();
const rawGithubInFlightRequests = new Map<string, Promise<CachedRawGithubResponse>>();

export const moveBuilderLiteWasmUrl = new URL(
  "../../node_modules/@zktx.io/sui-move-builder/dist/lite/sui_move_wasm_bg.wasm",
  import.meta.url,
).href;

function toHexDigest(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0")).join("");
}

function isMoveBuilderDebugEnabled(): boolean {
  if (import.meta.env.VITE_DEBUG === "true") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("DEBUG") === "true";
}

function isMoveBuilderVerboseLog(args: readonly unknown[]): boolean {
  const firstArgument = args[0];

  return typeof firstArgument === "string"
    && MOVE_BUILDER_VERBOSE_LOG_PREFIXES.some((prefix) => firstArgument.startsWith(prefix));
}

function isRequestObject(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function createAssetUrl(relativePath: string): string {
  const baseUrl = import.meta.env.BASE_URL;
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}${relativePath}`;
}

function shouldUseRawGithubFetchCache(): boolean {
  return !(typeof window === "undefined" && "Bun" in globalThis);
}

function getRawGithubRequestKey(input: RequestInfo | URL, init?: RequestInit): string | null {
  const method = init?.method ?? (isRequestObject(input) ? input.method : "GET");
  if (method.toUpperCase() !== "GET") {
    return null;
  }

  const requestUrl = isRequestObject(input)
    ? input.url
    : input instanceof URL
      ? input.toString()
      : input;

  const url = new URL(requestUrl, "http://localhost");
  return url.hostname === RAW_GITHUB_HOSTNAME ? url.toString() : null;
}

function getLocalRawGithubMirrorRelativePath(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  if (url.hostname !== RAW_GITHUB_HOSTNAME) {
    return null;
  }

  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 4) {
    return null;
  }

  const [owner, repo, revision, ...rest] = segments;

  return `${LOCAL_UPSTREAM_SOURCE_ROOT}/${owner}/${repo}/${revision}/${rest.join("/")}`;
}

async function toCachedRawGithubResponse(response: Response): Promise<CachedRawGithubResponse> {
  return {
    body: await response.text(),
    headers: Array.from(response.headers.entries()),
    status: response.status,
    statusText: response.statusText,
  };
}

function createResponseFromCache(entry: CachedRawGithubResponse): Response {
  return new Response(entry.body, {
    status: entry.status,
    statusText: entry.statusText,
    headers: new Headers(Array.from(entry.headers)),
  });
}

async function fetchFromLocalRawGithubMirror(
  originalFetchImpl: typeof fetch,
  cacheKey: string,
): Promise<CachedRawGithubResponse | null> {
  const relativePath = getLocalRawGithubMirrorRelativePath(cacheKey);
  if (relativePath === null) {
    return null;
  }

  const response = await originalFetchImpl(createAssetUrl(relativePath));
  if (response.status === 404 || !response.ok) {
    return null;
  }

  const cachedEntry = await toCachedRawGithubResponse(response);
  rawGithubResponseCache.set(cacheKey, cachedEntry);
  return cachedEntry;
}

function isRateLimitedResponse(entry: CachedRawGithubResponse): boolean {
  const normalizedBody = entry.body.toLowerCase();
  const normalizedStatusText = entry.statusText.toLowerCase();
  return entry.status === 429
    || (entry.status === 403 && (normalizedBody.includes("rate limit") || normalizedStatusText.includes("rate limit")))
    || normalizedBody.includes("too many requests")
    || normalizedStatusText.includes("too many requests");
}

function getCachedRateLimitedResponse(cacheKey: string): CachedRawGithubResponse | null {
  const cachedEntry = rawGithubRateLimitCache.get(cacheKey);
  if (cachedEntry === undefined) {
    return null;
  }

  if (Date.now() - cachedEntry.cachedAt >= RAW_GITHUB_RATE_LIMIT_RETRY_MS) {
    rawGithubRateLimitCache.delete(cacheKey);
    return null;
  }

  return cachedEntry;
}

async function fetchWithRawGithubCache(
  originalFetchImpl: typeof fetch,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const cacheKey = getRawGithubRequestKey(input, init);
  if (cacheKey === null) {
    return originalFetchImpl(input, init);
  }

  const cachedResponse = rawGithubResponseCache.get(cacheKey);
  if (cachedResponse !== undefined) {
    return createResponseFromCache(cachedResponse);
  }

  const mirroredResponse = await fetchFromLocalRawGithubMirror(originalFetchImpl, cacheKey);
  if (mirroredResponse !== null) {
    return createResponseFromCache(mirroredResponse);
  }

  const cachedRateLimitedResponse = getCachedRateLimitedResponse(cacheKey);
  if (cachedRateLimitedResponse !== null) {
    return createResponseFromCache(cachedRateLimitedResponse);
  }

  const inFlightRequest = rawGithubInFlightRequests.get(cacheKey);
  if (inFlightRequest !== undefined) {
    return createResponseFromCache(await inFlightRequest);
  }

  const pendingRequest = (async () => {
    const response = await originalFetchImpl(input, init);
    const cachedEntry = await toCachedRawGithubResponse(response);

    if (response.ok) {
      rawGithubResponseCache.set(cacheKey, cachedEntry);
    } else if (isRateLimitedResponse(cachedEntry)) {
      rawGithubRateLimitCache.set(cacheKey, {
        ...cachedEntry,
        cachedAt: Date.now(),
      });
    }

    return cachedEntry;
  })().finally(() => {
    rawGithubInFlightRequests.delete(cacheKey);
  });

  rawGithubInFlightRequests.set(cacheKey, pendingRequest);
  return createResponseFromCache(await pendingRequest);
}

async function withRawGithubFetchCache<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof globalThis.fetch !== "function" || !shouldUseRawGithubFetchCache()) {
    return operation();
  }

  if (moveBuilderFetchPatchDepth === 0) {
    originalMoveBuilderFetch = globalThis.fetch;
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (originalMoveBuilderFetch === null) {
        throw new Error("Move builder fetch wrapper was not initialised.");
      }

      return fetchWithRawGithubCache(originalMoveBuilderFetch, input, init);
    }) as typeof fetch;
  }

  moveBuilderFetchPatchDepth += 1;

  try {
    return await operation();
  } finally {
    moveBuilderFetchPatchDepth -= 1;

    if (moveBuilderFetchPatchDepth === 0 && originalMoveBuilderFetch !== null) {
      globalThis.fetch = originalMoveBuilderFetch;
      originalMoveBuilderFetch = null;
    }
  }
}

async function withMoveBuilderLogFilter<T>(operation: () => Promise<T>): Promise<T> {
  const runOperation = () => withRawGithubFetchCache(operation);

  if (isMoveBuilderDebugEnabled()) {
    return runOperation();
  }

  if (moveBuilderConsoleLogPatchDepth === 0) {
    originalMoveBuilderConsoleLog = console.log as unknown as (...args: unknown[]) => void;
    console.log = (...args: unknown[]) => {
      if (isMoveBuilderVerboseLog(args)) {
        return;
      }

      originalMoveBuilderConsoleLog?.(...args);
    };
  }

  moveBuilderConsoleLogPatchDepth += 1;

  try {
    return await runOperation();
  } finally {
    moveBuilderConsoleLogPatchDepth -= 1;

    if (moveBuilderConsoleLogPatchDepth === 0 && originalMoveBuilderConsoleLog !== null) {
      console.log = originalMoveBuilderConsoleLog;
      originalMoveBuilderConsoleLog = null;
    }
  }
}

function wrapMoveBuilderLiteModule(module: typeof MoveBuilderLiteModule): typeof MoveBuilderLiteModule {
  return {
    ...module,
    buildMovePackage: async (input) => withMoveBuilderLogFilter(() => module.buildMovePackage(input)),
    // Note: don't wrap `fetchPackageFromGitHub` since its typing is not
    // reliably available and wrapping can cause unsafe any[] spread errors
    // under strict lint rules. Use the original implementation directly.
    fetchPackageFromGitHub: module.fetchPackageFromGitHub,
    resolveDependencies: async (input) => withMoveBuilderLogFilter(() => module.resolveDependencies(input)),
  };
}

export async function loadMoveBuilderLite(): Promise<typeof MoveBuilderLiteModule> {
  if (moveBuilderLitePromise === null) {
    moveBuilderLitePromise = (import("@zktx.io/sui-move-builder/lite") as Promise<typeof MoveBuilderLiteModule>)
      .then((module) => wrapMoveBuilderLiteModule(module));
  }

  return moveBuilderLitePromise;
}

async function loadMoveBuilderLiteRawWasm(): Promise<MoveBuilderLiteRawWasmModule> {
  if (moveBuilderLiteRawWasmPromise === null) {
    moveBuilderLiteRawWasmPromise = import("../../node_modules/@zktx.io/sui-move-builder/dist/lite/sui_move_wasm.js") as Promise<MoveBuilderLiteRawWasmModule>;
  }

  return moveBuilderLiteRawWasmPromise;
}

export async function prewarmMoveBuilderLiteWasm(wasm: string | URL = moveBuilderLiteWasmUrl): Promise<void> {
  if (moveBuilderLiteRawWasmInitialisationPromise === null) {
    moveBuilderLiteRawWasmInitialisationPromise = loadMoveBuilderLiteRawWasm().then(async (module) => {
      await module.default({ module_or_path: wasm });
    }).catch((error: unknown) => {
      moveBuilderLiteRawWasmInitialisationPromise = null;
      throw error;
    });
  }

  await moveBuilderLiteRawWasmInitialisationPromise;
}

export async function verifyMoveBuilderLiteIntegrity(): Promise<void> {
  if (moveBuilderLiteIntegrityPromise === null) {
    moveBuilderLiteIntegrityPromise = (async () => {
      const response = await fetch(moveBuilderLiteWasmUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch bundled Move compiler WASM for verification: ${String(response.status)} ${response.statusText}`.trim());
      }

      const buffer = await response.arrayBuffer();
      const digestBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
      const digest = toHexDigest(digestBuffer);

      if (digest !== MOVE_BUILDER_LITE_WASM_SHA256) {
        throw new Error(`Bundled Move compiler checksum mismatch: expected ${MOVE_BUILDER_LITE_WASM_SHA256}, received ${digest}`);
      }
    })().catch((error: unknown) => {
      moveBuilderLiteIntegrityPromise = null;
      throw error;
    });
  }

  await moveBuilderLiteIntegrityPromise;
}

export function resetMoveBuilderLiteForTests(): void {
  if (originalMoveBuilderConsoleLog !== null) {
    console.log = originalMoveBuilderConsoleLog;
  }

  if (originalMoveBuilderFetch !== null) {
    globalThis.fetch = originalMoveBuilderFetch;
  }

  moveBuilderLitePromise = null;
  moveBuilderLiteIntegrityPromise = null;
  moveBuilderLiteRawWasmPromise = null;
  moveBuilderLiteRawWasmInitialisationPromise = null;
  moveBuilderConsoleLogPatchDepth = 0;
  originalMoveBuilderConsoleLog = null;
  moveBuilderFetchPatchDepth = 0;
  originalMoveBuilderFetch = null;
  rawGithubResponseCache.clear();
  rawGithubRateLimitCache.clear();
  rawGithubInFlightRequests.clear();
}