import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AlphaBanner from "../components/AlphaBanner";

describe("AlphaBanner", () => {
  it("renders the alpha warning with a link to GitHub Issues", () => {
    render(<AlphaBanner />);

    expect(screen.getByText("Alpha Software")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /github issues/i });
    expect(link).toHaveAttribute("href", "https://github.com/Scetrov/frontier-flow/issues");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("is dismissed when the close button is clicked", () => {
    render(<AlphaBanner />);

    expect(screen.getByText("Alpha Software")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dismiss alpha notice/i }));
    expect(screen.queryByText("Alpha Software")).not.toBeInTheDocument();
  });
});
