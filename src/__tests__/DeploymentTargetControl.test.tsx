import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DeploymentTargetControl from "../components/DeploymentTargetControl";

describe("DeploymentTargetControl", () => {
  it("renders the selected target in the primary deploy action", () => {
    render(<DeploymentTargetControl canDeploy={true} onDeploy={() => undefined} selectedTarget="local" />);

    expect(screen.getByRole("button", { name: "Deploy local" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Select deployment target" })).toBeVisible();
  });

  it("highlights both halves when either side is hovered", () => {
    const { container } = render(
      <DeploymentTargetControl canDeploy={true} onDeploy={() => undefined} selectedTarget="local" />,
    );

    const control = container.querySelector(".ff-deployment-target-control");

    expect(control).not.toHaveClass("ff-deployment-target-control--active");

    fireEvent.mouseEnter(screen.getByRole("button", { name: "Select deployment target" }));

    expect(control).toHaveClass("ff-deployment-target-control--active");

    fireEvent.mouseLeave(control as Element);

    expect(control).not.toHaveClass("ff-deployment-target-control--active");
  });

  it("opens the target list and notifies when a new target is chosen", () => {
    const handleTargetChange = vi.fn();

    render(
      <DeploymentTargetControl
        canDeploy={true}
        onDeploy={() => undefined}
        onTargetChange={handleTargetChange}
        selectedTarget="local"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select deployment target" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "testnet:stillness" }));

    expect(handleTargetChange).toHaveBeenCalledWith("testnet:stillness");
    expect(screen.queryByRole("menuitemradio", { name: "testnet:utopia" })).not.toBeInTheDocument();
  });

  it("closes the target menu when escape is pressed", () => {
    render(<DeploymentTargetControl canDeploy={true} onDeploy={() => undefined} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Select deployment target" }));
    fireEvent.keyDown(screen.getByRole("menu", { name: "Deployment targets" }), { key: "Escape" });

    expect(screen.queryByRole("menu", { name: "Deployment targets" })).not.toBeInTheDocument();
  });

  it("launches deployment from the primary action", () => {
    const handleDeploy = vi.fn();

    render(<DeploymentTargetControl canDeploy={true} onDeploy={handleDeploy} selectedTarget="testnet:utopia" />);

    fireEvent.click(screen.getByRole("button", { name: "Deploy testnet:utopia" }));

    expect(handleDeploy).toHaveBeenCalledTimes(1);
  });

  it("keeps deployment clickable so blocker feedback can be surfaced", () => {
    const handleDeploy = vi.fn();

    render(<DeploymentTargetControl canDeploy={false} onDeploy={handleDeploy} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Deploy local" }));

    expect(handleDeploy).toHaveBeenCalledTimes(1);
  });
});