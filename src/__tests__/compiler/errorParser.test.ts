import { describe, expect, it } from "vitest";

import { parseCompilerOutput } from "../../compiler/errorParser";
import { multipleCompilerErrors } from "../../__fixtures__/compiler/error-fixtures";

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
});