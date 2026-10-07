import { afterEach, describe, expect, it, vi } from "vitest";

import { loadLocalEnvironmentConfig, saveLocalEnvironmentConfig } from "../data/localEnvironment";
import { getWalrusGraphConfig } from "../utils/walrusGraphConfig";

const { mockWriteBlobFlow, mockGetBlob, mockWalrus, mockExtend, constructedClients } = vi.hoisted(() => ({
  mockWriteBlobFlow: vi.fn(),
  mockGetBlob: vi.fn(),
  mockWalrus: vi.fn(),
  mockExtend: vi.fn(),
  constructedClients: [] as Array<Record<string, unknown>>,
}));

vi.mock("@mysten/sui/grpc", () => ({
  SuiGrpcClient: class {
    constructor(options: Record<string, unknown>) {
      constructedClients.push(options);
    }

    $extend = mockExtend;
  },
}));

vi.mock("@mysten/walrus", () => ({
  walrus: mockWalrus,
}));

import { createWalrusGraphClient, isWalrusUploadedStep } from "../utils/walrusGraphClient";

afterEach(() => {
  window.localStorage.clear();
  constructedClients.length = 0;
});

describe("walrusGraphClient", () => {
  it("keeps the Walrus gRPC client on testnet after a local endpoint edit", () => {
    saveLocalEnvironmentConfig(window.localStorage, {
      ...loadLocalEnvironmentConfig(),
      rpcUrl: "http://127.0.0.1:19000",
    });
    mockExtend.mockReturnValue({ walrus: { getBlob: mockGetBlob, writeBlobFlow: mockWriteBlobFlow } });

    createWalrusGraphClient();

    expect(constructedClients).toEqual([{
      network: "testnet",
      baseUrl: getWalrusGraphConfig().suiRpcUrl,
    }]);
    expect(getWalrusGraphConfig().suiRpcUrl).toBe("https://fullnode.testnet.sui.io:443");
    expect(JSON.stringify(constructedClients)).not.toContain("127.0.0.1");
  });

  it("creates publish flows and reads YAML through the extended Walrus client", async () => {
    const publishFlow = { register: vi.fn(), upload: vi.fn(), certify: vi.fn(), encode: vi.fn() };

    mockWalrus.mockReturnValue({ extension: "walrus" });
    mockWriteBlobFlow.mockReturnValue(publishFlow);
    mockGetBlob.mockResolvedValue({ asFile: () => ({ text: () => Promise.resolve("kind: frontier-flow-graph") }) });
    mockExtend.mockReturnValue({ walrus: { getBlob: mockGetBlob, writeBlobFlow: mockWriteBlobFlow } });

    const client = createWalrusGraphClient({ wasmUrl: "/walrus.wasm" });
    const flow = client.createPublishFlow("yaml-content");
    const yaml = await client.readGraphYaml("blob-123");

    expect(flow).toBe(publishFlow);
    expect(mockWriteBlobFlow).toHaveBeenCalledTimes(1);
    expect(mockWalrus).toHaveBeenCalledWith(expect.objectContaining({
      uploadRelay: {
        host: "https://upload-relay.testnet.walrus.space",
        sendTip: {
          max: 1000,
        },
      },
    }));
    expect(mockGetBlob).toHaveBeenCalledWith({ blobId: "blob-123" });
    expect(yaml).toBe("kind: frontier-flow-graph");
  });

  it("recognizes uploaded Walrus steps", () => {
    expect(isWalrusUploadedStep({ step: "uploaded" })).toBe(true);
    expect(isWalrusUploadedStep({ step: "registering" })).toBe(false);
  });
});