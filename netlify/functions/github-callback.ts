interface GitHubCallbackEvent {
  readonly body?: string | null;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly httpMethod?: string;
  readonly isBase64Encoded?: boolean;
  readonly multiValueHeaders: Readonly<Record<string, readonly string[] | undefined>>;
  readonly multiValueQueryStringParameters?: Readonly<Record<string, readonly string[] | undefined>>;
  readonly path?: string;
  readonly rawQuery?: string;
  readonly queryStringParameters?: Readonly<Record<string, string | undefined>>;
  readonly rawUrl?: string;
}

interface GitHubCallbackResponse {
  readonly body: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly statusCode: number;
}

import { GITHUB_API_VERSION } from "../../src/utils/githubApi";
import { normalizeGitHubAuthCallbackPath } from "../../src/utils/githubAuthConfig";

const GITHUB_AUTH_STATE_COOKIE = "ff_github_auth_state";
const GITHUB_TOKEN_EXCHANGE_ENDPOINT = "https://github.com/login/oauth/access_token";
const GITHUB_VALIDATE_ENDPOINT = "https://api.github.com/user";

function getHeader(event: GitHubCallbackEvent, name: string): string | null {
  const targetName = name.toLowerCase();
  const entry = Object.entries(event.headers).find(([headerName]) => headerName.toLowerCase() === targetName);
  if (entry?.[1] !== undefined) {
    return entry[1];
  }

  const multiValueEntry = Object.entries(event.multiValueHeaders).find(([headerName]) => headerName.toLowerCase() === targetName);
  const firstValue = multiValueEntry === undefined ? undefined : multiValueEntry[1]?.[0];
  return firstValue === undefined ? null : firstValue;
}

function parseCookie(cookieHeader: string | null, cookieName: string): string | null {
  if (cookieHeader === null) {
    return null;
  }

  const cookieValue = cookieHeader
    .split(";")
    .map((segment) => segment.trim())
    .find((segment) => segment.startsWith(`${cookieName}=`));

  if (cookieValue === undefined) {
    return null;
  }

  try {
    return decodeURIComponent(cookieValue.slice(cookieName.length + 1));
  } catch {
    return null;
  }
}

function parseScopes(scopeHeader: string): readonly string[] {
  return scopeHeader
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

function encodePayloadForHtmlAttribute(payload: object): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function getGitHubCallbackPath(): string {
  return normalizeGitHubAuthCallbackPath(process.env.VITE_GITHUB_AUTH_CALLBACK_PATH);
}

function createPopupBridgeResponse(payload: object, statusCode = 200): GitHubCallbackResponse {
  const encodedPayload = encodePayloadForHtmlAttribute(payload);
  const callbackPath = getGitHubCallbackPath();

  return {
    statusCode,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": `${GITHUB_AUTH_STATE_COOKIE}=; Max-Age=0; Path=${callbackPath}; SameSite=Lax`,
    },
    body: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>GitHub Sign-In</title>
  </head>
  <body data-auth-payload="${encodedPayload}">
    <script src="/github-auth-callback.js"></script>
  </body>
</html>`,
  };
}

function getRequestOrigin(event: GitHubCallbackEvent): string {
  if (typeof event.rawUrl === "string" && event.rawUrl.length > 0) {
    try {
      return new URL(event.rawUrl).origin;
    } catch {
      // Fall through to header-based reconstruction.
    }
  }

  const protocol = getHeader(event, "x-forwarded-proto") ?? "https";
  const host = getHeader(event, "x-forwarded-host") ?? getHeader(event, "host");
  return host === null ? "" : `${protocol}://${host}`;
}

function getSafeOrigin(rawUrl: string | null): string | null {
  if (rawUrl === null) {
    return null;
  }

  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

function isAllowedRequestOrigin(event: GitHubCallbackEvent): boolean {
  const requestOrigin = getRequestOrigin(event);
  if (requestOrigin.length === 0) {
    return false;
  }

  const configuredOrigins = (process.env.GITHUB_AUTH_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowedOrigins = new Set([requestOrigin, ...configuredOrigins, "https://github.com"]);
  const originHeader = getHeader(event, "origin");
  const refererHeader = getHeader(event, "referer");
  const refererOrigin = getSafeOrigin(refererHeader);

  return (originHeader === null || allowedOrigins.has(originHeader))
    && (refererOrigin === null || allowedOrigins.has(refererOrigin));
}

async function exchangeCodeForToken(input: {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
  readonly redirectUri: string;
}): Promise<{ readonly accessToken: string; readonly scope: string }> {
  const response = await fetch(GITHUB_TOKEN_EXCHANGE_ENDPOINT, {
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
    headers: {
      Accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  const payload = await response.json() as {
    readonly access_token?: string;
    readonly error?: string;
    readonly error_description?: string;
    readonly scope?: string;
  };

  if (!response.ok || typeof payload.access_token !== "string" || payload.access_token.length === 0) {
    throw new Error(payload.error_description ?? payload.error ?? "GitHub token exchange failed.");
  }

  return {
    accessToken: payload.access_token,
    scope: payload.scope ?? "",
  };
}

async function validateToken(accessToken: string): Promise<{
  readonly loginLabel: string | null;
  readonly scopeHeader: string;
  readonly grantedScopes: readonly string[];
  readonly validatedUserId: number | null;
  readonly verifiedAt: number;
}> {
  const response = await fetch(GITHUB_VALIDATE_ENDPOINT, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "frontier-flow",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });

  if (!response.ok) {
    throw new Error("GitHub token validation failed.");
  }

  const payload = await response.json() as {
    readonly id?: number;
    readonly login?: string;
  };
  const scopeHeader = response.headers.get("x-oauth-scopes") ?? "";

  return {
    loginLabel: typeof payload.login === "string" && payload.login.length > 0 ? payload.login : null,
    scopeHeader,
    grantedScopes: parseScopes(scopeHeader),
    validatedUserId: typeof payload.id === "number" ? payload.id : null,
    verifiedAt: Date.now(),
  };
}

function getGitHubClientId(): string | null {
  const configuredClientId = process.env.GITHUB_CLIENT_ID ?? process.env.VITE_GITHUB_CLIENT_ID;
  return typeof configuredClientId === "string" && configuredClientId.length > 0 ? configuredClientId : null;
}

export const handler = async (event: GitHubCallbackEvent): Promise<GitHubCallbackResponse> => {
  if (!isAllowedRequestOrigin(event)) {
    return createPopupBridgeResponse({
      type: "ff:github-auth:error",
      reason: "invalid_state",
      message: "GitHub sign-in could not verify the request origin.",
    }, 400);
  }

  const query = event.queryStringParameters ?? {};
  const code = query.code;
  const error = query.error;
  const state = query.state;
  const cookieState = parseCookie(getHeader(event, "cookie"), GITHUB_AUTH_STATE_COOKIE);

  if (typeof error === "string" && error.length > 0) {
    return createPopupBridgeResponse({
      type: "ff:github-auth:error",
      reason: "oauth_denied",
      message: query.error_description ?? "GitHub sign-in was cancelled.",
    });
  }

  if (typeof state !== "string" || state.length === 0 || cookieState !== state) {
    return createPopupBridgeResponse({
      type: "ff:github-auth:error",
      reason: "invalid_state",
      message: "GitHub sign-in could not validate this session.",
    }, 400);
  }

  if (typeof code !== "string" || code.length === 0) {
    return createPopupBridgeResponse({
      type: "ff:github-auth:error",
      reason: "exchange_failed",
      message: "GitHub sign-in did not return an authorization code.",
    }, 400);
  }

  const clientId = getGitHubClientId();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (clientId === null || typeof clientSecret !== "string" || clientSecret.length === 0) {
    return createPopupBridgeResponse({
      type: "ff:github-auth:error",
      reason: "exchange_failed",
      message: "GitHub sign-in is not configured properly. The exchange failed, please contact Scetrov using GitHub issues.",
    }, 500);
  }

  try {
    const requestOrigin = getRequestOrigin(event);
    const redirectUri = new URL(getGitHubCallbackPath(), requestOrigin).toString();
    const tokenResult = await exchangeCodeForToken({
      clientId,
      clientSecret,
      code,
      redirectUri,
    });
    const validationResult = await validateToken(tokenResult.accessToken);

    return createPopupBridgeResponse({
      type: "ff:github-auth:success",
      token: tokenResult.accessToken,
      scopeHeader: validationResult.scopeHeader,
      verifiedAt: validationResult.verifiedAt,
      loginLabel: validationResult.loginLabel,
      validatedUserId: validationResult.validatedUserId,
      grantedScopes: validationResult.grantedScopes,
    });
  } catch {
    return createPopupBridgeResponse({
      type: "ff:github-auth:error",
      reason: "validation_failed",
      message: "GitHub sign-in completed, but the returned session could not be validated.",
    }, 502);
  }
};

export default handler;