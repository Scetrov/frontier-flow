import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HandlerEvent } from "@netlify/functions";

import { handler } from "../github-callback";

function extractPopupPayload(html: string): Record<string, unknown> {
  const payloadMatch = html.match(/data-auth-payload="([^"]+)"/);

  if (payloadMatch === null) {
    throw new Error("Expected popup payload attribute to be present.");
  }

  return JSON.parse(decodeURIComponent(payloadMatch[1])) as Record<string, unknown>;
}

function createEvent(input: Partial<HandlerEvent> = {}): HandlerEvent {
  return {
    body: null,
    headers: {
      cookie: "ff_github_auth_state=expected-state",
      host: "frontier-flow.netlify.app",
      referer: "https://github.com/",
      "x-forwarded-host": "frontier-flow.netlify.app",
      "x-forwarded-proto": "https",
    },
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/api/github-callback",
    rawUrl: "https://frontier-flow.netlify.app/api/github-callback?code=oauth-code&state=expected-state",
    queryStringParameters: {
      code: "oauth-code",
      state: "expected-state",
    },
    rawQuery: "code=oauth-code&state=expected-state",
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    ...input,
  } as HandlerEvent;
}

describe("github-callback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.VITE_GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    delete process.env.GITHUB_AUTH_ALLOWED_ORIGINS;
  });

  it("exchanges the OAuth code, validates the token, and returns a popup success bridge", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token", scope: "" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 42, login: "scetrov" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-oauth-scopes": "",
        },
      }));

    const response = await handler(createEvent(), {} as never);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response?.statusCode).toBe(200);
    const payload = extractPopupPayload(response?.body ?? "");
    expect(payload.type).toBe("ff:github-auth:success");
    expect(payload.token).toBe("test-token");
    expect(payload.loginLabel).toBe("scetrov");
    expect(response?.body).toContain('<script src="/github-auth-callback.js"></script>');
    expect(response?.body).not.toContain("window.opener.postMessage");
    expect(response?.headers?.["set-cookie"]).toContain("Max-Age=0");
  });

  it("rejects the callback when the state cookie does not match", async () => {
    const response = await handler(createEvent({
      headers: {
        cookie: "ff_github_auth_state=unexpected-state",
        host: "frontier-flow.netlify.app",
        referer: "https://github.com/",
        "x-forwarded-host": "frontier-flow.netlify.app",
        "x-forwarded-proto": "https",
      },
    }), {} as never);

    expect(response?.statusCode).toBe(400);
    expect(extractPopupPayload(response?.body ?? "").reason).toBe("invalid_state");
    expect(response?.body).toContain("data-auth-payload=");
  });

  it("bridges user-denied OAuth responses as popup errors", async () => {
    const response = await handler(createEvent({
      queryStringParameters: {
        error: "access_denied",
        error_description: "The user denied access.",
        state: "expected-state",
      },
      rawQuery: "error=access_denied&state=expected-state",
    }), {} as never);

    expect(response?.statusCode).toBe(200);
    const payload = extractPopupPayload(response?.body ?? "");
    expect(payload.reason).toBe("oauth_denied");
    expect(payload.message).toBe("The user denied access.");
  });

  it("accepts the OAuth state cookie when Netlify provides it through multiValueHeaders", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token", scope: "" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 42, login: "scetrov" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-oauth-scopes": "",
        },
      }));

    const response = await handler(createEvent({
      headers: {
        host: "frontier-flow.netlify.app",
        referer: "https://github.com/",
        "x-forwarded-host": "frontier-flow.netlify.app",
        "x-forwarded-proto": "https",
      },
      multiValueHeaders: {
        cookie: ["ff_github_auth_state=expected-state"],
      },
    }), {} as never);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response?.statusCode).toBe(200);
    expect(extractPopupPayload(response?.body ?? "").type).toBe("ff:github-auth:success");
  });

  it("accepts same-origin localhost callbacks when x-forwarded-proto is absent in local dev", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token", scope: "" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 42, login: "scetrov" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-oauth-scopes": "",
        },
      }));

    const response = await handler(createEvent({
      headers: {
        cookie: "ff_github_auth_state=expected-state",
        host: "localhost:8888",
        origin: "http://localhost:8888",
        referer: "http://localhost:8888/",
      },
      rawUrl: "http://localhost:8888/api/github-callback?code=oauth-code&state=expected-state",
    }), {} as never);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response?.statusCode).toBe(200);
    expect(extractPopupPayload(response?.body ?? "").type).toBe("ff:github-auth:success");
  });

  it("falls back to VITE_GITHUB_CLIENT_ID when the server-specific client id is not set locally", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    process.env.VITE_GITHUB_CLIENT_ID = "vite-client-id";

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "test-token", scope: "" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 42, login: "scetrov" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-oauth-scopes": "",
        },
      }));

    const response = await handler(createEvent(), {} as never);

    const tokenExchangeCall = fetchMock.mock.calls[0];
    expect(response?.statusCode).toBe(200);
    expect(tokenExchangeCall).toBeDefined();
    expect(tokenExchangeCall?.[1]?.body).toBeInstanceOf(URLSearchParams);
    expect((tokenExchangeCall?.[1]?.body as URLSearchParams).get("client_id")).toBe("vite-client-id");
  });
});