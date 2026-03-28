import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Transaction } from "@mysten/sui/transactions";
import type { WriteBlobFlow } from "@mysten/walrus";

import { createTestFlowNode } from "../test/graphInteractionTestUtils";
import { createNamedFlowContract, type PublishedGraphProvenance } from "../utils/contractStorage";
import { useGraphTransfer, type GraphTransferWalletBridge } from "../hooks/useGraphTransfer";

describe("useGraphTransfer", () => {
  it("exports the active contract as YAML", async () => {
    const contract = createNamedFlowContract("Raid Response", [createTestFlowNode("node_a", "aggression")], []);
    const downloadFile = vi.fn();
    const onImportComplete = vi.fn();
    const onPublishComplete = vi.fn();

    const { result } = renderHook(() => useGraphTransfer({
      activeContract: contract,
      draftContractName: contract.name,
      downloadFile,
      edges: contract.edges,
      nodes: contract.nodes,
      onImportComplete,
      onPublishComplete,
    }));

    await act(async () => {
      await result.current.startExport();
    });

    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe("success");
    expect(result.current.state.result?.downloadName).toBe("raid-response.frontier-flow.yaml");
    expect(onImportComplete).not.toHaveBeenCalled();
  });

  it("imports a YAML file into a named contract", async () => {
    const contract = createNamedFlowContract("Raid Response", [createTestFlowNode("node_a", "aggression")], []);
    const onImportComplete = vi.fn(() => ({ importedName: "Raid Response (2)", originalImportedName: "Raid Response" }));

    const { result } = renderHook(() => useGraphTransfer({
      activeContract: contract,
      draftContractName: contract.name,
      edges: contract.edges,
      nodes: contract.nodes,
      onImportComplete,
      onPublishComplete: vi.fn(),
    }));

    const file = new File([
      [
        "version: 1",
        "kind: frontier-flow-graph",
        "exportedAt: 2026-03-23T12:00:00.000Z",
        "appVersion: 1.2.3",
        "contract:",
        "  name: Raid Response",
        "  updatedAt: 2026-03-23T12:00:00.000Z",
        "  source:",
        "    channel: yaml-export",
        "graph:",
        "  nodes:",
        "    - id: node_a",
        "      type: aggression",
        "      position:",
        "        x: 0",
        "        y: 0",
        "      data:",
        "        type: aggression",
        "        label: Aggression",
        "        description: Aggression test node",
        "        color: var(--socket-any)",
        "        category: action",
        "        sockets: []",
        "  edges: []",
        "  summary:",
        "    nodeCount: 1",
        "    edgeCount: 0",
      ].join("\n"),
    ], "raid-response.frontier-flow.yaml", { type: "application/x.frontier-flow+yaml" });

    await act(async () => {
      await result.current.startImportFromFile(file);
    });

    expect(onImportComplete).toHaveBeenCalledWith(expect.objectContaining({ name: "Raid Response" }));
    expect(result.current.state.status).toBe("success");
    expect(result.current.state.result?.importedName).toBe("Raid Response (2)");
    expect(result.current.state.message).toContain("avoid overwriting an existing contract");
  });

  it("publishes to Walrus through the wallet bridge and stores provenance", async () => {
    const contract = createNamedFlowContract("Raid Response", [createTestFlowNode("node_a", "aggression")], []);
    const onPublishComplete = vi.fn<(provenance: PublishedGraphProvenance) => void>();
    const encode = vi.fn().mockResolvedValue(undefined);
    const registerTransaction = { kind: "register" } as unknown as Transaction;
    const certifyTransaction = { kind: "certify" } as unknown as Transaction;
    const register = vi.fn(() => registerTransaction);
    const upload = vi.fn(() => Promise.resolve({ blobId: "blob-123", blobObjectId: "0xblob", step: "uploaded" as const }));
    const certify = vi.fn(() => certifyTransaction);
    const publishFlow = {
      certify,
      encode,
      executeCertify: vi.fn(),
      executeRegister: vi.fn(),
      getBlob: vi.fn(),
      register,
      run: vi.fn(),
      upload,
    } as unknown as WriteBlobFlow;
    const walletBridge: GraphTransferWalletBridge = {
      accountAddress: "0x1234",
      walletConnected: true,
      signAndExecuteTransaction: vi.fn(() => Promise.resolve({ digest: "0xdigest" })),
    };

    const { result } = renderHook(() => useGraphTransfer({
      activeContract: contract,
      createClient: () => ({
        createPublishFlow: () => publishFlow,
        readGraphYaml: vi.fn(() => Promise.resolve("")),
      }),
      draftContractName: contract.name,
      edges: contract.edges,
      nodes: contract.nodes,
      onImportComplete: vi.fn(() => ({ importedName: contract.name })),
      onPublishComplete,
      walletBridge,
    }));

    await act(async () => {
      await result.current.startPublishToWalrus();
    });

    expect(encode).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledWith({ digest: "0xdigest" });
    expect(certify).toHaveBeenCalledTimes(1);
    expect(walletBridge.signAndExecuteTransaction).toHaveBeenCalledTimes(2);
    expect(onPublishComplete).toHaveBeenCalledTimes(1);
    expect(result.current.state.result?.walrusReference).toEqual(expect.objectContaining({
      blobId: "blob-123",
      blobObjectId: "0xblob",
      contentType: "application/x.frontier-flow+yaml",
      network: "testnet",
    }));
    expect(typeof result.current.state.result?.walrusReference?.publishedAt).toBe("string");
    expect(result.current.state.status).toBe("success");
  });

  it("does not mutate import state when a Walrus lookup fails", async () => {
    const contract = createNamedFlowContract("Raid Response", [createTestFlowNode("node_a", "aggression")], []);
    const onImportComplete = vi.fn(() => ({ importedName: contract.name }));
    const unusedCreatePublishFlow: () => WriteBlobFlow = () => {
      throw new Error("unused in import test");
    };

    const { result } = renderHook(() => useGraphTransfer({
      activeContract: contract,
      createClient: () => ({
        createPublishFlow: unusedCreatePublishFlow,
        readGraphYaml: vi.fn(() => Promise.reject(new Error("Blob not found"))),
      }),
      draftContractName: contract.name,
      edges: contract.edges,
      nodes: contract.nodes,
      onImportComplete,
      onPublishComplete: vi.fn(() => undefined),
    }));

    await act(async () => {
      await result.current.startImportFromWalrus("blob-missing");
    });

    expect(onImportComplete).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("error");
    expect(result.current.state.message).toContain("Blob not found");
  });
});