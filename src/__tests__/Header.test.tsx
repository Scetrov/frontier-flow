import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Header from "../components/Header";

vi.mock("../components/WalletStatus", () => ({
  default: () => <div>Wallet Status Slot</div>,
}));

describe("Header", () => {
  it("renders the banner with logo, title, and wallet action area", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByAltText("Frontier Flow")).toBeInTheDocument();
    expect(screen.getByText("Frontier Flow")).toBeVisible();
    expect(screen.getByText("Wallet Status Slot")).toBeVisible();
  });
});