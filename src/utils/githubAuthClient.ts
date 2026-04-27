import type {
  GitHubAuthPopupPayload,
  GitHubFailureClassification,
  GitHubTokenValidationResult,
} from "../types/githubAuth";
import { GITHUB_API_VERSION } from "./githubApi";
import { DEFAULT_GITHUB_AUTH_CALLBACK_PATH, normalizeGitHubAuthCallbackPath } from "./githubAuthConfig";

const GITHUB_AUTHORIZE_ENDPOINT = "https://github.com/login/oauth/authorize";
const GITHUB_VALIDATE_ENDPOINT = "https://api.github.com/user";
const GITHUB_AUTH_STATE_COOKIE = "ff_github_auth_state";

interface BeginGitHubOAuthPopupOptions {
  readonly callbackPath?: string;
  readonly clientId: string;
  readonly document?: Document;
  readonly location?: Location;
  readonly openWindow?: Window["open"];
  readonly windowImpl?: Window;
}

interface GitHubPopupWindow extends Pick<Window, "close"> {
  readonly closed: boolean;
}

function parseHeaderNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function normalizeMessage(rawMessage: string): string {
  return rawMessage.trim().toLowerCase();
}

function hasAnyPattern(message: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

const RATE_LIMIT_PATTERNS = ["rate limit", "too many requests"] as const;
const BAD_CREDENTIALS_PATTERNS = ["bad credentials", "requires authentication"] as const;
const INSUFFICIENT_PERMISSION_PATTERNS = ["resource not accessible", "insufficient", "forbidden"] as const;
const NETWORK_PATTERNS = ["failed to fetch", "network"] as const;

function isRateLimitResponse(status: number, rateLimitRemaining: number | null, combinedMessage: string): boolean {
  return status === 429 || rateLimitRemaining === 0 || hasAnyPattern(combinedMessage, RATE_LIMIT_PATTERNS);
}

function isBadCredentialsResponse(status: number, combinedMessage: string): boolean {
  return status === 401 || hasAnyPattern(combinedMessage, BAD_CREDENTIALS_PATTERNS);
}

function isInsufficientPermissionResponse(status: number, combinedMessage: string): boolean {
  return status === 403 || hasAnyPattern(combinedMessage, INSUFFICIENT_PERMISSION_PATTERNS);
}

function getFallbackFailureKind(status: number): GitHubFailureClassification["kind"] {
  return status >= 500 ? "network" : "unknown";
}

function isRateLimitMessage(normalizedMessage: string, hasStatus429: boolean): boolean {
  return hasStatus429 || hasAnyPattern(normalizedMessage, RATE_LIMIT_PATTERNS);
}

function isBadCredentialsMessage(normalizedMessage: string, hasStatus401: boolean): boolean {
  return hasStatus401 || hasAnyPattern(normalizedMessage, [BAD_CREDENTIALS_PATTERNS[0]]);
}

function isInsufficientPermissionMessage(normalizedMessage: string, hasStatus403: boolean): boolean {
  return hasStatus403 || hasAnyPattern(normalizedMessage, [INSUFFICIENT_PERMISSION_PATTERNS[0], INSUFFICIENT_PERMISSION_PATTERNS[2]]);
}

function getMessageKey(kind: GitHubFailureClassification["kind"]): GitHubFailureClassification["messageKey"] {
  return `github.${kind}`;
}

function parseGrantedScopes(scopeHeader: string): readonly string[] {
  return scopeHeader
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

function isSecureLocation(location: Location): boolean {
  return location.protocol === "https:";
}

function setAuthStateCookie(document: Document, callbackPath: string, state: string, location: Location): void {
  const secureAttribute = isSecureLocation(location) ? "; Secure" : "";
  document.cookie = `${GITHUB_AUTH_STATE_COOKIE}=${encodeURIComponent(state)}; Max-Age=300; Path=${callbackPath}; SameSite=Lax${secureAttribute}`;
}

function clearAuthStateCookie(document: Document, callbackPath: string, location: Location): void {
  const secureAttribute = isSecureLocation(location) ? "; Secure" : "";
  document.cookie = `${GITHUB_AUTH_STATE_COOKIE}=; Max-Age=0; Path=${callbackPath}; SameSite=Lax${secureAttribute}`;
}

function createGitHubAuthorizeUrl(input: {
  readonly callbackPath: string;
  readonly clientId: string;
  readonly location: Location;
  readonly state: string;
}): string {
  const redirectUrl = new URL(input.callbackPath, input.location.origin).toString();
  const authorizeUrl = new URL(GITHUB_AUTHORIZE_ENDPOINT);
  authorizeUrl.searchParams.set("client_id", input.clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUrl);
  authorizeUrl.searchParams.set("state", input.state);
  return authorizeUrl.toString();
}

function isGitHubAuthPopupPayload(value: unknown): value is GitHubAuthPopupPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<GitHubAuthPopupPayload>;
  return candidate.type === "ff:github-auth:success" || candidate.type === "ff:github-auth:error";
}

async function readResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * Classify a GitHub API failure from response metadata and payload text.
 */
export async function classifyGitHubApiFailure(response: Response): Promise<GitHubFailureClassification> {
  const body = await readResponseText(response.clone());
  const normalizedBody = normalizeMessage(body);
  const normalizedStatusText = normalizeMessage(response.statusText);
  const combinedMessage = `${String(response.status)} ${normalizedStatusText} ${normalizedBody}`;
  const rateLimitRemaining = parseHeaderNumber(response.headers.get("x-ratelimit-remaining"));
  const resetAtSeconds = parseHeaderNumber(response.headers.get("x-ratelimit-reset"));
  const resetAt = resetAtSeconds === null ? null : resetAtSeconds * 1000;

  if (isRateLimitResponse(response.status, rateLimitRemaining, combinedMessage)) {
    return {
      httpStatus: response.status,
      kind: "rate-limit",
      rateLimitRemaining,
      resetAt,
      messageKey: getMessageKey("rate-limit"),
    };
  }

  if (isBadCredentialsResponse(response.status, combinedMessage)) {
    return {
      httpStatus: response.status,
      kind: "bad-credentials",
      rateLimitRemaining,
      resetAt,
      messageKey: getMessageKey("bad-credentials"),
    };
  }

  if (isInsufficientPermissionResponse(response.status, combinedMessage)) {
    return {
      httpStatus: response.status,
      kind: "insufficient-permission",
      rateLimitRemaining,
      resetAt,
      messageKey: getMessageKey("insufficient-permission"),
    };
  }

  const fallbackFailureKind = getFallbackFailureKind(response.status);

  return {
    httpStatus: response.status,
    kind: fallbackFailureKind,
    rateLimitRemaining,
    resetAt,
    messageKey: getMessageKey(fallbackFailureKind),
  };
}

/**
 * Classify a GitHub-related failure from a thrown or serialized error message.
 */
export function classifyGitHubErrorMessage(rawMessage: string): GitHubFailureClassification | null {
  const normalizedMessage = normalizeMessage(rawMessage);
  const hasStatus429 = normalizedMessage.includes("429");
  const hasStatus401 = normalizedMessage.includes("401");
  const hasStatus403 = normalizedMessage.includes("403");

  if (normalizedMessage.length === 0) {
    return null;
  }

  if (isRateLimitMessage(normalizedMessage, hasStatus429)) {
    return {
      httpStatus: hasStatus429 ? 429 : 403,
      kind: "rate-limit",
      rateLimitRemaining: normalizedMessage.includes("remaining 0") ? 0 : null,
      resetAt: null,
      messageKey: getMessageKey("rate-limit"),
    };
  }

  if (isBadCredentialsMessage(normalizedMessage, hasStatus401)) {
    return {
      httpStatus: 401,
      kind: "bad-credentials",
      rateLimitRemaining: null,
      resetAt: null,
      messageKey: getMessageKey("bad-credentials"),
    };
  }

  if (isInsufficientPermissionMessage(normalizedMessage, hasStatus403)) {
    return {
      httpStatus: 403,
      kind: "insufficient-permission",
      rateLimitRemaining: null,
      resetAt: null,
      messageKey: getMessageKey("insufficient-permission"),
    };
  }

  if (hasAnyPattern(normalizedMessage, NETWORK_PATTERNS)) {
    return {
      httpStatus: 0,
      kind: "network",
      rateLimitRemaining: null,
      resetAt: null,
      messageKey: getMessageKey("network"),
    };
  }

  return null;
}

/**
 * Open the GitHub OAuth popup and resolve once the callback bridge posts back.
 */
export function beginGitHubOAuthPopup({
  callbackPath = import.meta.env.VITE_GITHUB_AUTH_CALLBACK_PATH ?? DEFAULT_GITHUB_AUTH_CALLBACK_PATH,
  clientId,
  document = window.document,
  location = window.location,
  openWindow = window.open.bind(window),
  windowImpl = window,
}: BeginGitHubOAuthPopupOptions): Promise<GitHubAuthPopupPayload> {
  const safeCallbackPath = normalizeGitHubAuthCallbackPath(callbackPath);
  const authState = globalThis.crypto.randomUUID();
  const authorizeUrl = createGitHubAuthorizeUrl({
    callbackPath: safeCallbackPath,
    clientId,
    location,
    state: authState,
  });

  setAuthStateCookie(document, safeCallbackPath, authState, location);

  const popup = openWindow(
    authorizeUrl,
    "ff-github-auth",
    "popup=yes,width=560,height=720,resizable=yes,scrollbars=yes",
  ) as GitHubPopupWindow | null;

  if (popup === null) {
    clearAuthStateCookie(document, safeCallbackPath, location);
    return Promise.reject(new Error("GitHub sign-in popup could not be opened."));
  }

  return new Promise<GitHubAuthPopupPayload>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (settled) {
        return;
      }

      settled = true;
      clearAuthStateCookie(document, safeCallbackPath, location);
      windowImpl.removeEventListener("message", handleMessage);
      windowImpl.clearInterval(popupPollId);
    };

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin || event.source !== popup || !isGitHubAuthPopupPayload(event.data)) {
        return;
      }

      cleanup();
      resolve(event.data);
    };

    const popupPollId = windowImpl.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("GitHub sign-in was cancelled before completion."));
      }
    }, 250);

    windowImpl.addEventListener("message", handleMessage);
  });
}

/**
 * Validate the exchanged GitHub token and capture non-secret session metadata.
 */
export async function validateGitHubToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GitHubTokenValidationResult> {
  const response = await fetchImpl(GITHUB_VALIDATE_ENDPOINT, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "frontier-flow",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    const failure = await classifyGitHubApiFailure(response.clone());
    throw new Error(JSON.stringify(failure));
  }

  const payload = await response.json() as {
    readonly id?: number;
    readonly login?: string;
  };
  const scopeHeader = response.headers.get("x-oauth-scopes") ?? "";

  return {
    scopeHeader,
    verifiedAt: Date.now(),
    loginLabel: typeof payload.login === "string" && payload.login.length > 0 ? payload.login : null,
    validatedUserId: typeof payload.id === "number" ? payload.id : null,
    grantedScopes: parseGrantedScopes(scopeHeader),
  };
}