export type GitHubAccessMode = "anonymous" | "authenticating" | "authenticated" | "reauth-required";

export type GitHubAuthIndicatorVariant = "neutral" | "active" | "warning" | "error";

export type GitHubFailureKind = "rate-limit" | "bad-credentials" | "insufficient-permission" | "network" | "unknown";

export interface GitHubAccessState {
  readonly mode: GitHubAccessMode;
  readonly indicatorVariant: GitHubAuthIndicatorVariant;
  readonly grantedScopes: readonly string[];
  readonly verifiedAt: number | null;
  readonly loginLabel: string | null;
  readonly lastFailureKind: GitHubFailureKind | null;
}

export interface GitHubOAuthSession {
  readonly oauthState: string;
  readonly accessToken: string;
  readonly tokenType: "bearer";
  readonly scopeHeader: string;
  readonly status: "pending" | "active" | "cancelled" | "revoked" | "failed";
  readonly validatedUserId: number | null;
}

export interface PendingGitHubRetryContext {
  readonly requestId: string;
  readonly workflow: "compile" | "dependency-fetch" | "deploy-grade-fetch";
  readonly resource: string;
  readonly capturedAt: number;
  readonly retryCount: number;
  readonly uiReturnHint: string | null;
}

export interface GitHubFailureClassification {
  readonly httpStatus: number;
  readonly kind: GitHubFailureKind;
  readonly rateLimitRemaining: number | null;
  readonly resetAt: number | null;
  readonly messageKey: string;
}

export interface GitHubAuthSyncSignal {
  readonly event: "github-auth-state-changed";
  readonly changedAt: number;
  readonly mode: GitHubAccessMode;
}

export interface GitHubAuthSuccessPayload {
  readonly type: "ff:github-auth:success";
  readonly token: string;
  readonly scopeHeader: string;
  readonly verifiedAt: number;
  readonly loginLabel: string | null;
  readonly validatedUserId: number | null;
  readonly grantedScopes: readonly string[];
}

export interface GitHubAuthErrorPayload {
  readonly type: "ff:github-auth:error";
  readonly reason: "invalid_state" | "oauth_denied" | "exchange_failed" | "validation_failed";
  readonly message: string;
}

export type GitHubAuthPopupPayload = GitHubAuthSuccessPayload | GitHubAuthErrorPayload;

export interface GitHubTokenValidationResult {
  readonly scopeHeader: string;
  readonly verifiedAt: number;
  readonly loginLabel: string | null;
  readonly validatedUserId: number | null;
  readonly grantedScopes: readonly string[];
}