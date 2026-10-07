import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { readProductionContentSecurityPolicy, startProductionCspApp } from "../fixtures/production-csp-app.mjs";
import { SEEN_TUTORIAL_STORAGE_STATE, TUTORIAL_STORAGE_KEY } from "./fixtures/storage";

const origin = "https://world-api-stillness.live.pub.evefrontier.com";
test.use({ ignoreHTTPSErrors: true });
test.skip(({ isMobile }) => isMobile, "Built-app editor coverage runs in desktop Chromium.");

function certificate() {
  const dir = mkdtempSync(join(tmpdir(), "world-api-csp-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-keyout", join(dir, "key"), "-out", join(dir, "cert"), "-days", "1", "-nodes", "-subj", "/CN=127.0.0.1", "-addext", "subjectAltName=IP:127.0.0.1"], { stdio: "ignore" });
  return { key: readFileSync(join(dir, "key")), cert: readFileSync(join(dir, "cert")), cleanup: () => { rmSync(dir, { recursive: true, force: true }); } };
}

async function addList(page: Page, label: string) {
  const category = page.getByRole("button", { name: "Static Data category" });
  if (await category.getAttribute("aria-expanded") !== "true") await category.click();
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await page.getByRole("button", { name: label, exact: true }).dispatchEvent("dragstart", { dataTransfer });
  const canvas = page.getByTestId("canvas-workspace").locator(".react-flow").first();
  await canvas.dispatchEvent("dragover", { dataTransfer });
  await canvas.dispatchEvent("drop", { clientX: 550, clientY: 300, dataTransfer });
  await page.getByRole("button", { name: "Close node toolbox" }).click();
  await page.getByRole("button", { name: "Fit View", exact: true }).click();
  // Keyboard activation avoids the canvas edge overlapping the toolbox rail.
  await page.getByLabel(`Edit ${label}`).press("Enter");
}

for (const [label, collection, key] of [
  ["List of Tribe", "tribes", "selectedTribeIds"],
  ["List of Ship", "ships", "selectedShipIds"],
]) {
  test(`built app ${label} retries and persists under production CSP despite Sui outage`, async ({ page }) => {
    const tls = certificate();
    const app = await startProductionCspApp(tls);
    const requests: string[] = [];
    let fail = true;
    try {
      await page.addInitScript(({ key, value }) => { localStorage.setItem(key, JSON.stringify(value)); }, { key: TUTORIAL_STORAGE_KEY, value: SEEN_TUTORIAL_STORAGE_STATE });
      await page.addInitScript(() => {
        const violations: string[] = [];
        Object.assign(window, { worldApiCspViolations: violations });
        document.addEventListener("securitypolicyviolation", (event) => violations.push(event.blockedURI));
      });
      page.on("request", (request) => { if (request.url().includes("world-api")) requests.push(request.url()); });
      await page.route(/https:\/\/.*(sui\.io|mystenlabs\.com).*\//, (route) => route.abort("failed"));
      await page.route("https://world-api*/**", async (route) => {
        if (route.request().url() !== `${origin}/v2/${collection}`) throw new Error(`Unexpected World API URL ${route.request().url()}`);
        if (fail) return route.abort("failed");
        return route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ data: [{ id: 7, name: "Verified choice", nameShort: "VC", className: "Frigate" }] }) });
      });
      const navigation = await page.goto(app.origin);
      expect(navigation?.headers()["content-security-policy"]).toBe(readProductionContentSecurityPolicy());
      expect(app.contentSecurityPolicy).toContain(origin);
      expect(app.contentSecurityPolicy).not.toContain("world-api-stillness.live.tech");
      await addList(page, label);
      await expect(page.getByRole("alert")).toContainText("World API lookup failed");
      fail = false;
      await page.getByRole("button", { name: "Retry World API lookup" }).click();
      await page.getByRole("checkbox", { name: /Verified choice/ }).press("Space");
      await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
      await page.getByLabel(`Edit ${label}`).press("Enter");
      await expect(page.getByRole("checkbox", { name: /Verified choice/ })).toBeChecked();
      await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
      await page.getByRole("region", { name: "Saved contract controls" }).getByRole("button", { name: "Save", exact: true }).click();
      expect(requests).toEqual([`${origin}/v2/${collection}`, `${origin}/v2/${collection}`]);
      // Reload clears the in-memory option cache; failed lookup must not erase persisted IDs.
      fail = true;
      await page.reload();
      await page.getByLabel(`Edit ${label}`).press("Enter");
      await expect(page.getByRole("alert")).toContainText("World API lookup failed");
      await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
      const saved = await page.evaluate(() => localStorage.getItem("frontier-flow:contracts"));
      expect(saved).toContain(`"${key}":[7]`);
      fail = false;
      await page.getByLabel(`Edit ${label}`).press("Enter");
      await expect(page.getByRole("checkbox", { name: /Verified choice/ })).toBeChecked();
      expect(requests.every((url) => url === `${origin}/v2/${collection}`)).toBe(true);
      expect(await page.evaluate(() => (window as unknown as { worldApiCspViolations: string[] }).worldApiCspViolations)).toEqual([]);
    } finally {
      await app.close();
      tls.cleanup();
    }
  });
}

test("removing the public origin reproduces a CSP-blocked World API request", async ({ page }) => {
  const tls = certificate();
  const app = await startProductionCspApp({ ...tls, contentSecurityPolicy: readProductionContentSecurityPolicy().replace(origin, "") });
  try {
    await page.goto(app.origin);
    const result = await page.evaluate(async (url) => {
      const violations: string[] = [];
      document.addEventListener("securitypolicyviolation", (event) => violations.push(event.blockedURI));
      let failed = false;
      try { await fetch(url); } catch { failed = true; }
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { failed, violations };
    }, `${origin}/v2/tribes`);
    expect(result.failed).toBe(true);
    expect(result.violations).toContain(`${origin}/v2/tribes`);
  } finally {
    await app.close();
    tls.cleanup();
  }
});
