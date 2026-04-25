import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GitHubFailureClassification } from "../../types/githubAuth";
import { GITHUB_AUTH_SYNC_STORAGE_KEY } from "../../utils/githubAuthStorage";
import useGitHubAuth from "../../hooks/useGitHubAuth";

const mockBeginGitHubOAuthPopup = vi.fn<typeof import("../../utils/githubAuthClient").beginGitHubOAuthPopup>();
const mockValidateGitHubToken = vi.fn<typeof import("../../utils/githubAuthClient").validateGitHubToken>();

vi.mock("../../utils/githubAuthClient", async () => {
  const actual = await vi.importActual<typeof import("../../utils/githubAuthClient")>("../../utils/githubAuthClient");
  return {
    ...actual,
    beginGitHubOAuthPopup: (...args: Parameters<typeof actual.beginGitHubOAuthPopup>) => mockBeginGitHubOAuthPopup(...args),
    validateGitHubToken: (...args: Parameters<typeof actual.validateGitHubToken>) => mockValidateGitHubToken(...args),
  };
});

describe("useGitHubAuth", () => {
  const originalClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

  beforeEach(() => {
    vi.stubEnv("VITE_GITHUB_CLIENT_ID", "client-id");
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockBeginGitHubOAuthPopup.mockReset();
    mockValidateGitHubToken.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalClientId !== undefined) {
      vi.stubEnv("VITE_GITHUB_CLIENT_ID", originalClientId);
    }
  });

  it("authenticates successfully and keeps the access token only in memory", async () => {
    mockBeginGitHubOAuthPopup.mockResolvedValue({
      type: "ff:github-auth:success",
      token: "test-token",
      scopeHeader: "",
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
      validatedUserId: 42,
      grantedScopes: [],
    });
    mockValidateGitHubToken.mockResolvedValue({
      scopeHeader: "repo",
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
      validatedUserId: 42,
      grantedScopes: ["repo"],
    });

    const { result } = renderHook(() => useGitHubAuth());

    await act(async () => {
      await result.current.beginSignIn();
    });

    expect(result.current.accessState).toEqual(expect.objectContaining({
      mode: "authenticated",
      loginLabel: "scetrov",
      grantedScopes: ["repo"],
    }));
    expect(result.current.accessToken).toBe("test-token");
    expect(window.localStorage.getItem("frontier-flow:github-auth:public-state")).toContain("authenticated");
    expect(window.localStorage.getItem("frontier-flow:github-auth:public-state")).not.toContain("test-token");
  });

  it("moves to reauth-required when an authenticated session becomes unusable", () => {
    const { result } = renderHook(() => useGitHubAuth());
    const failure: GitHubFailureClassification = {
      httpStatus: 401,
      kind: "bad-credentials",
      rateLimitRemaining: null,
      resetAt: null,
      messageKey: "github.bad-credentials",
    };

    act(() => {
      result.current.reportFailure(failure);
    });

    expect(result.current.accessState).toEqual(expect.objectContaining({
      mode: "reauth-required",
      lastFailureKind: "bad-credentials",
      indicatorVariant: "warning",
    }));
  });

  it("clears the in-memory token and retry context when the user signs out", async () => {
    mockBeginGitHubOAuthPopup.mockResolvedValue({
      type: "ff:github-auth:success",
      token: "test-token",
      scopeHeader: "",
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
      validatedUserId: 42,
      grantedScopes: [],
    });
    mockValidateGitHubToken.mockResolvedValue({
      scopeHeader: "repo",
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
      validatedUserId: 42,
      grantedScopes: ["repo"],
    });

    const { result } = renderHook(() => useGitHubAuth());

    await act(async () => {
      await result.current.beginSignIn();
    });

    act(() => {
      result.current.setPendingRetryContext({
        requestId: "compile:starter:1",
        workflow: "compile",
        resource: "sui-framework dependency file",
        capturedAt: 1760000000000,
        retryCount: 0,
        uiReturnHint: "compiler-status",
      });
      result.current.signOut();
    });

    expect(result.current.accessState.mode).toBe("anonymous");
    expect(result.current.accessToken).toBeNull();
    expect(result.current.pendingRetryContext).toBeNull();
  });

  it("responds to a sibling-tab sign-out broadcast", async () => {
    mockBeginGitHubOAuthPopup.mockResolvedValue({
      type: "ff:github-auth:success",
      token: "test-token",
      scopeHeader: "",
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
      validatedUserId: 42,
      grantedScopes: [],
    });
    mockValidateGitHubToken.mockResolvedValue({
      scopeHeader: "repo",
      verifiedAt: 1760000000000,
      loginLabel: "scetrov",
      validatedUserId: 42,
      grantedScopes: ["repo"],
    });

    const { result } = renderHook(() => useGitHubAuth());

    await act(async () => {
      await result.current.beginSignIn();
    });

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key: GITHUB_AUTH_SYNC_STORAGE_KEY,
        newValue: JSON.stringify({
          event: "github-auth-state-changed",
          changedAt: 1760000000000,
          mode: "anonymous",
        }),
        storageArea: window.localStorage,
      }));
    });

    await waitFor(() => {
      expect(result.current.accessState.mode).toBe("anonymous");
      expect(result.current.accessToken).toBeNull();
    });
  });
});