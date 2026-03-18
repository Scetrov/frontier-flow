import hljs from "highlight.js/lib/core";
import rust from "highlight.js/lib/languages/rust";

import type { CompilationStatus } from "../compiler/types";

hljs.registerLanguage("rust", rust);

interface MoveSourcePanelProps {
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}

function getDisplayedFilename(status: CompilationStatus): string {
  const sourceFilePath = status.state === "compiled" || status.state === "error"
    ? status.artifact?.sourceFilePath
    : undefined;

  if (sourceFilePath === undefined) {
    return "module.move";
  }

  const segments = sourceFilePath.split("/");
  return segments.at(-1) ?? "module.move";
}

function getStatusLabel(status: CompilationStatus): string {
  switch (status.state) {
    case "compiling":
      return "Compiling";
    case "compiled":
      return "Compiled";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function getEmptyMessage(status: CompilationStatus): string {
  switch (status.state) {
    case "compiling":
      return "Generating Move source from the current graph.";
    case "error":
      return "No Move source is available for the current graph yet. Resolve graph validation issues or compile errors to inspect generated output.";
    default:
      return "Build or edit a valid graph to inspect the generated Move source here.";
  }
}

function MoveSourcePanel({ sourceCode, status }: MoveSourcePanelProps) {
  const displayedLines = sourceCode?.split("\n") ?? [];
  const highlightedSource = sourceCode === null
    ? ""
    : hljs.highlight(sourceCode, { language: "rust" }).value;

  return (
    <section aria-label="Move source view" className="ff-move-source">
      <header className="ff-move-source__header">
        <div>
          <p className="ff-move-source__eyebrow">Move</p>
          <h2 className="ff-move-source__title">Generated source</h2>
          <p className="ff-move-source__copy">Read-only generated Move output with syntax highlighting for review, debugging, and contributor inspection.</p>
        </div>

        <div className="ff-move-source__meta">
          <span className="ff-move-source__badge">{getStatusLabel(status)}</span>
          <span className="ff-move-source__filename">{getDisplayedFilename(status)}</span>
        </div>
      </header>

      <div className="ff-move-source__body">
        {sourceCode === null ? (
          <div className="ff-move-source__empty-state">
            <p className="ff-move-source__empty-title">No generated Move source yet</p>
            <p className="ff-move-source__empty-copy">{getEmptyMessage(status)}</p>
          </div>
        ) : (
          <div className="ff-move-source__syntax" role="presentation">
            <ol aria-hidden="true" className="ff-move-source__gutter">
              {displayedLines.map((_, index) => (
                <li className="ff-move-source__line-number" key={index}>
                  {index + 1}
                </li>
              ))}
            </ol>
            <pre aria-label="Generated Move source code" className="ff-move-source__pre">
              <code
                className="ff-move-source__code hljs language-rust"
                dangerouslySetInnerHTML={{ __html: highlightedSource }}
              />
            </pre>
          </div>
        )}
      </div>
    </section>
  );
}

export default MoveSourcePanel;