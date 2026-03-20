import { describe, expect, it } from "vitest";

import { parseCompilerOutput } from "../../compiler/errorParser";
import { multipleCompilerErrors } from "../../__fixtures__/compiler/error-fixtures";
import {
  graphToMoveFallbackCompilerMessage,
  graphToMoveUnmappedCompilerLineError,
} from "../../__fixtures__/compiler/graph-to-move-errors";

describe("parseCompilerOutput", () => {
  it("extracts multiple diagnostics and maps known source lines", () => {
    const diagnostics = parseCompilerOutput(multipleCompilerErrors, [
      { line: 12, astNodeId: "node_a", reactFlowNodeId: "node_a" },
      { line: 18, astNodeId: "node_b", reactFlowNodeId: "node_b" },
    ]);

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]?.reactFlowNodeId).toBe("node_a");
    expect(diagnostics[1]?.severity).toBe("warning");
  });

  it("keeps compiler diagnostics when the line does not map to a graph node", () => {
    const diagnostics = parseCompilerOutput(graphToMoveUnmappedCompilerLineError, [
      { line: 10, astNodeId: "node_a", reactFlowNodeId: "node_a" },
    ]);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.stage).toBe("compilation");
    expect(diagnostics[0]?.line).toBe(99);
    expect(diagnostics[0]?.reactFlowNodeId).toBeNull();
  });

  it("falls back to a raw compiler diagnostic when no parseable line exists", () => {
    const diagnostics = parseCompilerOutput(graphToMoveFallbackCompilerMessage, []);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toEqual(
      expect.objectContaining({
        stage: "compilation",
        line: null,
        reactFlowNodeId: null,
        userMessage: graphToMoveFallbackCompilerMessage,
      }),
    );
  });

  it("does not turn a warning location line into a second error diagnostic", () => {
    const diagnostics = parseCompilerOutput(
      [
        "warning[Lint]: unused list binding",
        "sources/starter_contract.move:116:13",
      ].join("\n"),
      [{ line: 116, astNodeId: "list_tribe_1", reactFlowNodeId: "list_tribe_1" }],
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toEqual(
      expect.objectContaining({
        severity: "warning",
        line: 116,
        reactFlowNodeId: "list_tribe_1",
        userMessage: "unused list binding",
      }),
    );
  });
});