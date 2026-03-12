import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Header from "../components/Header";

describe("Header", () => {
  it("renders the banner with logo and title", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByAltText("Frontier Flow")).toBeInTheDocument();
    expect(screen.getByText("Frontier Flow")).toBeVisible();
  });
});