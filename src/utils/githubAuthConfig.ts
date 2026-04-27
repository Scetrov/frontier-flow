export const DEFAULT_GITHUB_AUTH_CALLBACK_PATH = "/api/github-callback";

export function normalizeGitHubAuthCallbackPath(callbackPath: string | null | undefined): string {
  if (typeof callbackPath !== "string" || callbackPath.length === 0) {
    return DEFAULT_GITHUB_AUTH_CALLBACK_PATH;
  }

  if (!callbackPath.startsWith("/") || callbackPath.startsWith("//") || callbackPath.includes("?") || callbackPath.includes("#")) {
    return DEFAULT_GITHUB_AUTH_CALLBACK_PATH;
  }

  try {
    return new URL(callbackPath, "https://frontier-flow.local").pathname;
  } catch {
    return DEFAULT_GITHUB_AUTH_CALLBACK_PATH;
  }
}
