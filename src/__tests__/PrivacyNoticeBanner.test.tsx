import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PrivacyNoticeBanner from "../components/PrivacyNoticeBanner";
import {
  PRIVACY_NOTICE_STORAGE_KEY,
  PRIVACY_NOTICE_VERSION,
  acknowledgePrivacyNotice,
  shouldShowPrivacyNotice,
} from "../utils/privacyNoticeStorage";

describe("PrivacyNoticeBanner", () => {
  it("renders the hosting privacy copy and dismiss action", () => {
    const onDismiss = vi.fn();

    render(<PrivacyNoticeBanner onDismiss={onDismiss} />);

    expect(screen.getByRole("region", { name: "Privacy notice" })).toBeInTheDocument();
    expect(screen.getByText(/does not track visitors/i)).toBeInTheDocument();
    expect(screen.getByText(/Netlify and Cloudflare/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss privacy notice" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows the notice until the current version is acknowledged", () => {
    expect(shouldShowPrivacyNotice(window.localStorage)).toBe(true);

    acknowledgePrivacyNotice(window.localStorage);

    expect(shouldShowPrivacyNotice(window.localStorage)).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(PRIVACY_NOTICE_STORAGE_KEY) ?? "{}")).toEqual({
      version: PRIVACY_NOTICE_VERSION,
    });
  });

  it("shows the notice again when a stored version is stale", () => {
    window.localStorage.setItem(PRIVACY_NOTICE_STORAGE_KEY, JSON.stringify({ version: PRIVACY_NOTICE_VERSION - 1 }));

    expect(shouldShowPrivacyNotice(window.localStorage)).toBe(true);
  });
});