import { describe, expect, it } from "vitest";

import { getPackageReferenceBundle } from "../data/packageReferences";
import { createDeploymentValidationResult, validatePackageReferenceBundle } from "../utils/deploymentValidation";

describe("deploymentValidation", () => {
  it("uses target-specific required inputs and retry guidance for remote blockers", () => {
    const validation = createDeploymentValidationResult({
      artifactReady: true,
      artifactHasBytecode: true,
      hasAvailableWallets: true,
      hasConnectedWallet: false,
      targetId: "testnet:stillness",
    });

    expect(validation.requiredInputs).toEqual([
      "current compiled bytecode artifact",
      "connected Sui wallet for testnet:stillness",
      "published package references for testnet:stillness",
    ]);
    expect(validation.resolvedInputs).toEqual([
      "current compiled bytecode artifact",
      "published package references for testnet:stillness",
    ]);
    expect(validation.blockers[0]).toMatchObject({
      code: "wallet-required",
      message: "Connect a Sui-compatible wallet before deploying to testnet:stillness.",
      remediation: "Connect and approve a Sui-compatible wallet for testnet:stillness, then retry deployment.",
    });
  });

  it("keeps the artifact input unresolved when the compiled artifact no longer matches the graph", () => {
    const validation = createDeploymentValidationResult({
      artifactReady: true,
      artifactHasBytecode: true,
      artifactGraphMatchesCurrentRevision: false,
      hasAvailableWallets: false,
      hasConnectedWallet: false,
      targetId: "local",
    });

    expect(validation.blockers).toContainEqual(expect.objectContaining({ code: "artifact-graph-mismatch" }));
    expect(validation.requiredInputs).toContain("current compiled bytecode artifact");
    expect(validation.resolvedInputs).not.toContain("current compiled bytecode artifact");
  });

  it("uses local-validator-specific blocker copy for local retries", () => {
    const validation = createDeploymentValidationResult({
      artifactReady: true,
      artifactHasBytecode: true,
      hasAvailableWallets: true,
      hasConnectedWallet: true,
      search: "?ff_local_deploy_ready=0",
      targetId: "local",
    });

    expect(validation.requiredInputs).toEqual([
      "current compiled bytecode artifact",
      "available local validator",
    ]);
    expect(validation.resolvedInputs).toEqual([
      "current compiled bytecode artifact",
    ]);
    expect(validation.blockers[0]).toMatchObject({
      code: "local-target-unavailable",
      message: "The local validator required for local deployment is unavailable.",
      remediation: "Start or configure the local validator, then retry deployment to local.",
    });
  });

  it("does not require a connected wallet for local deployment", () => {
    const validation = createDeploymentValidationResult({
      artifactReady: true,
      artifactHasBytecode: true,
      hasAvailableWallets: true,
      hasConnectedWallet: false,
      targetId: "local",
    });

    expect(validation.requiredInputs).toEqual([
      "current compiled bytecode artifact",
      "available local validator",
    ]);
    expect(validation.blockers).toEqual([]);
    expect(validation.resolvedInputs).toEqual([
      "current compiled bytecode artifact",
      "available local validator",
    ]);
  });

  it("accepts maintained remote bundles that use object IDs for registries", () => {
    const blocker = validatePackageReferenceBundle(
      "testnet:stillness",
      getPackageReferenceBundle("testnet:stillness"),
    );

    expect(blocker).toBeNull();
  });
});