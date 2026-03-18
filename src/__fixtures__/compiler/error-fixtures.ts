export const singleCompilerError = "error[E03001]: unresolved symbol at sources/frontier_flow.move:12:9";

export const multipleCompilerErrors = [
  "error[E03001]: unresolved symbol at sources/frontier_flow.move:12:9",
  "warning[W0001]: redundant assignment at sources/frontier_flow.move:18:3",
].join("\n");