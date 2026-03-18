import { expect, test, type Locator, type Page } from "@playwright/test";

async function pressTabUntilFocused(page: Page, locator: Locator, maxTabs: number) {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press("Tab");

    if (await locator.evaluate((element) => element === document.activeElement)) {
      return;
    }
  }

  throw new Error("Expected target control to receive focus within the allowed tab sequence.");
}

test("renders Frontier Flow branding metadata", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Frontier Flow");

  const faviconLinks = page.locator('link[rel="icon"][type="image/png"]');
  await expect(faviconLinks).toHaveCount(3);
  await expect(page.locator('link[rel="icon"][type="image/png"][sizes="32x32"]')).toHaveAttribute(
    "href",
    "/favicon@32px.png",
  );
  await expect(page.locator('link[rel="icon"][type="image/png"][sizes="64x64"]')).toHaveAttribute(
    "href",
    "/favicon@64px.png",
  );
  await expect(page.locator('link[rel="icon"][type="image/png"][sizes="128x128"]')).toHaveAttribute(
    "href",
    "/favicon@128px.png",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/LogoSquare@2x.png",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/site.webmanifest",
  );

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Frontier Flow");
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://frontierflow.dev",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://frontierflow.dev/og-image.png",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
});

test("preserves shell landmarks and layout constraints across viewport widths", async ({
  isMobile,
  page,
}) => {
  test.skip(isMobile, "Viewport matrix is covered in the desktop project.");

  for (const width of [320, 768, 1024, 1440, 2560]) {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");

    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("main", { name: "Application shell" })).toHaveCount(1);
    await expect(page.locator('aside[aria-label="Node toolbox"]')).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  }

  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto("/");

  const connectButton = page.getByRole("button", { name: "Connect" });
  const savedContractControlsButton = page.getByRole("button", { name: "Open saved contract controls" });

  await pressTabUntilFocused(page, connectButton, 6);
  await pressTabUntilFocused(page, savedContractControlsButton, 4);
});