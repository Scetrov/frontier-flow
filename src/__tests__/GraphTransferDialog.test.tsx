import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GraphTransferDialog from "../components/GraphTransferDialog";
import { createNamedFlowContract } from "../utils/contractStorage";

describe("GraphTransferDialog", () => {
  it("disables publish while the wallet is disconnected", () => {
    render(
      <GraphTransferDialog
        activeContract={createNamedFlowContract("Raid Response", [], [])}
        onDismiss={vi.fn()}
        onExport={vi.fn(() => Promise.resolve())}
        onImportFromFile={vi.fn(() => Promise.resolve())}
        onImportFromWalrus={vi.fn(() => Promise.resolve())}
        onPublish={vi.fn(() => Promise.resolve())}
        state={{ isOpen: true, message: null, mode: "publish", result: null, status: "collecting-input" }}
        walletConnected={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Export Walrus" })).toBeDisabled();
  });

  it("focuses the dismiss button and closes on escape", () => {
    const onDismiss = vi.fn();

    render(
      <GraphTransferDialog
        activeContract={createNamedFlowContract("Raid Response", [], [])}
        onDismiss={onDismiss}
        onExport={vi.fn(() => Promise.resolve())}
        onImportFromFile={vi.fn(() => Promise.resolve())}
        onImportFromWalrus={vi.fn(() => Promise.resolve())}
        onPublish={vi.fn(() => Promise.resolve())}
        state={{ isOpen: true, message: null, mode: "import-walrus", result: null, status: "collecting-input" }}
        walletConnected={true}
      />,
    );

    const dismissButton = screen.getByRole("button", { name: "Dismiss graph transfer dialog" });
    expect(dismissButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders import conflict details and error feedback", () => {
    render(
      <GraphTransferDialog
        activeContract={createNamedFlowContract("Raid Response", [], [])}
        onDismiss={vi.fn()}
        onExport={vi.fn(() => Promise.resolve())}
        onImportFromFile={vi.fn(() => Promise.resolve())}
        onImportFromWalrus={vi.fn(() => Promise.resolve())}
        onPublish={vi.fn(() => Promise.resolve())}
        state={{
          isOpen: true,
          message: "Imported Aggressor First as Aggressor First (2) to avoid overwriting an existing contract.",
          mode: "import-file",
          result: { importedName: "Aggressor First (2)", originalImportedName: "Aggressor First" },
          status: "error",
        }}
        walletConnected={true}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("avoid overwriting an existing contract");
    expect(screen.getByText("Imported contract")).toBeInTheDocument();
    expect(screen.getByText("Aggressor First (2)")).toBeInTheDocument();
  });

  it("renders Walrus result details and supports dismissal", () => {
    const onDismiss = vi.fn();

    render(
      <GraphTransferDialog
        activeContract={createNamedFlowContract("Raid Response", [], [])}
        onDismiss={onDismiss}
        onExport={vi.fn(() => Promise.resolve())}
        onImportFromFile={vi.fn(() => Promise.resolve())}
        onImportFromWalrus={vi.fn(() => Promise.resolve())}
        onPublish={vi.fn(() => Promise.resolve())}
        state={{
          isOpen: true,
          message: "Published Raid Response to Walrus.",
          mode: "publish",
          result: {
            walrusReference: {
              blobId: "blob-123",
              contentType: "application/x.frontier-flow+yaml",
              network: "testnet",
              publishedAt: "2026-03-23T12:00:00.000Z",
            },
          },
          status: "success",
        }}
        walletConnected={true}
      />,
    );

    expect(screen.getByText("Walrus blob id")).toBeInTheDocument();
    expect(screen.getByText("blob-123")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss graph transfer dialog" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});