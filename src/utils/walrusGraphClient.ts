import { SuiGrpcClient } from "@mysten/sui/grpc";
import { walrus, type WriteBlobFlow, type WriteBlobStepUploaded } from "@mysten/walrus";

import { getWalrusGraphConfig, type WalrusGraphConfig } from "./walrusGraphConfig";

export interface WalrusGraphClient {
  readonly createPublishFlow: (yamlContent: string) => WriteBlobFlow;
  readonly readGraphYaml: (blobId: string, signal?: AbortSignal) => Promise<string>;
}

/**
 * Builds the Walrus graph client used by transfer flows.
 */
export function createWalrusGraphClient(config: Partial<WalrusGraphConfig> = {}): WalrusGraphClient {
  const resolvedConfig = { ...getWalrusGraphConfig(), ...config };
  const suiClient = new SuiGrpcClient({
    network: resolvedConfig.network,
    baseUrl: resolvedConfig.suiRpcUrl,
  });
  const client = suiClient.$extend(
    walrus({
      wasmUrl: resolvedConfig.wasmUrl,
      uploadRelay: {
        host: resolvedConfig.uploadRelayHost,
        sendTip: {
          max: resolvedConfig.uploadRelayTipMaxMist,
        },
      },
    }),
  );

  return {
    createPublishFlow(yamlContent: string): WriteBlobFlow {
      return client.walrus.writeBlobFlow({ blob: new TextEncoder().encode(yamlContent) });
    },
    async readGraphYaml(blobId: string, signal?: AbortSignal): Promise<string> {
      void signal;
      const blob = await client.walrus.getBlob({ blobId });
      return blob.asFile().text();
    },
  };
}

export function isWalrusUploadedStep(step: unknown): step is WriteBlobStepUploaded {
  return typeof step === "object" && step !== null && "step" in step && step.step === "uploaded";
}