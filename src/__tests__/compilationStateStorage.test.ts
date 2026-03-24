import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  COMPILATION_STATE_STORAGE_KEY,
  loadCompilationState,
  saveCompilationState,
} from "../utils/compilationStateStorage";
import { createGeneratedArtifactStub } from "./compiler/helpers";

describe("compilationStateStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a compiled snapshot with artifact bytecode", () => {
    const artifact = createGeneratedArtifactStub({
      moduleName: "starter_contract",
      moveSource: "module builder_extensions::starter_contract {}",
      bytecodeModules: [new Uint8Array([1, 2, 3])],
    });

    saveCompilationState(window.localStorage, {
      version: 1,
      graphKey: "graph-key",
      status: {
        state: "compiled",
        bytecode: [new Uint8Array([4, 5, 6])],
        artifact,
      },
      diagnostics: [
        {
          severity: "warning",
          stage: "emission",
          rawMessage: "Unused branch",
          line: 2,
          reactFlowNodeId: "node_1",
          socketId: null,
          userMessage: "Unused branch",
        },
      ],
      moveSourceCode: artifact.moveSource,
    });

    const snapshot = loadCompilationState(window.localStorage);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.graphKey).toBe("graph-key");
    expect(snapshot?.moveSourceCode).toBe(artifact.moveSource);
    expect(snapshot?.diagnostics).toEqual([
      {
        severity: "warning",
        stage: "emission",
        rawMessage: "Unused branch",
        line: 2,
        reactFlowNodeId: "node_1",
        socketId: null,
        userMessage: "Unused branch",
      },
    ]);
    expect(snapshot?.status).toMatchObject({
      state: "compiled",
      bytecode: [new Uint8Array([4, 5, 6])],
      artifact: {
        artifactId: artifact.artifactId,
        bytecodeModules: [new Uint8Array([1, 2, 3])],
        moduleName: artifact.moduleName,
        moveSource: artifact.moveSource,
        moveToml: artifact.moveToml,
        sourceFilePath: artifact.sourceFilePath,
      },
    });
  });

  it("returns null when the stored payload is invalid", () => {
    window.localStorage.setItem(
      COMPILATION_STATE_STORAGE_KEY,
      JSON.stringify({ version: 1, graphKey: "graph-key", status: { state: "compiled" } }),
    );

    expect(loadCompilationState(window.localStorage)).toBeNull();
  });
});