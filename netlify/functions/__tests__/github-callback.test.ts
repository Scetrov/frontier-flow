import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HandlerEvent } from "@netlify/functions";

import { handler } from "../github-callback";

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
    expect(response?.body).toContain('"type":"ff:github-auth:success"');
    expect(response?.body).toContain('"token":"test-token"');
    expect(response?.body).toContain('"loginLabel":"scetrov"');
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
    expect(response?.body).toContain('"reason":"invalid_state"');
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
    expect(response?.body).toContain('"reason":"oauth_denied"');
    expect(response?.body).toContain("The user denied access.");
  });
});