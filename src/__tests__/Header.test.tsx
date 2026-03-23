import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Header from "../components/Header";

vi.mock("../components/WalletStatus", () => ({
  default: () => <div>Wallet Status Slot</div>,
}));

vi.mock("../components/DeploymentTargetControl", () => ({
  default: () => <div>Deployment Target Control Slot</div>,
}));

describe("Header", () => {
  it("renders the banner with logo, title, and wallet action area", () => {
    render(<Header activeView="visual" onViewChange={() => undefined} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByAltText("Frontier Flow")).toBeInTheDocument();
    expect(screen.getByText("Frontier Flow")).toBeVisible();
    expect(screen.getByRole("button", { name: "Visual" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Move" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Authorize" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.getByText("Deployment Target Control Slot")).toBeVisible();
    expect(screen.getByText("Wallet Status Slot")).toBeVisible();
  });

  it("disables the build button during active compilation", () => {
    render(<Header isCompiling={true} />);

    expect(screen.getByRole("button", { name: "Building" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Building" })).not.toHaveAttribute("aria-disabled");
  });

  it("disables the build button when no build handler is provided", () => {
    render(<Header />);

    expect(screen.getByRole("button", { name: "Build" })).toBeDisabled();
  });

  it("invokes the build handler when manual build is requested", () => {
    const onBuild = vi.fn();

    render(<Header onBuild={onBuild} />);

    fireEvent.click(screen.getByRole("button", { name: "Build" }));

    expect(onBuild).toHaveBeenCalledTimes(1);
  });

  it("lets the user switch the primary view", () => {
    const onViewChange = vi.fn();

    render(<Header activeView="visual" hasAuthorizeAccess={true} onViewChange={onViewChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    fireEvent.click(screen.getByRole("button", { name: "Authorize" }));

    expect(onViewChange).toHaveBeenCalledWith("move");
    expect(onViewChange).toHaveBeenCalledWith("authorize");
    expect(screen.getByRole("button", { name: "Visual" })).toHaveAttribute("aria-current", "page");
  });

  it("disables the Authorize tab until a deployment is available", () => {
    render(<Header activeView="visual" hasAuthorizeAccess={false} onViewChange={() => undefined} />);

    const authorizeButton = screen.getByRole("button", { name: "Authorize" });

    expect(authorizeButton).toBeDisabled();
    expect(authorizeButton).toHaveAttribute("aria-disabled", "true");
    expect(authorizeButton).toHaveAttribute("title", "Deploy a contract first");
  });

  it("does not surface lifecycle automation actions outside the current feature scope", () => {
    render(<Header onBuild={() => undefined} />);

    expect(screen.queryByRole("button", { name: /Anchor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Online/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Offline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Unanchor/i })).not.toBeInTheDocument();
  });
});