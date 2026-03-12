import { expect, test } from "@playwright/test";

test("renders Frontier Flow branding metadata", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Frontier Flow");

  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    "href",
    "/favicon.svg",
  );
  await expect(page.locator('link[rel="icon"][type="image/x-icon"]')).toHaveAttribute(
    "href",
    "/favicon.ico",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png",
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
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Open node toolbox" })).toBeFocused();
});