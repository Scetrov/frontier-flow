import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { startProductionCspApp } from "../fixtures/production-csp-app.mjs";
import { startSuiGrpcResponder } from "../fixtures/sui-grpc-responder.mjs";
import { SEEN_TUTORIAL_STORAGE_STATE, TUTORIAL_STORAGE_KEY } from "./fixtures/storage";

test.use({ ignoreHTTPSErrors: true });
test.skip(({ isMobile }) => isMobile, "Built-app CSP coverage runs in desktop Chromium.");

test("built app loads balance from a cross-origin gRPC responder under production CSP", async ({ page }) => {
  const tls = createLoopbackCertificate();
  const app = await startProductionCspApp(tls);
  const responder = await startSuiGrpcResponder({ origin: app.origin, mode: "success", tls });
  try {
    await installTransportFixture(page, responder.baseUrl);
    const document = await page.goto(`${app.origin}/`);
    expect(document?.headers()["content-security-policy"]).toBe(app.contentSecurityPolicy);
    expect(app.contentSecurityPolicy).toContain("https://127.0.0.1:*");
    expect(app.contentSecurityPolicy).toContain("https://world-api-stillness.live.pub.evefrontier.com");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByText("12.5 SUI")).toHaveCount(1, { timeout: 20_000 });
    expect(responder.requests.some((request) => request.method === "OPTIONS" && request.path === "/sui.rpc.v2.StateService/GetBalance")).toBe(true);
    expect(responder.requests.some((request) => request.method === "POST" && request.path === "/sui.rpc.v2.StateService/GetBalance" && !request.jsonRpc)).toBe(true);
    expect(responder.requests.some((request) => request.jsonRpc || request.path === "/" || request.path?.includes("suix_") === true)).toBe(false);
  } finally {
    await responder.close();
    await app.close();
  }
});

test("built app reports rejected gRPC preflight as unavailable under production CSP", async ({ page }) => {
  const tls = createLoopbackCertificate();
  const app = await startProductionCspApp(tls);
  const responder = await startSuiGrpcResponder({ origin: app.origin, mode: "rejected-preflight", tls });
  try {
    await installTransportFixture(page, responder.baseUrl);
    await page.goto(`${app.origin}/`);
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByText(/SUI unavailable/i)).toHaveCount(1, { timeout: 20_000 });
    await expect(page.getByText("0 SUI")).toHaveCount(0);
    expect(responder.requests.some((request) => request.jsonRpc)).toBe(false);
  } finally {
    await responder.close();
    await app.close();
  }
});

function createLoopbackCertificate() {
  const directory = mkdtempSync(join(tmpdir(), "frontier-grpc-csp-"));
  const keyPath = join(directory, "key.pem");
  const certPath = join(directory, "cert.pem");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-keyout", keyPath, "-out", certPath,
    "-days", "1", "-nodes", "-subj", "/CN=127.0.0.1",
    "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost",
  ], { stdio: "ignore" });
  return { cert: readFileSync(certPath), key: readFileSync(keyPath) };
}

async function installTransportFixture(page: Page, rpcUrl: string) {
  await page.addInitScript(({ endpoint, tutorialKey, tutorialState }) => {
    window.localStorage.setItem(tutorialKey, JSON.stringify(tutorialState));
    window.localStorage.setItem("frontier-flow:ui-state", JSON.stringify({
      version: 1,
      activeView: "visual",
      currentDraftContractName: null,
      selectedDeploymentTarget: "local",
      isSidebarOpen: true,
      isContractPanelOpen: true,
    }));
    window.localStorage.setItem("frontier-flow:local-environment", JSON.stringify({
      version: 1,
      rpcUrl: endpoint,
      graphQlUrl: "http://127.0.0.1:9/graphql",
      worldPackageId: "0x1",
      worldPackageVersion: "0.0.1",
      useEphemeralKeypair: true,
      updatedAt: "2026-10-07T00:00:00.000Z",
    }));
    const account = {
      address: "0x1",
      publicKey: new Uint8Array(32),
      chains: ["sui:testnet", "sui:localnet"],
      features: ["sui:signTransaction"],
    };
    const wallet = {
      version: "1.0.0",
      name: "Frontier gRPC transport wallet",
      icon: "data:image/svg+xml;base64,PHN2Zy8+",
      chains: ["sui:testnet", "sui:localnet"],
      accounts: [account],
      features: {
        "standard:connect": { version: "1.0.0", connect: () => Promise.resolve({ accounts: [account] }) },
        "standard:events": { version: "1.0.0", on: () => () => undefined },
        "sui:signTransaction": { version: "2.0.0", signTransaction: () => Promise.resolve({ bytes: "dGVzdA==", signature: "QUFBQQ==" }) },
      },
    };
    window.addEventListener("wallet-standard:app-ready", (event) => {
      (event as CustomEvent<{ register: (nextWallet: unknown) => void }>).detail.register(wallet);
    });
  }, { endpoint: rpcUrl, tutorialKey: TUTORIAL_STORAGE_KEY, tutorialState: SEEN_TUTORIAL_STORAGE_STATE });
}
