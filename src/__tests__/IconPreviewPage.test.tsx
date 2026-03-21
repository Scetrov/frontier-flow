import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import IconPreviewPage from "../components/IconPreviewPage";

describe("IconPreviewPage", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders the preview index on /icon-preview", () => {
    window.history.replaceState({}, "", "/icon-preview");

    render(<IconPreviewPage />);

    expect(screen.getByRole("heading", { name: "Header action icon alternatives" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Open Conservative Set" })).toHaveAttribute("href", "/icon-preview/conservative");
    expect(screen.getByRole("link", { name: "Open Product-Fit Set" })).toHaveAttribute("href", "/icon-preview/product-fit");
    expect(screen.getByRole("link", { name: "Open Engineering Set" })).toHaveAttribute("href", "/icon-preview/engineering");
    expect(screen.getByRole("link", { name: "Build Tool Study" })).toHaveAttribute("href", "/icon-preview/build-tools");
    expect(screen.getByRole("link", { name: "Build Concept Study" })).toHaveAttribute("href", "/icon-preview/build-concepts");
  });

  it("renders a dedicated page for a selected icon set", () => {
    window.history.replaceState({}, "", "/icon-preview/product-fit");

    render(<IconPreviewPage />);

    expect(screen.getByRole("heading", { name: "Product-Fit Set" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Deploy testnet:utopia" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Build" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Connect" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Engineering Set" })).toHaveAttribute("href", "/icon-preview/engineering");
  });

  it("renders the build tool study page", () => {
    window.history.replaceState({}, "", "/icon-preview/build-tools");

    render(<IconPreviewPage />);

    expect(screen.getByRole("heading", { name: "Build tool study" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Claw Hammer" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Crossed Tools" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Cog + Hammer" })).toBeVisible();
  });

  it("renders the build concept study page", () => {
    window.history.replaceState({}, "", "/icon-preview/build-concepts");

    render(<IconPreviewPage />);

    expect(screen.getByRole("heading", { name: "Build concept study" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Package" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Blueprint" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Node Assembly" })).toBeVisible();
  });
});