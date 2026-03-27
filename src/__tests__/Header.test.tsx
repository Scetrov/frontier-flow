import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Header from "../components/Header";

vi.mock("../components/WalletStatus", () => ({
  default: () => <div>Wallet Status Slot</div>,
}));

describe("Header", () => {
  it("renders the banner with logo, title, and wallet action area", () => {
    render(<Header activeView="visual" onViewChange={() => undefined} />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByAltText("Frontier Flow")).toBeInTheDocument();
    expect(screen.getByText("Frontier Flow")).toBeVisible();
    expect(screen.getByRole("button", { name: "Visual" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Code" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Authorize" })).toBeVisible();
    expect(screen.getByText("Wallet Status Slot")).toBeVisible();
    expect(screen.getAllByText("▶")).toHaveLength(3);
  });

  it("disables the move and deploy tabs until automatic compile has settled", () => {
    render(<Header isCompiling={true} onViewChange={() => undefined} />);

    expect(screen.getByRole("button", { name: "Code" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Code" })).toHaveAttribute("title", "Automatic compile is in progress");
    expect(screen.getByRole("button", { name: "Deploy" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deploy" })).toHaveAttribute("title", "Automatic compile is in progress");
  });

  it("surfaces the waiting tooltip before move and deploy unlock", () => {
    render(<Header onViewChange={() => undefined} />);

    expect(screen.getByRole("button", { name: "Code" })).toHaveAttribute("title", "Automatic compile will unlock Code after the current graph settles");
    expect(screen.getByRole("button", { name: "Deploy" })).toHaveAttribute("title", "Compile the current graph before reviewing deploy checks");
  });

  it("lets the user switch the primary view", () => {
    const onViewChange = vi.fn();

    render(
      <Header
        activeView="visual"
        canAccessDeploy={true}
        canAccessMove={true}
        hasAuthorizeAccess={true}
        onViewChange={onViewChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Code" }));
    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
    fireEvent.click(screen.getByRole("button", { name: "Authorize" }));

    expect(onViewChange).toHaveBeenCalledWith("move");
    expect(onViewChange).toHaveBeenCalledWith("deploy");
    expect(onViewChange).toHaveBeenCalledWith("authorize");
    expect(screen.getByRole("button", { name: "Visual" })).toHaveAttribute("aria-current", "page");
  });

  it("disables the Authorize tab until a deployment is available", () => {
    render(<Header activeView="visual" canAccessDeploy={true} canAccessMove={true} hasAuthorizeAccess={false} onViewChange={() => undefined} />);

    const authorizeButton = screen.getByRole("button", { name: "Authorize" });

    expect(authorizeButton).toBeDisabled();
    expect(authorizeButton).toHaveAttribute("aria-disabled", "true");
    expect(authorizeButton).toHaveAttribute("title", "Deploy a contract first");
  });

  it("does not surface lifecycle automation actions outside the current feature scope", () => {
    render(<Header />);

    expect(screen.queryByRole("button", { name: /Anchor/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Build/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Online/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Offline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Unanchor/i })).not.toBeInTheDocument();
  });
});