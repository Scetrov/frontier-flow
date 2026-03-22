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

  it("marks the selected target as checked when the target menu opens", () => {
    render(<DeploymentTargetControl canDeploy={true} onDeploy={() => undefined} selectedTarget="testnet:utopia" />);

    fireEvent.click(screen.getByRole("button", { name: "Select deployment target" }));

    expect(screen.getByRole("menuitemradio", { name: "testnet:utopia" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "local" })).toHaveAttribute("aria-checked", "false");
  });

  it("closes the target menu when escape is pressed", () => {
    render(<DeploymentTargetControl canDeploy={true} onDeploy={() => undefined} selectedTarget="local" />);

    fireEvent.click(screen.getByRole("button", { name: "Select deployment target" }));
    fireEvent.keyDown(screen.getByRole("menu", { name: "Deployment targets" }), { key: "Escape" });

    expect(screen.queryByRole("menu", { name: "Deployment targets" })).not.toBeInTheDocument();
  });

  it("supports keyboard target selection from the toggle button", () => {
    const handleTargetChange = vi.fn();

    render(
      <DeploymentTargetControl
        canDeploy={true}
        onDeploy={() => undefined}
        onTargetChange={handleTargetChange}
        selectedTarget="local"
      />, 
    );

    const toggleButton = screen.getByRole("button", { name: "Select deployment target" });
    fireEvent.keyDown(toggleButton, { key: "ArrowDown" });

    expect(screen.getByRole("menuitemradio", { name: "local" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("menu", { name: "Deployment targets" }), { key: "ArrowDown" });
    expect(screen.getByRole("menuitemradio", { name: "testnet:stillness" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("menuitemradio", { name: "testnet:stillness" }), { key: "Enter" });

    expect(handleTargetChange).toHaveBeenCalledWith("testnet:stillness");
    expect(toggleButton).toHaveFocus();
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

    const deployButton = screen.getByRole("button", { name: "Deploy local" });

    expect(deployButton).toHaveAttribute("aria-describedby");
    expect(deployButton).toHaveAttribute("title", "Review blockers for local deployment");

    fireEvent.click(deployButton);

    expect(handleDeploy).toHaveBeenCalledTimes(1);
  });

  it("keeps the target chooser accessible while the primary action is busy", () => {
    render(
      <DeploymentTargetControl
        canDeploy={true}
        isDeploying={true}
        onDeploy={() => undefined}
        selectedTarget="testnet:stillness"
      />,
    );

    expect(screen.getByRole("button", { name: "Deploying testnet:stillness" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Select deployment target" })).toHaveAttribute("aria-haspopup", "menu");
  });

  it("uses upgrade-specific copy for in-progress state and blocker guidance", () => {
    render(
      <DeploymentTargetControl
        canDeploy={false}
        isDeploying={true}
        isUpgrade={true}
        onDeploy={() => undefined}
        selectedTarget="testnet:utopia"
      />,
    );

    expect(screen.getByRole("button", { name: "Upgrading testnet:utopia" })).toHaveAttribute(
      "title",
      "Review blockers for testnet:utopia upgrade",
    );
  });
});