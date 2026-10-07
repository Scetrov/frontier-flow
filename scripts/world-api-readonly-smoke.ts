import { chromium } from "@playwright/test";

import { buildWorldApiUrl } from "../src/utils/worldApiClient";

// Opt-in only: ordinary tests never depend on the upstream World API.
if (!process.argv.includes("--live")) {
  console.error("Opt in: bun scripts/world-api-readonly-smoke.ts --live --origin=https://frontier-flow.scetrov.live/");
  process.exit(2);
}
const originArgument = process.argv.find((arg) => arg.startsWith("--origin="))?.slice("--origin=".length);
if (originArgument === undefined) throw new Error("An explicit deployed --origin is required.");
const deployment = new URL(originArgument);
if (deployment.protocol !== "https:" || deployment.username !== "" || deployment.password !== "") {
  throw new Error("The deployed origin must be HTTPS without credentials.");
}
let failed = false;
for (const collection of ["tribes", "ships"]) {
  const url = buildWorldApiUrl(`/v2/${collection}`);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { Origin: deployment.origin }, credentials: "omit" });
    const payload: unknown = await response.json();
    const envelope = payload as { data?: unknown; metadata?: unknown } | null;
    const valid = response.ok && envelope !== null && typeof envelope === "object" && Array.isArray(envelope.data);
    if (!valid) failed = true;
    console.log(JSON.stringify({ phase: "http", url, status: response.status, valid, cors: response.headers.get("access-control-allow-origin"), count: Array.isArray(envelope?.data) ? envelope.data.length : null, metadata: envelope?.metadata }));
  } catch (error) {
    failed = true;
    console.error(JSON.stringify({ phase: "http", url, error: String(error) }));
  }
}
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const navigation = await page.goto(deployment.origin, { timeout: 20_000, waitUntil: "domcontentloaded" });
  const policy = navigation?.headers()["content-security-policy"] ?? null;
  console.log(JSON.stringify({ phase: "deployment", origin: deployment.origin, status: navigation?.status(), policy }));
  if (navigation === null || !navigation.ok() || policy === null) failed = true;
  for (const collection of ["tribes", "ships"]) {
    const url = buildWorldApiUrl(`/v2/${collection}`);
    const result = await page.evaluate(async (endpoint) => {
      const violations: string[] = [];
      const listener = (event: SecurityPolicyViolationEvent) => { violations.push(event.blockedURI); };
      document.addEventListener("securitypolicyviolation", listener);
      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000), credentials: "omit" });
        const payload = await response.json() as { data?: unknown; metadata?: unknown } | null;
        return { ok: response.ok && payload !== null && typeof payload === "object" && Array.isArray(payload.data), status: response.status, count: Array.isArray(payload?.data) ? payload.data.length : null, violations };
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { ok: false, error: String(error), violations };
      } finally {
        document.removeEventListener("securitypolicyviolation", listener);
      }
    }, url);
    console.log(JSON.stringify({ phase: "deployed-browser", url, ...result }));
    if (!result.ok || result.violations.length > 0) failed = true;
  }
} catch (error) {
  failed = true;
  console.error(JSON.stringify({ phase: "deployed-browser", origin: deployment.origin, error: String(error) }));
} finally {
  await browser?.close();
}
process.exitCode = failed ? 1 : 0;
