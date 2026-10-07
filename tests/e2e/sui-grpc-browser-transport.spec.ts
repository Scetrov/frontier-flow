import { expect, test } from "@playwright/test";

import { startSuiGrpcResponder } from "../fixtures/sui-grpc-responder.mjs";
import { SEEN_TUTORIAL_STORAGE_STATE, TUTORIAL_STORAGE_KEY } from "./fixtures/storage";

const APP_ORIGIN = "http://127.0.0.1:4173";

test("wallet balance uses a real cross-origin gRPC responder without mocking the balance hook", async ({ page }) => {
  const responder = await startSuiGrpcResponder({ origin: APP_ORIGIN, mode: "success" });
  try {
    await installTransportFixture(page, responder.baseUrl);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByText("12.5 SUI")).toHaveCount(1, { timeout: 20_000 });
    expect(responder.requests.some((request) => request.method === "OPTIONS")).toBe(true);
    expect(responder.requests.some((request) => request.method === "POST" && request.path === "/sui.rpc.v2.StateService/GetBalance")).toBe(true);
  } finally {
    await responder.close();
  }
});

test("rejected cross-origin gRPC preflight is an unavailable balance, not zero", async ({ page }) => {
  const responder = await startSuiGrpcResponder({ origin: APP_ORIGIN, mode: "rejected-preflight" });
  try {
    await installTransportFixture(page, responder.baseUrl);
    await page.goto("/");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByText(/SUI unavailable/i)).toHaveCount(1, { timeout: 20_000 });
    await expect(page.getByText("0 SUI")).toHaveCount(0);
  } finally {
    await responder.close();
  }
});

async function installTransportFixture(page: import("@playwright/test").Page, rpcUrl: string) {
  await page.addInitScript(({ rpcUrl: endpoint, tutorialKey, tutorialState }) => {
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
  }, { rpcUrl, tutorialKey: TUTORIAL_STORAGE_KEY, tutorialState: SEEN_TUTORIAL_STORAGE_STATE });
}
