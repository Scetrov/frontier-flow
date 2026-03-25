import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import VisualDeploymentTargetSelector from "../components/VisualDeploymentTargetSelector";

describe("VisualDeploymentTargetSelector", () => {
  it("renders the supported network and server targets", () => {
    render(<VisualDeploymentTargetSelector onTargetChange={() => undefined} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Target network/server" }));

    const options = screen.getAllByRole("menuitemradio").map((option) => option.textContent);

    expect(options).toEqual(["local", "testnet:stillness", "testnet:utopia"]);
  });

  it("notifies when the selected target changes", () => {
    const handleTargetChange = vi.fn();

    render(<VisualDeploymentTargetSelector onTargetChange={handleTargetChange} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Target network/server" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "testnet:stillness" }));

    expect(handleTargetChange).toHaveBeenCalledWith("testnet:stillness");
  });
});