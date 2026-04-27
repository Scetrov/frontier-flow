import type { GitHubAccessState, GitHubAuthSyncSignal, PendingGitHubRetryContext } from "../types/githubAuth";

export const GITHUB_AUTH_PUBLIC_STATE_STORAGE_KEY = "frontier-flow:github-auth:public-state";
export const GITHUB_AUTH_PENDING_RETRY_STORAGE_KEY = "frontier-flow:github-auth:pending-retry";
export const GITHUB_AUTH_SYNC_STORAGE_KEY = "frontier-flow:github-auth:sync";

function safeParseJson(value: string | null): unknown {
  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getLocalStorage(storage = typeof window === "undefined" ? undefined : window.localStorage): Storage | undefined {
  return storage;
}

function getSessionStorage(storage = typeof window === "undefined" ? undefined : window.sessionStorage): Storage | undefined {
  return storage;
}

/**
 * Create the anonymous GitHub auth state used before a session is validated.
 */
export function createAnonymousGitHubAccessState(): GitHubAccessState {
  return {
    mode: "anonymous",
    indicatorVariant: "neutral",
    grantedScopes: [],
    verifiedAt: null,
    loginLabel: null,
    lastFailureKind: null,
    lastFailureMessage: null,
  };
}

/**
 * Load the public, non-secret GitHub auth snapshot shared across tabs.
 */
export function loadGitHubPublicAuthState(storage = getLocalStorage()): GitHubAccessState | null {
  return safeParseJson(storage?.getItem(GITHUB_AUTH_PUBLIC_STATE_STORAGE_KEY) ?? null) as GitHubAccessState | null;
}

/**
 * Persist the public, non-secret GitHub auth snapshot shared across tabs.
 */
export function saveGitHubPublicAuthState(state: GitHubAccessState, storage = getLocalStorage()): void {
  storage?.setItem(GITHUB_AUTH_PUBLIC_STATE_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Remove the public GitHub auth snapshot.
 */
export function clearGitHubPublicAuthState(storage = getLocalStorage()): void {
  storage?.removeItem(GITHUB_AUTH_PUBLIC_STATE_STORAGE_KEY);
}

/**
 * Load the session-scoped blocked-workflow retry context.
 */
export function loadPendingGitHubRetryContext(storage = getSessionStorage()): PendingGitHubRetryContext | null {
  return safeParseJson(storage?.getItem(GITHUB_AUTH_PENDING_RETRY_STORAGE_KEY) ?? null) as PendingGitHubRetryContext | null;
}

/**
 * Persist the session-scoped blocked-workflow retry context.
 */
export function savePendingGitHubRetryContext(context: PendingGitHubRetryContext, storage = getSessionStorage()): void {
  storage?.setItem(GITHUB_AUTH_PENDING_RETRY_STORAGE_KEY, JSON.stringify(context));
}

/**
 * Remove the session-scoped blocked-workflow retry context.
 */
export function clearPendingGitHubRetryContext(storage = getSessionStorage()): void {
  storage?.removeItem(GITHUB_AUTH_PENDING_RETRY_STORAGE_KEY);
}

/**
 * Broadcast a non-secret GitHub auth state change to other tabs.
 */
export function publishGitHubAuthSyncSignal(signal: GitHubAuthSyncSignal, storage = getLocalStorage()): void {
  storage?.setItem(GITHUB_AUTH_SYNC_STORAGE_KEY, JSON.stringify(signal));
}

/**
 * Subscribe to non-secret GitHub auth state changes broadcast by sibling tabs.
 */
export function subscribeToGitHubAuthSync(
  callback: (signal: GitHubAuthSyncSignal) => void,
  win = typeof window === "undefined" ? undefined : window,
): () => void {
  if (win === undefined) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== GITHUB_AUTH_SYNC_STORAGE_KEY) {
      return;
    }

    const signal = safeParseJson(event.newValue) as GitHubAuthSyncSignal | null;
    if (signal?.event !== "github-auth-state-changed") {
      return;
    }

    callback(signal);
  };

  win.addEventListener("storage", handleStorage);

  return () => {
    win.removeEventListener("storage", handleStorage);
  };
}