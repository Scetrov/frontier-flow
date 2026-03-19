import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import KitchenSinkPage from "../components/KitchenSinkPage";
import { createKitchenSinkNodes } from "../data/kitchenSinkFlow";

vi.mock("../components/CanvasWorkspace", () => ({
  default: () => <div>Canvas Workspace Slot</div>,
}));

describe("KitchenSinkPage", () => {
  it("shows the number of nodes rendered in the preview", () => {
    render(<KitchenSinkPage />);

    expect(screen.getByText(`${String(createKitchenSinkNodes().length)} nodes across event triggers, accessors, logic gates, and actions.`)).toBeInTheDocument();
  });
});