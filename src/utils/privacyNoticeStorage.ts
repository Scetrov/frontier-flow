export const PRIVACY_NOTICE_STORAGE_KEY = "frontier-flow:privacy-notice";
export const PRIVACY_NOTICE_VERSION = 1;

interface StoredPrivacyNoticeState {
  readonly version: number;
}

/**
 * Returns true when the current privacy notice version still needs to be shown.
 */
export function shouldShowPrivacyNotice(storage: Storage | undefined): boolean {
  const rawValue = storage?.getItem(PRIVACY_NOTICE_STORAGE_KEY);
  if (rawValue === null || rawValue === undefined) {
    return true;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isRecord(parsedValue) || typeof parsedValue.version !== "number") {
      return true;
    }

    return parsedValue.version !== PRIVACY_NOTICE_VERSION;
  } catch {
    return true;
  }
}

/**
 * Persists the current privacy notice version after the user dismisses it.
 */
export function acknowledgePrivacyNotice(storage: Storage | undefined): void {
  const nextState: StoredPrivacyNoticeState = {
    version: PRIVACY_NOTICE_VERSION,
  };

  storage?.setItem(PRIVACY_NOTICE_STORAGE_KEY, JSON.stringify(nextState));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}