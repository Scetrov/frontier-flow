import walrusWasmUrl from "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url";

const DEFAULT_TESTNET_UPLOAD_RELAY_HOST = "https://upload-relay.testnet.walrus.space";
const DEFAULT_UPLOAD_RELAY_TIP_MAX_MIST = 1_000;

export interface WalrusGraphConfig {
  readonly network: "testnet";
  readonly suiRpcUrl: string;
  readonly wasmUrl: string;
  readonly uploadRelayHost: string;
  readonly uploadRelayTipMaxMist: number;
  readonly epochs: number;
  readonly deletable: boolean;
}

export function getWalrusGraphConfig(): WalrusGraphConfig {
  const configuredTipMax = Number(import.meta.env.VITE_WALRUS_UPLOAD_RELAY_TIP_MAX);

  return {
    network: "testnet",
    suiRpcUrl: "https://fullnode.testnet.sui.io:443",
    wasmUrl: walrusWasmUrl,
    uploadRelayHost: import.meta.env.VITE_WALRUS_UPLOAD_RELAY_URL?.trim() || DEFAULT_TESTNET_UPLOAD_RELAY_HOST,
    uploadRelayTipMaxMist: Number.isFinite(configuredTipMax) && configuredTipMax > 0
      ? configuredTipMax
      : DEFAULT_UPLOAD_RELAY_TIP_MAX_MIST,
    epochs: 3,
    deletable: true,
  };
}