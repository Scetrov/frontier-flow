import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VisualDeploymentTargetSelector from "../components/VisualDeploymentTargetSelector";
import { getLocalDeploymentTargetLabel, LOCAL_ENVIRONMENT_STORAGE_KEY } from "../data/localEnvironment";

describe("VisualDeploymentTargetSelector", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the supported network and server targets", () => {
    render(<VisualDeploymentTargetSelector onTargetChange={() => undefined} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Target network/server" }));

    const options = screen.getAllByRole("menuitemradio").map((option) => option.textContent);

    expect(options).toEqual([getLocalDeploymentTargetLabel(), "testnet:stillness", "testnet:utopia"]);
  });

  it("notifies when the selected target changes", () => {
    const handleTargetChange = vi.fn();

    render(<VisualDeploymentTargetSelector onTargetChange={handleTargetChange} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Target network/server" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "testnet:stillness" }));

    expect(handleTargetChange).toHaveBeenCalledWith("testnet:stillness");
  });

  it("opens local settings from the local target row and saves trimmed validated values", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      data: {
        object: {
          address: "0xabc123",
          asMovePackage: {
            address: "0xabc123",
          },
        },
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));

    render(<VisualDeploymentTargetSelector onTargetChange={() => undefined} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Target network/server" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Configure local environment" }));

    expect(screen.getByRole("dialog", { name: "Local deployment settings" })).toBeVisible();

    fireEvent.change(screen.getByLabelText("RPC URL"), { target: { value: "  http://localhost:9001  " } });
    fireEvent.change(screen.getByLabelText("GraphQL URL"), { target: { value: "  http://localhost:9124/graphql  " } });
    fireEvent.change(screen.getByLabelText("World Package ID"), { target: { value: "  0xabc123  " } });
    fireEvent.change(screen.getByLabelText("World Package Version"), { target: { value: "  0.0.21  " } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Local deployment settings" })).not.toBeInTheDocument();
    });

    expect(JSON.parse(window.localStorage.getItem(LOCAL_ENVIRONMENT_STORAGE_KEY) ?? "{}")).toMatchObject({
      rpcUrl: "http://localhost:9001",
      graphQlUrl: "http://localhost:9124/graphql",
      worldPackageId: "0xabc123",
      worldPackageVersion: "0.0.21",
    });
  });

  it("shows validation errors instead of saving malformed local environment values", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<VisualDeploymentTargetSelector onTargetChange={() => undefined} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Target network/server" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Configure local environment" }));

    fireEvent.change(screen.getByLabelText("RPC URL"), { target: { value: "not-a-url" } });
    fireEvent.change(screen.getByLabelText("GraphQL URL"), { target: { value: "still-not-a-url" } });
    fireEvent.change(screen.getByLabelText("World Package ID"), { target: { value: "abc" } });
    fireEvent.change(screen.getByLabelText("World Package Version"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a valid HTTP or HTTPS RPC URL.")).toBeVisible();
    expect(screen.getByText("Enter a valid HTTP or HTTPS GraphQL URL.")).toBeVisible();
    expect(screen.getByText("Enter a valid 0x-prefixed hex world package id.")).toBeVisible();
    expect(screen.getByText("Enter a valid semantic version such as 0.0.18.")).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(LOCAL_ENVIRONMENT_STORAGE_KEY)).toBeNull();
  });

  it("includes the local settings action in arrow-key navigation", () => {
    render(<VisualDeploymentTargetSelector onTargetChange={() => undefined} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Target network/server" }));

    const localTarget = screen.getByRole("menuitemradio", { name: getLocalDeploymentTargetLabel() });
    expect(localTarget).toHaveFocus();

    fireEvent.keyDown(localTarget, { key: "ArrowDown" });

    const settingsAction = screen.getByRole("menuitem", { name: "Configure local environment" });
    expect(settingsAction).toHaveFocus();

    fireEvent.keyDown(settingsAction, { key: "Enter" });

    expect(screen.getByRole("dialog", { name: "Local deployment settings" })).toBeVisible();
  });
});