import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ColophonPage from "../components/ColophonPage";

describe("ColophonPage", () => {
  it("provides a link back to Frontier Flow", () => {
    render(<ColophonPage />);

    expect(screen.getByRole("link", { name: "Return to Frontier Flow" })).toHaveAttribute("href", "/");
  });
});