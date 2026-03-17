import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "../App";

vi.mock("../components/Header", () => ({
  default: () => <div>Header Slot</div>,
}));

vi.mock("../components/Footer", () => ({
  default: () => <div>Footer Slot</div>,
}));

vi.mock("../components/Sidebar", () => ({
  default: () => <div>Sidebar Slot</div>,
}));

vi.mock("../components/CanvasWorkspace", () => ({
  default: () => <div>Canvas Workspace Slot</div>,
}));

vi.mock("../components/KitchenSinkPage", () => ({
  default: () => <div>Kitchen Sink Slot</div>,
}));

describe("App", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders the default editor shell on the root route", () => {
    window.history.replaceState({}, "", "/");

    render(<App />);

    expect(screen.getByLabelText("Application shell")).toBeInTheDocument();
    expect(screen.getByText("Canvas Workspace Slot")).toBeInTheDocument();
    expect(screen.getByText("Sidebar Slot")).toBeInTheDocument();
    expect(screen.queryByText("Kitchen Sink Slot")).not.toBeInTheDocument();
  });

  it("renders the kitchen sink page on the /kitchen-sink route", () => {
    window.history.replaceState({}, "", "/kitchen-sink");

    render(<App />);

    expect(screen.getByText("Kitchen Sink Slot")).toBeInTheDocument();
    expect(screen.queryByLabelText("Application shell")).not.toBeInTheDocument();
    expect(screen.queryByText("Sidebar Slot")).not.toBeInTheDocument();
  });
});