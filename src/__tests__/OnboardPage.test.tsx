import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OnboardPage from "../components/OnboardPage";
import type { StoredDeploymentState } from "../types/authorization";
import { SHARED_EXTENSION_STORAGE_KEY } from "../utils/sharedExtensionStorage";
import { UI_STATE_STORAGE_KEY } from "../utils/uiStateStorage";

const mockResolve = vi.fn<(input: unknown) => Promise<StoredDeploymentState>>();

vi.mock("../hooks/useAuthorizationContracts", () => ({
  resolveSharedAuthorizationContract: (input: unknown) => mockResolve(input),
}));

const PACKAGE = "0xfeedface";
const SEARCH = `?package=${PACKAGE}&module=starter_contract&network=testnet:stillness`;

const resolved: StoredDeploymentState = {
  version: 1,
  packageId: PACKAGE,
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: PACKAGE,
  deployedAt: new Date(0).toISOString(),
  contractName: "Starter Contract",
};

function saved(): readonly { readonly packageId: string }[] {
  return JSON.parse(window.localStorage.getItem(SHARED_EXTENSION_STORAGE_KEY) ?? "[]") as readonly { readonly packageId: string }[];
}

beforeEach(() => {
  window.localStorage.clear();
  mockResolve.mockReset();
  mockResolve.mockResolvedValue(resolved);
});

afterEach(() => { window.localStorage.clear(); vi.restoreAllMocks(); });

describe("OnboardPage", () => {
  it("shows what the link names once the package is verified", async () => {
    render(<OnboardPage search={SEARCH} />);

    expect(await screen.findByText("Starter Contract")).toBeVisible();
    expect(screen.getByText(PACKAGE)).toBeVisible();
    expect(screen.getByText("testnet:stillness")).toBeVisible();
    expect(screen.getByRole("button", { name: "Use this contract" })).toBeVisible();
  });

  it("states that verification covers identity rather than safety", async () => {
    render(<OnboardPage search={SEARCH} />);

    expect(await screen.findByText(/Only authorize logic you trust\./)).toBeVisible();
    expect(screen.getByText(/not that its behavior is safe/)).toBeVisible();
  });

  it("saves nothing and authorizes nothing before the reader confirms", async () => {
    render(<OnboardPage search={SEARCH} />);

    await screen.findByRole("button", { name: "Use this contract" });
    expect(saved()).toEqual([]);
    expect(window.localStorage.getItem(UI_STATE_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ["an empty link", "", /carries no contract details/],
    ["a malformed package id", "?package=nope&module=starter_contract&network=testnet:stillness", /valid package id/],
    ["an unsupported network", `?package=${PACKAGE}&module=starter_contract&network=local`, /supported network/],
  ])("refuses %s without reaching the network", async (_label, search, reason) => {
    render(<OnboardPage search={search} />);

    expect(await screen.findByText(reason)).toBeVisible();
    expect(mockResolve).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Use this contract" })).toBeNull();
  });

  it("refuses a link whose module disagrees with the package", async () => {
    mockResolve.mockResolvedValue({ ...resolved, moduleName: "something_else" });

    render(<OnboardPage search={SEARCH} />);

    expect(await screen.findByText(/names the module "starter_contract", but that package declares "something_else"/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Use this contract" })).toBeNull();
    expect(saved()).toEqual([]);
  });

  it("surfaces the resolver's own explanation when the package cannot be used", async () => {
    mockResolve.mockRejectedValue(new Error("That package has no turret extension module (no TurretAuth witness was found)."));

    render(<OnboardPage search={SEARCH} />);

    expect(await screen.findByText("That package has no turret extension module (no TurretAuth witness was found).")).toBeVisible();
    expect(saved()).toEqual([]);
  });

  it("saves the contract and opens authorize only on confirmation", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { assign, origin: "http://localhost", search: SEARCH } });

    render(<OnboardPage search={SEARCH} origin="/" />);
    (await screen.findByRole("button", { name: "Use this contract" })).click();

    await waitFor(() => { expect(saved()).toEqual([expect.objectContaining({ packageId: PACKAGE })]); });
    expect(JSON.parse(window.localStorage.getItem(UI_STATE_STORAGE_KEY) ?? "{}")).toMatchObject({
      activeView: "authorize",
      selectedDeploymentTarget: "testnet:stillness",
    });
    expect(assign).toHaveBeenCalledWith("/");
  });
});
