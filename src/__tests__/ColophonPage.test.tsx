import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ColophonPage from "../components/ColophonPage";

describe("ColophonPage", () => {
  it("renders the acknowledgements and project package manifest", () => {
    render(<ColophonPage />);

    expect(screen.getByRole("heading", { name: "Built with gratitude, shipped with a real toolchain." })).toBeVisible();
    expect(screen.getByText("CCP Games")).toBeVisible();
    expect(screen.getByText("Mysten Labs")).toBeVisible();
    expect(screen.getByText("zktx.io")).toBeVisible();
    expect(screen.getByText("The Builders of EVE Frontier")).toBeVisible();
    expect(screen.getByText("Everyone who tested Frontier Flow")).toBeVisible();
    expect(screen.getByRole("link", { name: "Return to Frontier Flow" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Runtime Packages")).toBeVisible();
    expect(screen.getByText("Development Packages")).toBeVisible();
    expect(screen.getByText("@mysten/dapp-kit")).toBeVisible();
    expect(screen.getByText("react")).toBeVisible();
    expect(screen.getByText("vitest")).toBeVisible();
  });
});