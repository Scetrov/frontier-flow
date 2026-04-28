import { useCallback, useEffect, useRef, useState } from "react";

import type { GitHubAccessState, GitHubFailureClassification, PendingGitHubRetryContext } from "../types/githubAuth";
import { beginGitHubOAuthPopup, classifyGitHubErrorMessage, validateGitHubToken } from "../utils/githubAuthClient";
import {
  clearGitHubPublicAuthState,
  clearPendingGitHubRetryContext,
  createAnonymousGitHubAccessState,
  loadGitHubPublicAuthState,
  loadPendingGitHubRetryContext,
  publishGitHubAuthSyncSignal,
  saveGitHubPublicAuthState,
  savePendingGitHubRetryContext,
  subscribeToGitHubAuthSync,
} from "../utils/githubAuthStorage";

interface UseGitHubAuthResult {
  readonly accessState: GitHubAccessState;
  readonly accessToken: string | null;
  readonly hasClientConfiguration: boolean;
  readonly pendingRetryContext: PendingGitHubRetryContext | null;
  readonly beginSignIn: () => Promise<boolean>;
  readonly clearFailure: () => void;
  readonly reportFailure: (failure: GitHubFailureClassification) => void;
  readonly setPendingRetryContext: (context: PendingGitHubRetryContext | null) => void;
  readonly signOut: () => void;
}

interface AccessTokenRef {
  current: string | null;
}

function publishAccessStateChange(mode: GitHubAccessState["mode"]): void {
  publishGitHubAuthSyncSignal({
    event: "github-auth-state-changed",
    changedAt: Date.now(),
    mode,
  });
}

function persistPublicAccessState(nextState: GitHubAccessState): void {
  saveGitHubPublicAuthState(nextState);
  publishAccessStateChange(nextState.mode);
}

function clearInMemoryAccessToken(
  accessTokenRef: AccessTokenRef,
  setAccessToken: (token: string | null) => void,
): void {
  accessTokenRef.current = null;
  setAccessToken(null);
}

function loadInitialAccessState(): GitHubAccessState {
  const persistedState = loadGitHubPublicAuthState();
  return persistedState !== null && persistedState.mode !== "authenticated"
    ? persistedState
    : createAnonymousGitHubAccessState();
}

function computeIndicatorVariant(
  mode: GitHubAccessState["mode"],
  lastFailureKind: GitHubAccessState["lastFailureKind"],
): GitHubAccessState["indicatorVariant"] {
  if (mode === "authenticated") {
    return lastFailureKind === "rate-limit" ? "warning" : "active";
  }

  if (mode === "reauth-required") {
    return "warning";
  }

  return lastFailureKind === null ? "neutral" : "error";
}

function createAuthenticatingState(currentState: GitHubAccessState): GitHubAccessState {
  return buildAccessState({
    mode: "authenticating",
    grantedScopes: currentState.grantedScopes,
    verifiedAt: currentState.verifiedAt,
    loginLabel: currentState.loginLabel,
    lastFailureKind: null,
    lastFailureMessage: null,
  });
}

function createAnonymousFailureState(lastFailureKind: GitHubAccessState["lastFailureKind"], lastFailureMessage: string | null): GitHubAccessState {
  return buildAccessState({
    mode: "anonymous",
    lastFailureKind,
    lastFailureMessage,
  });
}

function createAuthenticatedState(validationResult: Awaited<ReturnType<typeof validateGitHubToken>>): GitHubAccessState {
  return buildAccessState({
    mode: "authenticated",
    grantedScopes: validationResult.grantedScopes,
    verifiedAt: validationResult.verifiedAt,
    loginLabel: validationResult.loginLabel,
    lastFailureKind: null,
    lastFailureMessage: null,
  });
}

function useGitHubAuthSyncSubscription(
  accessTokenRef: AccessTokenRef,
  setAccessToken: (token: string | null) => void,
  setAccessState: (state: GitHubAccessState) => void,
): void {
  useEffect(() => subscribeToGitHubAuthSync((signal) => {
    if (signal.mode === "anonymous") {
      clearInMemoryAccessToken(accessTokenRef, setAccessToken);
      setAccessState(createAnonymousGitHubAccessState());
      return;
    }

    const publicState = loadGitHubPublicAuthState();
    if (publicState === null) {
      return;
    }

    if (signal.mode === "reauth-required") {
      clearInMemoryAccessToken(accessTokenRef, setAccessToken);
      setAccessState(publicState);
      return;
    }

    if (accessTokenRef.current !== null) {
      setAccessState(publicState);
    }
  }), [accessTokenRef, setAccessState, setAccessToken]);
}

function buildAccessState(input: Partial<GitHubAccessState> & Pick<GitHubAccessState, "mode">): GitHubAccessState {
  const anonymousState = createAnonymousGitHubAccessState();
  const lastFailureKind = input.lastFailureKind ?? null;
  const lastFailureMessage = input.lastFailureMessage ?? null;
  const indicatorVariant = input.indicatorVariant ?? computeIndicatorVariant(input.mode, lastFailureKind);

  return {
    ...anonymousState,
    ...input,
    indicatorVariant,
    grantedScopes: input.grantedScopes ?? anonymousState.grantedScopes,
    verifiedAt: input.verifiedAt ?? anonymousState.verifiedAt,
    loginLabel: input.loginLabel ?? anonymousState.loginLabel,
    lastFailureKind,
    lastFailureMessage,
  };
}

function toReauthState(currentState: GitHubAccessState, failure: GitHubFailureClassification): GitHubAccessState {
  return buildAccessState({
    mode: failure.kind === "bad-credentials" || failure.kind === "insufficient-permission" ? "reauth-required" : currentState.mode,
    grantedScopes: currentState.grantedScopes,
    verifiedAt: currentState.verifiedAt,
    loginLabel: currentState.loginLabel,
    lastFailureKind: failure.kind,
    lastFailureMessage: null,
  });
}

/**
 * Manage the session-scoped GitHub OAuth token and the public auth UI state.
 */
export function useGitHubAuth(): UseGitHubAuthResult {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID?.trim() ?? "";
  const hasClientConfiguration = clientId.length > 0;
  const [accessState, setAccessState] = useState<GitHubAccessState>(loadInitialAccessState);
  const [pendingRetryContext, setPendingRetryContextState] = useState<PendingGitHubRetryContext | null>(() => loadPendingGitHubRetryContext());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const persistAccessState = useCallback((nextState: GitHubAccessState) => {
    setAccessState(nextState);
    persistPublicAccessState(nextState);
  }, []);

  const setPendingRetryContext = useCallback((context: PendingGitHubRetryContext | null) => {
    setPendingRetryContextState(context);

    if (context === null) {
      clearPendingGitHubRetryContext();
      return;
    }

    savePendingGitHubRetryContext(context);
  }, []);

  const clearFailure = useCallback(() => {
    setAccessState((currentState) => {
      const nextState = buildAccessState({
        mode: currentState.mode === "reauth-required" ? "anonymous" : currentState.mode,
        grantedScopes: currentState.grantedScopes,
        verifiedAt: currentState.verifiedAt,
        loginLabel: currentState.loginLabel,
        lastFailureKind: null,
        lastFailureMessage: null,
      });
      persistPublicAccessState(nextState);
      return nextState;
    });
  }, []);

  const signOut = useCallback(() => {
    clearInMemoryAccessToken(accessTokenRef, setAccessToken);
    setPendingRetryContext(null);
    clearGitHubPublicAuthState();
    const anonymousState = createAnonymousGitHubAccessState();
    setAccessState(anonymousState);
    publishAccessStateChange(anonymousState.mode);
  }, [setPendingRetryContext]);

  const reportFailure = useCallback((failure: GitHubFailureClassification) => {
    setAccessState((currentState) => {
      const nextState = toReauthState(currentState, failure);
      persistPublicAccessState(nextState);

      if (nextState.mode === "reauth-required") {
        clearInMemoryAccessToken(accessTokenRef, setAccessToken);
      }

      return nextState;
    });
  }, []);

  const beginSignIn = useCallback(async () => {
    if (!hasClientConfiguration) {
      return false;
    }

    setAccessState((currentState) => createAuthenticatingState(currentState));

    try {
      const popupPayload = await beginGitHubOAuthPopup({ clientId });
      if (popupPayload.type === "ff:github-auth:error") {
        persistAccessState(createAnonymousFailureState("unknown", popupPayload.message));
        return false;
      }

      const validationResult = await validateGitHubToken(popupPayload.token);
      accessTokenRef.current = popupPayload.token;
      setAccessToken(popupPayload.token);
      persistAccessState(createAuthenticatedState(validationResult));
      return true;
    } catch (error: unknown) {
      const parsedFailure = error instanceof Error ? classifyGitHubErrorMessage(error.message) : null;
      persistAccessState(createAnonymousFailureState(parsedFailure?.kind ?? "unknown", null));
      return false;
    }
  }, [clientId, hasClientConfiguration, persistAccessState]);

  useGitHubAuthSyncSubscription(accessTokenRef, setAccessToken, setAccessState);

  return {
    accessState,
    accessToken,
    hasClientConfiguration,
    pendingRetryContext,
    beginSignIn,
    clearFailure,
    reportFailure,
    setPendingRetryContext,
    signOut,
  };
}

export default useGitHubAuth;