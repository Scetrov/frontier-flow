import { describe, expect, it, vi } from "vitest";

import { getDeploymentTarget } from "../data/deploymentTargets";
import { publishToRemoteTarget } from "../deployment/publishRemote";
import { createGeneratedArtifactStub } from "./compiler/helpers";
import { createPackageReferenceBundleFixture } from "./deployment/testFactories";

describe("publishToRemoteTarget", () => {
  it("transfers the publish upgrade capability to the connected wallet address", async () => {
    const execute = vi.fn(() => Promise.resolve({ digest: "0xdigest" }));

    await publishToRemoteTarget({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      target: getDeploymentTarget("testnet:stillness"),
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      execute,
    });

    expect(execute).toHaveBeenCalledTimes(1);
    const [transaction] = execute.mock.calls[0] as unknown as [{ getData: () => { commands: Array<{ $kind: string }> } }];
    const commands = transaction.getData().commands;

    expect(commands.map((command: { $kind: string }) => command.$kind)).toEqual(["Publish", "TransferObjects"]);
  });

  it("fails early when the connected wallet address is missing", async () => {
    await expect(() => publishToRemoteTarget({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "",
      target: getDeploymentTarget("testnet:utopia"),
      references: createPackageReferenceBundleFixture("testnet:utopia"),
      execute: () => Promise.resolve({ digest: "0xdigest" }),
    })).rejects.toThrow("A connected wallet address is required before deploying to testnet:utopia.");
  });
});