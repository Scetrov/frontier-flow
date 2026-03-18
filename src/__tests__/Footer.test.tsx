import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Footer from "../components/Footer";

describe("Footer", () => {
  it("renders version information, repository link, and idle compilation status", () => {
    render(<Footer />);

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText(`Build v${__APP_VERSION__}`)).toBeVisible();
    expect(screen.getByText("Idle")).toBeVisible();
    expect(screen.getByRole("link", { name: "Source Repository" })).toHaveAttribute(
      "href",
      "https://github.com/Scetrov/frontier-flow",
    );
  });
});