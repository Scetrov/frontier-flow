import { GrpcWebFetchTransport, SuiGrpcClient, type RpcTransport } from "@mysten/sui/grpc";

import type { DeploymentTarget, DeploymentTargetId } from "../compiler/types";
import { getDeploymentTarget } from "../data/deploymentTargets";

/** Resolve at use time so local endpoint edits never reuse a stale configuration. */
export function getSuiTargetConfig(targetId: DeploymentTargetId) {
  const target = getDeploymentTarget(targetId);
  return {
    targetId: target.id,
    baseUrl: target.rpcUrl,
    network: target.networkFamily === "local" ? "localnet" as const : "testnet" as const,
  };
}

export function createSuiTargetClient(target: Pick<DeploymentTarget, "networkFamily" | "rpcUrl">, requestOptions: { abort?: AbortSignal; timeout?: number } = {}): SuiGrpcClient {
  if (import.meta.env.PROD && target.networkFamily === "local") {
    const endpoint = new URL(target.rpcUrl);
    if (!["http:", "https:"].includes(endpoint.protocol)
      || !["localhost", "127.0.0.1"].includes(endpoint.hostname)
      || endpoint.username !== "" || endpoint.password !== "") {
      throw new Error("Deployed local gRPC access requires a localhost or 127.0.0.1 endpoint. Other origins require an explicitly reviewed CSP allowlist.");
    }
  }
  const network = target.networkFamily === "local" ? "localnet" : "testnet";
  const { abort, timeout } = requestOptions;
  if (!abort) return new SuiGrpcClient({ network, baseUrl: target.rpcUrl, timeout });

  // The SDK drops constructor-level abort. Apply this operation's signal after
  // native/Core call options are merged, so even an undefined per-call signal
  // cannot erase it. An explicit caller signal must remain effective too.
  const transport = new GrpcWebFetchTransport({ baseUrl: target.rpcUrl, timeout });
  const scopedTransport: RpcTransport = {
    mergeOptions(options) {
      const merged = transport.mergeOptions(options);
      return {
        ...merged,
        abort: merged.abort && merged.abort !== abort
          ? AbortSignal.any([abort, merged.abort])
          : abort,
      };
    },
    unary: transport.unary.bind(transport),
    serverStreaming: transport.serverStreaming.bind(transport),
    clientStreaming: transport.clientStreaming.bind(transport),
    duplex: transport.duplex.bind(transport),
  };
  return new SuiGrpcClient({ network, transport: scopedTransport });
}

export function getSuiTargetClient(targetId: DeploymentTargetId, requestOptions: { abort?: AbortSignal; timeout?: number } = {}): SuiGrpcClient {
  return createSuiTargetClient(getDeploymentTarget(targetId), requestOptions);
}

/**
 * The wallet kit caches clients by network, including in its signing closures.
 * Keep that identity stable while resolving local endpoints at operation access.
 * Native service/core handles are concrete snapshots: an in-flight operation
 * must not jump validators. Mutations should use getSuiTargetClient instead and
 * recheck their captured context before signing/submitting.
 */
export function createEndpointAwareLocalSuiClient(): SuiGrpcClient {
  // Construction alone must not throw policy errors during provider rendering.
  const identity = new SuiGrpcClient({ network: "localnet", baseUrl: "http://localhost:9000" });
  let endpoint: string | undefined;
  let current: SuiGrpcClient | undefined;
  const resolve = () => {
    const target = getDeploymentTarget("local");
    if (current === undefined || endpoint !== target.rpcUrl) {
      const next = createSuiTargetClient(target);
      current = next;
      endpoint = target.rpcUrl;
    }
    return current;
  };

  return new Proxy(identity, {
    get(_identity, property) {
      if (property === "network") return "localnet";
      if (property === "constructor") return SuiGrpcClient;
      const client = resolve();
      const value: unknown = Reflect.get(client, property, client);
      if (typeof value !== "function") return value;
      // Resolve when invoked too, even if a consumer retained a method reference.
      return (...args: unknown[]) => {
        const captured = resolve();
        const method: unknown = Reflect.get(captured, property, captured);
        if (typeof method !== "function") throw new Error("Sui client method is unavailable.");
        return Reflect.apply(method, captured, args) as unknown;
      };
    },
  });
}

/** World identities stay distinct even when their transport endpoints coincide. */
export function targetBalanceQueryKey(targetId: DeploymentTargetId, owner: string | null) {
  const config = getSuiTargetConfig(targetId);
  return ["target-balance", config.targetId, config.baseUrl, owner] as const;
}
