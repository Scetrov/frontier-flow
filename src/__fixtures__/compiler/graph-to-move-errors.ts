export const graphToMoveUnsupportedNodeError =
  "error[E03001]: unsupported node type at sources/graph_to_move_supported.move:10:9";

export const graphToMoveMultipleCompilerMessages = [
  "error[E03001]: unresolved symbol at sources/graph_to_move_supported.move:10:9",
  "warning[W0001]: redundant assignment at sources/graph_to_move_supported.move:14:5",
].join("\n");

export const graphToMoveUnmappedCompilerLineError =
  "error[E04044]: unknown field at sources/graph_to_move_supported.move:99:7";

export const graphToMoveFallbackCompilerMessage =
  "Move compiler crashed before reporting a source line.";