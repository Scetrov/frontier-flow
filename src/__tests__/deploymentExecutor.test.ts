import { describe, expect, it, vi } from "vitest";

import { DependencyResolutionError } from "../compiler/types";
import type { FetchWorldSourceResult } from "../compiler/types";
import type { DeploymentExecutionRequest, DeploymentExecutorDependencies } from "../deployment/executor";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { resetProjectDependencySnapshotCacheForTests } from "../deployment/dependencySnapshotLoader";
import { createDeploymentExecutor } from "../deployment/executor";
import { createGeneratedArtifactStub } from "./compiler/helpers";
import { createPackageReferenceBundleFixture } from "./deployment/testFactories";

function createRemoteCompileDependencies() {
  return {
    loadCachedResolution: vi.fn(() => Promise.resolve(null)),
    fetchWorldSource: vi.fn(() => Promise.resolve({
      files: {},
      sourceVersionTag: "v0.0.18",
      fetchedAt: 1,
    })),
    compileForDeployment: vi.fn(() => Promise.resolve({
      modules: [new Uint8Array([1, 2, 3])],
      dependencies: ["0x1"],
      digest: [1, 2, 3],
      resolvedDependencies: {
        files: "{}",
        dependencies: "{}",
        lockfileDependencies: "{}",
      },
      targetId: "testnet:stillness" as const,
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
      compiledAt: 2,
    })),
  };
}

describe("deployment executor error sanitization", () => {
  afterEach(() => {
    resetProjectDependencySnapshotCacheForTests();
  });

  it("redacts authorization tokens from surfaced remote publish failures", async () => {
    const remoteCompileDependencies = createRemoteCompileDependencies();
    const executor = createDeploymentExecutor({
      ...remoteCompileDependencies,
      publishRemote: () => Promise.reject(new Error("RPC request failed. Authorization: Bearer super-secret-token")),
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      target: getDeploymentTarget("testnet:stillness"),
    });

    expect(result.outcome).toBe("failed");
    expect(result.message).toContain("Authorization: [REDACTED]");
    expect(result.message).not.toContain("super-secret-token");
  });

  it("keeps cancellation classification while redacting sensitive key material", async () => {
    const remoteCompileDependencies = createRemoteCompileDependencies();
    const executor = createDeploymentExecutor({
      ...remoteCompileDependencies,
      publishRemote: () => Promise.reject(new Error("User rejected signing request. private key: suiprivkey1qaz2wsx3edc4rfv")),
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      references: createPackageReferenceBundleFixture("testnet:utopia"),
      target: getDeploymentTarget("testnet:utopia"),
    });

    expect(result.outcome).toBe("cancelled");
    expect(result.errorCode).toBe("wallet-approval-rejected");
    expect(result.message).toContain("private key: [REDACTED]");
    expect(result.message).not.toContain("suiprivkey1qaz2wsx3edc4rfv");
  });

  it("redacts mnemonic details from confirmation timeouts", async () => {
    const executor = createDeploymentExecutor({
      publishLocal: () => Promise.resolve({
        packageId: "0xabc",
        transactionDigest: "0xdigest",
      }),
      confirm: () => Promise.reject(new Error("Confirmation timeout. mnemonic=alpha beta gamma delta epsilon")),
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      references: null,
      target: {
        ...getDeploymentTarget("local"),
        requiresPublishedPackageRefs: false,
      },
    });

    expect(result.outcome).toBe("unresolved");
    expect(result.errorCode).toBe("confirmation-timeout");
    expect(result.message).toContain("mnemonic=[REDACTED]");
    expect(result.message).not.toContain("alpha beta gamma delta epsilon");
  });

  it("keeps remote signing failures in the signing stage until submission actually starts", async () => {
    const remoteCompileDependencies = createRemoteCompileDependencies();
    const executor = createDeploymentExecutor({
      ...remoteCompileDependencies,
      publishRemote: ({ onSubmitting }) => {
        expect(onSubmitting).toBeTypeOf("function");
        return Promise.reject(new Error("Transaction signing timed out"));
      },
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      target: getDeploymentTarget("testnet:stillness"),
    });

    expect(result.outcome).toBe("failed");
    expect(result.stage).toBe("signing");
  });

  it("switches remote failures to submitting after the signed transaction starts executing", async () => {
    const remoteCompileDependencies = createRemoteCompileDependencies();
    const executor = createDeploymentExecutor({
      ...remoteCompileDependencies,
      publishRemote: ({ onSubmitting }) => {
        onSubmitting?.();
        return Promise.reject(new Error("RPC submission failed"));
      },
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      target: getDeploymentTarget("testnet:stillness"),
    });

    expect(result.outcome).toBe("failed");
    expect(result.stage).toBe("submitting");
  });

  it("uses local publish when the target does not require deploy-grade compilation", async () => {
    const publishLocal: DeploymentExecutorDependencies["publishLocal"] = () => Promise.resolve({ packageId: "0xabc", transactionDigest: "0xdigest" });
    const publishRemote: DeploymentExecutorDependencies["publishRemote"] = () => Promise.resolve({ packageId: "0xdef", transactionDigest: "0xremote" });
    const confirm = () => Promise.resolve({ confirmed: true, confirmationReference: "0xdigest", finalStage: "confirming" as const });
    const publishLocalSpy = vi.fn<DeploymentExecutorDependencies["publishLocal"]>(publishLocal);
    const publishRemoteSpy = vi.fn<DeploymentExecutorDependencies["publishRemote"]>(publishRemote);
    const executor = createDeploymentExecutor({ confirm, publishLocal: publishLocalSpy, publishRemote: publishRemoteSpy });
    const request: DeploymentExecutionRequest = {
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      references: null,
      target: {
        ...getDeploymentTarget("local"),
        requiresPublishedPackageRefs: false,
      },
    };

    const result = await executor(request);

    expect(result.outcome).toBe("succeeded");
    expect(result.confirmationReference).toBe("0xdigest");
    expect(publishLocalSpy).toHaveBeenCalledTimes(1);
    expect(publishRemoteSpy).not.toHaveBeenCalled();
  });

  it("passes the fetched world source through deploy-grade compilation before remote publish", async () => {
    const fetchedWorldSource: FetchWorldSourceResult = {
      files: { "Move.toml": "[package]\nname=\"world\"\n" },
      sourceVersionTag: "v0.0.18",
      fetchedAt: 1,
    };
    const loadCachedResolution = vi.fn(() => Promise.resolve(null));
    const fetchWorldSource = vi.fn(() => Promise.resolve(fetchedWorldSource));
    const compileForDeploymentImpl: DeploymentExecutorDependencies["compileForDeployment"] = (input) => Promise.resolve().then(() => {
      expect(input.cachedResolution).toBeUndefined();
      expect(input.worldSource).toBe(fetchedWorldSource);
      return {
        modules: [new Uint8Array([1, 2, 3])],
        dependencies: ["0x1"],
        digest: [1, 2, 3],
        resolvedDependencies: {
          files: "{}",
          dependencies: "{}",
          lockfileDependencies: "{}",
        },
        targetId: "testnet:stillness" as const,
        sourceVersionTag: "v0.0.18",
        builderToolchainVersion: "1.67.1",
        compiledAt: 2,
      };
    });
    const compileForDeployment = vi.fn(compileForDeploymentImpl);
    const publishRemote = vi.fn(() => Promise.resolve({ transactionDigest: "0xremote" }));
    const confirm = vi.fn(() => Promise.resolve({ confirmed: true, confirmationReference: "0xremote", finalStage: "confirming" as const }));
    const executor = createDeploymentExecutor({ loadCachedResolution, fetchWorldSource, compileForDeployment, publishRemote, confirm });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      target: getDeploymentTarget("testnet:stillness"),
    });

    expect(result.outcome).toBe("succeeded");
    expect(loadCachedResolution).toHaveBeenCalledTimes(1);
    expect(fetchWorldSource).toHaveBeenCalledTimes(1);
    expect(compileForDeployment).toHaveBeenCalledTimes(1);
    expect(publishRemote).toHaveBeenCalledTimes(1);
  });

  it("routes local through deploy-grade compilation before local publish", async () => {
    const fetchedWorldSource: FetchWorldSourceResult = {
      files: {
        "Move.toml": "[package]\nname=\"world\"\n",
        "sources/world.move": "module world::world {}",
      },
      sourceVersionTag: "v0.0.18",
      fetchedAt: 1,
    };
    const loadCachedResolution = vi.fn(() => Promise.resolve(null));
    const fetchWorldSource = vi.fn(() => Promise.resolve(fetchedWorldSource));
    const compileForDeployment = vi.fn(() => Promise.resolve({
      modules: [new Uint8Array([9, 8, 7])],
      dependencies: ["0x1", "0x2"],
      digest: [9, 8, 7],
      resolvedDependencies: {
        files: "{}",
        dependencies: "{}",
        lockfileDependencies: "{}",
      },
      targetId: "local" as const,
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
      compiledAt: 2,
    }));
    const publishLocal = vi.fn<DeploymentExecutorDependencies["publishLocal"]>(() => Promise.resolve({ packageId: "0xabc", transactionDigest: "0xdigest" }));
    const publishRemote = vi.fn<DeploymentExecutorDependencies["publishRemote"]>(() => Promise.resolve({ packageId: "0xdef", transactionDigest: "0xremote" }));
    const confirm = vi.fn(() => Promise.resolve({ confirmed: true, confirmationReference: "0xdigest", finalStage: "confirming" as const }));
    const executor = createDeploymentExecutor({
      loadCachedResolution,
      fetchWorldSource,
      compileForDeployment,
      publishLocal,
      publishRemote,
      confirm,
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({
        bytecodeModules: [new Uint8Array([1, 2, 3])],
        sourceFiles: [
          { path: "sources/starter_contract.move", content: "module builder_extensions::starter_contract {}" },
          { path: "deps/world/Move.toml", content: "[package]\nname=\"world\"\n" },
        ],
      }),
      references: createPackageReferenceBundleFixture("local"),
      target: getDeploymentTarget("local"),
    });

    expect(result.outcome).toBe("succeeded");
    expect(loadCachedResolution).toHaveBeenCalledTimes(1);
    expect(fetchWorldSource).toHaveBeenCalledTimes(1);
    expect(compileForDeployment).toHaveBeenCalledTimes(1);
    expect(publishLocal).toHaveBeenCalledTimes(1);
    expect(publishRemote).not.toHaveBeenCalled();
    const publishLocalCall = publishLocal.mock.calls[0]?.[0] as Parameters<DeploymentExecutorDependencies["publishLocal"]>[0] | undefined;
    expect(publishLocalCall).toBeDefined();
    expect(publishLocalCall?.artifact.bytecodeModules).toEqual([new Uint8Array([9, 8, 7])]);
    expect(publishLocalCall?.artifact.dependencies).toEqual(["0x1", "0x2"]);
    expect(publishLocalCall?.artifact.sourceFiles).toEqual([
      { path: "sources/starter_contract.move", content: "module builder_extensions::starter_contract {}" },
    ]);
  });

  it("routes local through the wallet-signed publish path when ephemeral signing is disabled", async () => {
    const fetchedWorldSource: FetchWorldSourceResult = {
      files: {
        "Move.toml": "[package]\nname=\"world\"\n",
      },
      sourceVersionTag: "v0.0.18",
      fetchedAt: 1,
    };
    const loadCachedResolution = vi.fn(() => Promise.resolve(null));
    const fetchWorldSource = vi.fn(() => Promise.resolve(fetchedWorldSource));
    const compileForDeployment = vi.fn(() => Promise.resolve({
      modules: [new Uint8Array([4, 5, 6])],
      dependencies: ["0x1", "0x2"],
      digest: [4, 5, 6],
      resolvedDependencies: {
        files: "{}",
        dependencies: "{}",
        lockfileDependencies: "{}",
      },
      targetId: "local" as const,
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
      compiledAt: 2,
    }));
    const publishLocal = vi.fn<DeploymentExecutorDependencies["publishLocal"]>(() => Promise.resolve({ packageId: "0xabc", transactionDigest: "0xlocal" }));
    const publishRemote = vi.fn<DeploymentExecutorDependencies["publishRemote"]>(({ onSubmitting }) => {
      onSubmitting?.();
      return Promise.resolve({ transactionDigest: "0xremote" });
    });
    const confirm = vi.fn(() => Promise.resolve({ confirmed: true, confirmationReference: "0xremote", finalStage: "confirming" as const }));
    const executor = createDeploymentExecutor({
      loadCachedResolution,
      fetchWorldSource,
      compileForDeployment,
      publishLocal,
      publishRemote,
      confirm,
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({
        bytecodeModules: [new Uint8Array([1, 2, 3])],
      }),
      ownerAddress: "0x1234",
      references: createPackageReferenceBundleFixture("local"),
      target: {
        ...getDeploymentTarget("local"),
        supportsWalletSigning: true,
      },
    });

    expect(result.outcome).toBe("succeeded");
    expect(publishRemote).toHaveBeenCalledTimes(1);
    expect(publishLocal).not.toHaveBeenCalled();
    const publishRemoteRequest = publishRemote.mock.calls[0]?.[0];
    expect(publishRemoteRequest).toBeDefined();
    expect(publishRemoteRequest.ownerAddress).toBe("0x1234");
    expect(publishRemoteRequest.target).toMatchObject({ id: "local", supportsWalletSigning: true });
  });

  it("uses the bundled dependency snapshot before falling back to GitHub", async () => {
    const cachedResolution = {
      targetId: "testnet:stillness" as const,
      sourceVersionTag: "v0.0.18",
      resolvedDependencies: {
        files: "{}",
        dependencies: "{}",
        lockfileDependencies: "{}",
      },
      resolvedAt: 7,
    };
    const loadCachedResolution = vi.fn(() => Promise.resolve(cachedResolution));
    const fetchWorldSource = vi.fn(() => Promise.resolve({
      files: { "Move.toml": "[package]\nname=\"world\"\n" },
      sourceVersionTag: "v0.0.18",
      fetchedAt: 1,
    }));
    const compileForDeployment = vi.fn((input: Parameters<DeploymentExecutorDependencies["compileForDeployment"]>[0]) => Promise.resolve({
      modules: [new Uint8Array([1, 2, 3])],
      dependencies: ["0x1"],
      digest: [1, 2, 3],
      resolvedDependencies: input.cachedResolution?.resolvedDependencies ?? {
        files: "{}",
        dependencies: "{}",
        lockfileDependencies: "{}",
      },
      targetId: "testnet:stillness" as const,
      sourceVersionTag: input.worldSource.sourceVersionTag,
      builderToolchainVersion: "1.67.1",
      compiledAt: 2,
    }));
    const publishRemote = vi.fn(() => Promise.resolve({ transactionDigest: "0xremote" }));
    const confirm = vi.fn(() => Promise.resolve({ confirmed: true, confirmationReference: "0xremote", finalStage: "confirming" as const }));
    const executor = createDeploymentExecutor({ loadCachedResolution, fetchWorldSource, compileForDeployment, publishRemote, confirm });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      target: getDeploymentTarget("testnet:stillness"),
    });

    expect(result.outcome).toBe("succeeded");
    expect(loadCachedResolution).toHaveBeenCalledTimes(1);
    expect(fetchWorldSource).not.toHaveBeenCalled();
    expect(compileForDeployment).toHaveBeenCalledWith(expect.objectContaining({
      cachedResolution,
      worldSource: {
        files: {},
        sourceVersionTag: "v0.0.18",
        fetchedAt: 7,
      },
    }));
  });

  it("falls back to fetching the upstream world source when the bundled snapshot is invalid", async () => {
    const fetchedWorldSource: FetchWorldSourceResult = {
      files: { "Move.toml": "[package]\nname=\"world\"\n" },
      sourceVersionTag: "v0.0.18",
      fetchedAt: 11,
    };
    const loadCachedResolution = vi.fn(() => Promise.reject(new DependencyResolutionError(
      "Bundled dependency snapshot is invalid: missing package payloads for Sui.",
      {
        code: "bundled-snapshot-invalid",
        userMessage: "Bundled dependency snapshot is invalid.",
      },
    )));
    const fetchWorldSource = vi.fn(() => Promise.resolve(fetchedWorldSource));
    const compileForDeployment = vi.fn(() => Promise.resolve({
      modules: [new Uint8Array([1, 2, 3])],
      dependencies: ["0x1"],
      digest: [1, 2, 3],
      resolvedDependencies: {
        files: "{}",
        dependencies: "[]",
        lockfileDependencies: "{}",
      },
      targetId: "testnet:stillness" as const,
      sourceVersionTag: "v0.0.18",
      builderToolchainVersion: "1.67.1",
      compiledAt: 2,
    }));
    const publishRemote = vi.fn(() => Promise.resolve({ transactionDigest: "0xremote" }));
    const confirm = vi.fn(() => Promise.resolve({ confirmed: true, confirmationReference: "0xremote", finalStage: "confirming" as const }));
    const executor = createDeploymentExecutor({ loadCachedResolution, fetchWorldSource, compileForDeployment, publishRemote, confirm });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      target: getDeploymentTarget("testnet:stillness"),
    });

    expect(result.outcome).toBe("succeeded");
    expect(fetchWorldSource).toHaveBeenCalledTimes(1);
    expect(compileForDeployment).toHaveBeenCalledWith(expect.objectContaining({
      cachedResolution: undefined,
      worldSource: fetchedWorldSource,
    }));
  });

  it("surfaces a cache-aware error when no bundled snapshot is available and fallback fetch fails", async () => {
    const loadCachedResolution = vi.fn(() => Promise.resolve(null));
    const fetchWorldSource = vi.fn(() => Promise.reject(new Error("Failed to fetch world source for v0.0.18 from upstream")));
    const executor = createDeploymentExecutor({
      loadCachedResolution,
      fetchWorldSource,
      compileForDeployment: vi.fn(),
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      target: getDeploymentTarget("testnet:stillness"),
    });

    expect(result.outcome).toBe("failed");
    expect(result.errorCode).toBe("resolution-failed");
    expect(result.message).toContain("No bundled dependency snapshot was available");
  });

  it("preserves deploy-grade failure staging instead of collapsing it to submitting", async () => {
    const fetchedWorldSource: FetchWorldSourceResult = {
      files: { "Move.toml": "[package]\nname=\"world\"\n" },
      sourceVersionTag: "v0.0.18",
      fetchedAt: 1,
    };
    const executor = createDeploymentExecutor({
      loadCachedResolution: vi.fn(() => Promise.resolve(null)),
      fetchWorldSource: vi.fn(() => Promise.resolve(fetchedWorldSource)),
      compileForDeployment: ({ onProgress }) => Promise.resolve().then(() => {
        onProgress?.("Resolving live world dependencies.", "resolve-dependencies");
        throw new Error("Dependency graph resolution failed");
      }),
    });

    const result = await executor({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      target: getDeploymentTarget("testnet:stillness"),
    });

    expect(result.outcome).toBe("failed");
    expect(result.stage).toBe("resolve-dependencies");
    expect(result.errorCode).toBe("resolution-failed");
  });
});