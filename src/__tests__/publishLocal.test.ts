import { describe, expect, it, vi } from "vitest";

import { resolveLocalPublishModules } from "../deployment/publishLocal";
import { createGeneratedArtifactStub } from "./compiler/helpers";

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
    const initMoveCompiler = vi.fn(() => Promise.resolve());
    const buildMovePackage = vi.fn(() => Promise.resolve({
      modules: ["AQID", "BAUG"],
    }));

    await expect(resolveLocalPublishModules(artifact, {
      verifyCompilerIntegrity,
      prewarmCompilerWasm,
      loadCompilerModule: () => Promise.resolve({
        initMoveCompiler,
        buildMovePackage,
      }),
    })).resolves.toEqual([new Uint8Array([4, 5, 6])]);

    expect(verifyCompilerIntegrity).toHaveBeenCalledTimes(1);
    expect(prewarmCompilerWasm).toHaveBeenCalledTimes(1);
    expect(initMoveCompiler).toHaveBeenCalledTimes(1);
    expect(buildMovePackage).toHaveBeenCalledTimes(1);
  });
});