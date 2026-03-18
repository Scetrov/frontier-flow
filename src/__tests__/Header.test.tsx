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
    expect(screen.getByRole("button", { name: "Move" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Build" })).toBeVisible();
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

  it("lets the user switch the primary view", () => {
    const onViewChange = vi.fn();

    render(<Header activeView="visual" onViewChange={onViewChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    expect(onViewChange).toHaveBeenCalledWith("move");
    expect(screen.getByRole("button", { name: "Visual" })).toHaveAttribute("aria-current", "page");
  });
});