import { describe, expect, it, vi } from "vitest";
import type { CompileResult, GeneratedContractArtifact } from "../compiler/types";

const { compileMoveMock } = vi.hoisted(() => ({
  compileMoveMock: vi.fn<(artifact: GeneratedContractArtifact) => Promise<CompileResult>>(),
}));

vi.mock("../compiler/moveCompiler", () => ({
  compileMove: compileMoveMock,
}));

import { getDeploymentTarget } from "../data/deploymentTargets";
import { publishToRemoteTarget } from "../deployment/publishRemote";
import { createGeneratedArtifactStub } from "./compiler/helpers";
import { createPackageReferenceBundleFixture } from "./deployment/testFactories";

describe("publishToRemoteTarget", () => {
  it("recompiles remote artifacts with a published world dependency manifest", async () => {
    const execute = vi.fn(() => Promise.resolve({ digest: "0xdigest" }));
    const inputArtifact = createGeneratedArtifactStub({
      moveToml: [
        "[package]",
        'name = "starter_contract"',
        'edition = "2024.beta"',
        "",
        "[addresses]",
        'builder_extensions = "0x0"',
        'world = "0x0"',
        "",
        "[dependencies]",
        'world = { local = "deps/world" }',
        "",
      ].join("\n"),
      sourceFiles: [
        { path: "sources/starter_contract.move", content: "module builder_extensions::starter_contract {}" },
        { path: "deps/world/Move.toml", content: "[package]\nname = \"world\"\n[addresses]\nworld = \"0x0\"\n" },
      ],
    });
    const compiledArtifact = createGeneratedArtifactStub({
      moduleName: "starter_contract",
      dependencies: [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c",
      ],
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });
    compileMoveMock.mockImplementationOnce((artifact) => {
      expect(artifact.moveToml).not.toContain('world = "0x0"');
      expect(artifact.moveToml).toContain('builder_extensions = "0x0"');
      const publishedWorldManifest = artifact.sourceFiles?.find((file) => file.path === "deps/world/Published.toml");
      expect(publishedWorldManifest).toBeDefined();
      expect(publishedWorldManifest?.content ?? "").toContain("[published.testnet]");

      return Promise.resolve({
        success: true,
        modules: compiledArtifact.bytecodeModules,
        dependencies: compiledArtifact.dependencies,
        errors: null,
        warnings: [],
        artifact: compiledArtifact,
      });
    });

    await publishToRemoteTarget({
      artifact: inputArtifact,
      ownerAddress: "0x1234",
      target: getDeploymentTarget("testnet:stillness"),
      references: createPackageReferenceBundleFixture("testnet:stillness"),
      execute,
    });

    expect(compileMoveMock).toHaveBeenCalledTimes(1);
  });

  it("transfers the publish upgrade capability to the connected wallet address", async () => {
    const execute = vi.fn(() => Promise.resolve({ digest: "0xdigest" }));
    const compiledArtifact = createGeneratedArtifactStub({
      bytecodeModules: [new Uint8Array([1, 2, 3])],
      dependencies: [
        "0x0000000000000000000000000000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000000000000000000000000000002",
        "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c",
      ],
    });
    compileMoveMock.mockResolvedValue({
      success: true,
      modules: compiledArtifact.bytecodeModules,
      dependencies: compiledArtifact.dependencies,
      errors: null,
      warnings: [],
      artifact: compiledArtifact,
    });

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
    compileMoveMock.mockReset();
    await expect(() => publishToRemoteTarget({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "",
      target: getDeploymentTarget("testnet:utopia"),
      references: createPackageReferenceBundleFixture("testnet:utopia"),
      execute: () => Promise.resolve({ digest: "0xdigest" }),
    })).rejects.toThrow("A connected wallet address is required before deploying to testnet:utopia.");
  });

  it("surfaces remote recompilation failures before wallet signing", async () => {
    compileMoveMock.mockResolvedValue({
      success: false,
      modules: null,
      dependencies: null,
      errors: [{
        severity: "error",
        userMessage: "Dependency world is unpublished.",
        rawMessage: "Dependency world is unpublished.",
        line: null,
        reactFlowNodeId: null,
        socketId: null,
      }],
      warnings: [],
      artifact: null,
    });

    await expect(() => publishToRemoteTarget({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      target: getDeploymentTarget("testnet:utopia"),
      references: createPackageReferenceBundleFixture("testnet:utopia"),
      execute: () => Promise.resolve({ digest: "0xdigest" }),
    })).rejects.toThrow("Dependency world is unpublished.");
  });

  it("rewrites published world dependency linking failures with a compiler limitation message", async () => {
    compileMoveMock.mockResolvedValue({
      success: false,
      modules: null,
      dependencies: null,
      errors: [{
        severity: "error",
        userMessage: "address with no value",
        rawMessage: "address with no value",
        line: null,
        reactFlowNodeId: null,
        socketId: null,
      }],
      warnings: [],
      artifact: null,
    });

    await expect(() => publishToRemoteTarget({
      artifact: createGeneratedArtifactStub({ bytecodeModules: [new Uint8Array([1, 2, 3])] }),
      ownerAddress: "0x1234",
      target: getDeploymentTarget("testnet:utopia"),
      references: createPackageReferenceBundleFixture("testnet:utopia"),
      execute: () => Promise.resolve({ digest: "0xdigest" }),
    })).rejects.toThrow(
      "Remote deployment cannot resolve the published world dependency in the browser Move compiler.",
    );
  });
});