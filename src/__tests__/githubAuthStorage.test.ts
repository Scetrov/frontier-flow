import { describe, expect, it, vi } from "vitest";

import type { GitHubAccessState, PendingGitHubRetryContext } from "../types/githubAuth";
import {
  GITHUB_AUTH_PENDING_RETRY_STORAGE_KEY,
  GITHUB_AUTH_PUBLIC_STATE_STORAGE_KEY,
  GITHUB_AUTH_SYNC_STORAGE_KEY,
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

describe("githubAuthStorage", () => {
  it("persists and clears the public non-secret auth state", () => {
    const state: GitHubAccessState = {
      ...createAnonymousGitHubAccessState(),
      mode: "authenticated",
      indicatorVariant: "active",
      grantedScopes: [],
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
    };

    saveGitHubPublicAuthState(state, window.localStorage);

    expect(loadGitHubPublicAuthState(window.localStorage)).toEqual(state);
    expect(window.localStorage.getItem(GITHUB_AUTH_PUBLIC_STATE_STORAGE_KEY)).not.toBeNull();

    clearGitHubPublicAuthState(window.localStorage);

    expect(loadGitHubPublicAuthState(window.localStorage)).toBeNull();
  });

  it("stores one session-scoped pending retry context", () => {
    const context: PendingGitHubRetryContext = {
      requestId: "compile:starter:1",
      workflow: "compile",
      resource: "sui-framework dependency file",
      capturedAt: 1760000000000,
      retryCount: 0,
      uiReturnHint: "compiler-status",
    };

    savePendingGitHubRetryContext(context, window.sessionStorage);

    expect(loadPendingGitHubRetryContext(window.sessionStorage)).toEqual(context);
    expect(window.sessionStorage.getItem(GITHUB_AUTH_PENDING_RETRY_STORAGE_KEY)).not.toBeNull();

    clearPendingGitHubRetryContext(window.sessionStorage);

    expect(loadPendingGitHubRetryContext(window.sessionStorage)).toBeNull();
  });

  it("notifies listeners when a sibling tab publishes an auth sync signal", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToGitHubAuthSync(listener, window);

    publishGitHubAuthSyncSignal({
      event: "github-auth-state-changed",
      changedAt: 1760000000000,
      mode: "authenticated",
    }, window.localStorage);

    window.dispatchEvent(new StorageEvent("storage", {
      key: GITHUB_AUTH_SYNC_STORAGE_KEY,
      newValue: window.localStorage.getItem(GITHUB_AUTH_SYNC_STORAGE_KEY),
      storageArea: window.localStorage,
    }));

    expect(listener).toHaveBeenCalledWith({
      event: "github-auth-state-changed",
      changedAt: 1760000000000,
      mode: "authenticated",
    });

    unsubscribe();
  });
});