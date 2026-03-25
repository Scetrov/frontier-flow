import { describe, expect, it } from "vitest";

import type { DeploymentExecutionRequest } from "../deployment/executor";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { createDeploymentExecutor } from "../deployment/executor";
import { createGeneratedArtifactStub } from "./compiler/helpers";
import { createPackageReferenceBundleFixture } from "./deployment/testFactories";

describe("deployment executor error sanitization", () => {
  it("redacts authorization tokens from surfaced remote publish failures", async () => {
    const executor = createDeploymentExecutor({
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
    const executor = createDeploymentExecutor({
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
      target: getDeploymentTarget("local"),
    });

    expect(result.outcome).toBe("unresolved");
    expect(result.errorCode).toBe("confirmation-timeout");
    expect(result.message).toContain("mnemonic=[REDACTED]");
    expect(result.message).not.toContain("alpha beta gamma delta epsilon");
  });

  it("keeps remote signing failures in the signing stage until submission actually starts", async () => {
    const executor = createDeploymentExecutor({
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
    const executor = createDeploymentExecutor({
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

  it("uses wallet signing based on the target publish mechanism instead of published-reference requirements", async () => {
    const publishLocal = () => Promise.resolve({ packageId: "0xabc", transactionDigest: "0xdigest" });
    const publishRemote = () => Promise.resolve({ packageId: "0xdef", transactionDigest: "0xremote" });
    const confirm = () => Promise.resolve({ confirmed: true, confirmationReference: "0xdigest", finalStage: "confirming" as const });
    const publishLocalSpy = vi.fn(publishLocal);
    const publishRemoteSpy = vi.fn(publishRemote);
    const executor = createDeploymentExecutor({ confirm, publishLocal: publishLocalSpy, publishRemote: publishRemoteSpy });
    const request: DeploymentExecutionRequest = {
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      references: null,
      target: {
        ...getDeploymentTarget("local"),
        requiresPublishedPackageRefs: true,
      },
    };

    const result = await executor(request);

    expect(result.outcome).toBe("succeeded");
    expect(result.confirmationReference).toBe("0xdigest");
    expect(publishLocalSpy).toHaveBeenCalledTimes(1);
    expect(publishRemoteSpy).not.toHaveBeenCalled();
  });
});