import { describe, expect, it, vi } from "vitest";

const {
  mockRequestSuiFromFaucetV2,
  mockSignAndExecuteTransaction,
} = vi.hoisted(() => ({
  mockRequestSuiFromFaucetV2: vi.fn(() => Promise.resolve()),
  mockSignAndExecuteTransaction: vi.fn<() => Promise<unknown>>(() => Promise.resolve({ digest: "0xdigest" })),
}));

vi.mock("@mysten/sui/faucet", () => ({
  getFaucetHost: () => "http://localhost:9123",
  requestSuiFromFaucetV2: mockRequestSuiFromFaucetV2,
}));

vi.mock("../utils/suiTargetClient", () => ({
  createSuiTargetClient: () => ({ signAndExecuteTransaction: mockSignAndExecuteTransaction }),
}));

vi.mock("@mysten/sui/keypairs/ed25519", () => ({
  Ed25519Keypair: class {
    getPublicKey() {
      return {
        toSuiAddress() {
          return "0x1111111111111111111111111111111111111111111111111111111111111111";
        },
      };
    }
  },
}));

import { getDeploymentTarget } from "../data/deploymentTargets";
import { publishToLocalValidator, resolveLocalPublishModules } from "../deployment/publishLocal";
import {
  createArtifactWithEmptyPublishModuleStub,
  createEmptyPublishPayloadArtifactStub,
  createGeneratedArtifactStub,
} from "./compiler/helpers";

describe("resolveLocalPublishModules", () => {
  it("returns existing artifact modules when no bundled world shim is present", async () => {
    const artifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
      sourceFiles: [{ path: "sources/starter_contract.move", content: "module builder_extensions::starter_contract {}" }],
    });

    await expect(resolveLocalPublishModules(artifact)).resolves.toEqual([new Uint8Array([1, 2, 3])]);
  });

  it("rebuilds and returns only the artifact modules when the bundle includes dependency bytecode", async () => {
    const artifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([9, 9, 9])],
      sourceFiles: [
        { path: "sources/starter_contract.move", content: "module builder_extensions::starter_contract {}" },
        { path: "deps/world/Move.toml", content: "[package]\nname = \"world\"\n" },
      ],
    });
    const verifyCompilerIntegrity = vi.fn(() => Promise.resolve());
    const prewarmCompilerWasm = vi.fn(() => Promise.resolve());
    const initMovePackageBuilder = vi.fn(() => Promise.resolve());
    const dumpMovePackage = vi.fn(() => Promise.resolve({
      modules: ["AQID", "BAUG"],
    }));

    await expect(resolveLocalPublishModules(artifact, {
      verifyCompilerIntegrity,
      prewarmCompilerWasm,
      loadCompilerModule: () => Promise.resolve({
        initMovePackageBuilder,
        dumpMovePackage,
      }),
    })).resolves.toEqual([new Uint8Array([4, 5, 6])]);

    expect(verifyCompilerIntegrity).toHaveBeenCalledTimes(1);
    expect(prewarmCompilerWasm).toHaveBeenCalledTimes(1);
    expect(initMovePackageBuilder).toHaveBeenCalledTimes(1);
    expect(dumpMovePackage).toHaveBeenCalledTimes(1);
  });

  it("blocks local publish transactions when the final module list is empty", async () => {
    mockRequestSuiFromFaucetV2.mockClear();
    mockSignAndExecuteTransaction.mockClear();

    await expect(() => publishToLocalValidator({
      artifact: createEmptyPublishPayloadArtifactStub(),
      target: getDeploymentTarget("local"),
      references: null,
    })).rejects.toThrow("did not produce any publishable Move modules");

    expect(mockRequestSuiFromFaucetV2).toHaveBeenCalledTimes(1);
    expect(mockSignAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it("blocks local publish transactions when any final module is empty", async () => {
    mockSignAndExecuteTransaction.mockClear();

    await expect(() => publishToLocalValidator({
      artifact: createArtifactWithEmptyPublishModuleStub(),
      target: getDeploymentTarget("local"),
      references: null,
    })).rejects.toThrow("did not produce any publishable Move modules");

    expect(mockSignAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it("continues local publish when the final module list is non-empty", async () => {
    mockSignAndExecuteTransaction.mockClear();
    const packageId = "0x0000000000000000000000000000000000000000000000000000000000000abc";
    mockSignAndExecuteTransaction.mockResolvedValueOnce({
      $kind: "Transaction",
      Transaction: { digest: "0xvalid-digest", status: { success: true }, effects: {
        changedObjects: [{ objectId: packageId, outputState: "PackageWrite", idOperation: "Created" }],
      } },
      protoJson: { digest: "0xvalid-digest", effects: { status: { success: true } } },
    });

    await expect(publishToLocalValidator({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      target: getDeploymentTarget("local"),
      references: null,
    })).resolves.toEqual({
      packageId,
      transactionDigest: "0xvalid-digest",
    });

    expect(mockSignAndExecuteTransaction).toHaveBeenCalledTimes(1);
  });
});