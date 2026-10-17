import type { SharedExtension } from "./sharedExtensionStorage";

/** Route that turns a shared link into an authorizable contract. */
export const ONBOARDING_ROUTE = "/onboard";

export const ONBOARDING_PARAM_PACKAGE = "package";
export const ONBOARDING_PARAM_MODULE = "module";
export const ONBOARDING_PARAM_NETWORK = "network";

export interface OnboardingLinkParams {
  readonly packageId: string;
  readonly moduleName: string;
  readonly targetId: SharedExtension["targetId"];
}

export type OnboardingLinkResult =
  | { readonly ok: true; readonly params: OnboardingLinkParams }
  | { readonly ok: false; readonly reason: string };

function isPackageId(value: string | null): value is string {
  return value !== null && /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function isModuleName(value: string | null): value is string {
  return value !== null && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function isTargetId(value: string | null): value is SharedExtension["targetId"] {
  return value === "testnet:stillness" || value === "testnet:utopia";
}

/**
 * Read an onboarding link's parameters, refusing anything malformed.
 *
 * The link is only ever a way to *find* a contract. It names the package,
 * module, and network so the page can tell the reader exactly what they are
 * being asked to authorize before a wallet is involved; it confers no consent
 * of its own, and resolution still verifies the package independently.
 */
export function parseOnboardingLink(search: string): OnboardingLinkResult {
  const params = new URLSearchParams(search);
  const packageId = params.get(ONBOARDING_PARAM_PACKAGE);
  const moduleName = params.get(ONBOARDING_PARAM_MODULE);
  const targetId = params.get(ONBOARDING_PARAM_NETWORK);

  if (packageId === null && moduleName === null && targetId === null) {
    return { ok: false, reason: "This onboarding link carries no contract details." };
  }

  if (!isPackageId(packageId)) {
    return { ok: false, reason: "This link does not name a valid package id (expected 0x followed by up to 64 hex digits)." };
  }

  if (!isModuleName(moduleName)) {
    return { ok: false, reason: "This link does not name a valid module." };
  }

  if (!isTargetId(targetId)) {
    return { ok: false, reason: "This link does not name a supported network. Expected testnet:stillness or testnet:utopia." };
  }

  return { ok: true, params: { packageId, moduleName, targetId } };
}

/** Build the link a contract's author shares with the people onboarding to it. */
export function buildOnboardingLink(params: OnboardingLinkParams, origin: string): string {
  const search = new URLSearchParams([
    [ONBOARDING_PARAM_PACKAGE, params.packageId],
    [ONBOARDING_PARAM_MODULE, params.moduleName],
    [ONBOARDING_PARAM_NETWORK, params.targetId],
  ]);

  return `${origin.replace(/\/+$/, "")}${ONBOARDING_ROUTE}?${search.toString()}`;
}
