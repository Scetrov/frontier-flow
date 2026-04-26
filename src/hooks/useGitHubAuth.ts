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

function buildAccessState(input: Partial<GitHubAccessState> & Pick<GitHubAccessState, "mode">): GitHubAccessState {
  const anonymousState = createAnonymousGitHubAccessState();
  const lastFailureKind = input.lastFailureKind ?? null;
  const lastFailureMessage = input.lastFailureMessage ?? null;
  const indicatorVariant = input.indicatorVariant ?? (
    input.mode === "authenticated"
      ? lastFailureKind === "rate-limit"
        ? "warning"
        : "active"
      : input.mode === "reauth-required"
        ? "warning"
        : lastFailureKind === null
          ? "neutral"
          : "error"
  );

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
  const [accessState, setAccessState] = useState<GitHubAccessState>(() => {
    const persistedState = loadGitHubPublicAuthState();
    return persistedState !== null && persistedState.mode !== "authenticated"
      ? persistedState
      : createAnonymousGitHubAccessState();
  });
  const [pendingRetryContext, setPendingRetryContextState] = useState<PendingGitHubRetryContext | null>(() => loadPendingGitHubRetryContext());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const persistAccessState = useCallback((nextState: GitHubAccessState) => {
    setAccessState(nextState);
    saveGitHubPublicAuthState(nextState);
    publishGitHubAuthSyncSignal({
      event: "github-auth-state-changed",
      changedAt: Date.now(),
      mode: nextState.mode,
    });
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
      saveGitHubPublicAuthState(nextState);
      publishGitHubAuthSyncSignal({
        event: "github-auth-state-changed",
        changedAt: Date.now(),
        mode: nextState.mode,
      });
      return nextState;
    });
  }, []);

  const signOut = useCallback(() => {
    accessTokenRef.current = null;
    setAccessToken(null);
    setPendingRetryContext(null);
    clearGitHubPublicAuthState();
    const anonymousState = createAnonymousGitHubAccessState();
    setAccessState(anonymousState);
    publishGitHubAuthSyncSignal({
      event: "github-auth-state-changed",
      changedAt: Date.now(),
      mode: anonymousState.mode,
    });
  }, [setPendingRetryContext]);

  const reportFailure = useCallback((failure: GitHubFailureClassification) => {
    setAccessState((currentState) => {
      const nextState = toReauthState(currentState, failure);
      saveGitHubPublicAuthState(nextState);
      publishGitHubAuthSyncSignal({
        event: "github-auth-state-changed",
        changedAt: Date.now(),
        mode: nextState.mode,
      });

      if (nextState.mode === "reauth-required") {
        accessTokenRef.current = null;
        setAccessToken(null);
      }

      return nextState;
    });
  }, []);

  const beginSignIn = useCallback(async () => {
    if (!hasClientConfiguration) {
      return false;
    }

    setAccessState((currentState) => buildAccessState({
      mode: "authenticating",
      grantedScopes: currentState.grantedScopes,
      verifiedAt: currentState.verifiedAt,
      loginLabel: currentState.loginLabel,
      lastFailureKind: null,
      lastFailureMessage: null,
    }));

    try {
      const popupPayload = await beginGitHubOAuthPopup({ clientId });
      if (popupPayload.type === "ff:github-auth:error") {
        persistAccessState(buildAccessState({
          mode: "anonymous",
          lastFailureKind: "unknown",
          lastFailureMessage: popupPayload.message,
        }));
        return false;
      }

      const validationResult = await validateGitHubToken(popupPayload.token);
      accessTokenRef.current = popupPayload.token;
      setAccessToken(popupPayload.token);
      persistAccessState(buildAccessState({
        mode: "authenticated",
        grantedScopes: validationResult.grantedScopes,
        verifiedAt: validationResult.verifiedAt,
        loginLabel: validationResult.loginLabel,
        lastFailureKind: null,
        lastFailureMessage: null,
      }));
      return true;
    } catch (error: unknown) {
      const parsedFailure = error instanceof Error ? classifyGitHubErrorMessage(error.message) : null;
      persistAccessState(buildAccessState({
        mode: "anonymous",
        lastFailureKind: parsedFailure?.kind ?? "unknown",
        lastFailureMessage: null,
      }));
      return false;
    }
  }, [clientId, hasClientConfiguration, persistAccessState]);

  useEffect(() => subscribeToGitHubAuthSync((signal) => {
    if (signal.mode === "anonymous") {
      accessTokenRef.current = null;
      setAccessToken(null);
      setAccessState(createAnonymousGitHubAccessState());
      return;
    }

    const publicState = loadGitHubPublicAuthState();
    if (publicState === null) {
      return;
    }

    if (signal.mode === "reauth-required") {
      accessTokenRef.current = null;
      setAccessToken(null);
      setAccessState(publicState);
      return;
    }

    if (accessTokenRef.current !== null) {
      setAccessState(publicState);
    }
  }), []);

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