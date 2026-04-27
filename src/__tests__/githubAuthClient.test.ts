import { describe, expect, it } from "vitest";

import { beginGitHubOAuthPopup, classifyGitHubApiFailure, classifyGitHubErrorMessage, validateGitHubToken } from "../utils/githubAuthClient";

describe("githubAuthClient", () => {
  it("classifies GitHub rate-limit responses from status and headers", async () => {
    const response = new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
      status: 403,
      statusText: "Forbidden",
      headers: {
        "content-type": "application/json",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1760000000",
      },
    });

    await expect(classifyGitHubApiFailure(response)).resolves.toEqual({
      httpStatus: 403,
      kind: "rate-limit",
      rateLimitRemaining: 0,
      resetAt: 1760000000000,
      messageKey: "github.rate-limit",
    });
  });

  it("classifies serialized credential failures from raw messages", () => {
    expect(classifyGitHubErrorMessage("401 Bad credentials")).toEqual({
      httpStatus: 401,
      kind: "bad-credentials",
      rateLimitRemaining: null,
      resetAt: null,
      messageKey: "github.bad-credentials",
    });
  });

  it("validates a token and returns non-secret GitHub session metadata", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = (input, init) => {
      calls.push({ input, init });
      return Promise.resolve(new Response(JSON.stringify({
        id: 42,
        login: "scetrov",
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-oauth-scopes": "repo, read:user",
        },
      }));
    };

    await expect(validateGitHubToken("test-token", fetchImpl)).resolves.toEqual(expect.objectContaining({
      loginLabel: "scetrov",
      validatedUserId: 42,
      scopeHeader: "repo, read:user",
      grantedScopes: ["repo", "read:user"],
    }));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("https://api.github.com/user");
    expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("resolves the popup bridge payload after the callback page posts back", async () => {
    const popup = window;
    const openWindow: Window["open"] = () => popup;

    const popupPromise = beginGitHubOAuthPopup({
      clientId: "client-id",
      document: window.document,
      location: window.location,
      openWindow,
      windowImpl: window,
    });

    window.dispatchEvent(new MessageEvent("message", {
      data: {
        type: "ff:github-auth:success",
        token: "test-token",
        scopeHeader: "",
        verifiedAt: 1760000000000,
        loginLabel: "scetrov",
        validatedUserId: 42,
        grantedScopes: [],
      },
      origin: window.location.origin,
      source: popup,
    }));

    await expect(popupPromise).resolves.toEqual(expect.objectContaining({
      type: "ff:github-auth:success",
      token: "test-token",
    }));
  });

  it("falls back to the default callback path and marks auth cookies Secure on https", async () => {
    const cookieWrites: string[] = [];
    const documentImpl = {
      get cookie() {
        return "";
      },
      set cookie(value: string) {
        cookieWrites.push(value);
      },
    } as Document;
    const location = {
      origin: "https://frontier-flow.netlify.app",
      protocol: "https:",
    } as Location;
    const popup = window;
    let popupUrl = "";
    const openWindow: Window["open"] = (url) => {
      popupUrl = String(url);
      return popup;
    };

    const popupPromise = beginGitHubOAuthPopup({
      callbackPath: "https://evil.example/callback",
      clientId: "client-id",
      document: documentImpl,
      location,
      openWindow,
      windowImpl: window,
    });

    window.dispatchEvent(new MessageEvent("message", {
      data: {
        type: "ff:github-auth:error",
        reason: "oauth_denied",
        message: "cancelled",
      },
      origin: location.origin,
      source: popup,
    }));

    await expect(popupPromise).resolves.toEqual(expect.objectContaining({
      type: "ff:github-auth:error",
      reason: "oauth_denied",
    }));

    expect(cookieWrites[0]).toContain("Path=/api/github-callback");
    expect(cookieWrites[0]).toContain("Secure");
    expect(cookieWrites.at(-1)).toContain("Max-Age=0");
    expect(cookieWrites.at(-1)).toContain("Path=/api/github-callback");
    expect(cookieWrites.at(-1)).toContain("Secure");

    const authorizeUrl = new URL(popupUrl);
    expect(authorizeUrl.searchParams.get("redirect_uri")).toBe("https://frontier-flow.netlify.app/api/github-callback");
  });
});