import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

import type { CompilationStatus } from "../compiler/types";

interface MoveSourcePanelProps {
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
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
          <span className="ff-move-source__filename">module.move</span>
        </div>
      </header>

      <div className="ff-move-source__body">
        {sourceCode === null ? (
          <div className="ff-move-source__empty-state">
            <p className="ff-move-source__empty-title">No generated Move source yet</p>
            <p className="ff-move-source__empty-copy">{getEmptyMessage(status)}</p>
          </div>
        ) : (
          <SyntaxHighlighter
            PreTag="div"
            className="ff-move-source__syntax"
            codeTagProps={{ className: "ff-move-source__code" }}
            customStyle={{
              margin: 0,
              minHeight: "100%",
              background: "transparent",
              padding: "1.25rem",
              fontFamily: '"Fira Code", "SFMono-Regular", monospace',
              fontSize: "0.92rem",
              lineHeight: "1.65",
            }}
            language="rust"
            lineNumberStyle={{ color: "rgba(250, 250, 229, 0.35)", minWidth: "2.5rem" }}
            showLineNumbers={true}
            style={atomOneDark}
            wrapLongLines={true}
          >
            {sourceCode}
          </SyntaxHighlighter>
        )}
      </div>
    </section>
  );
}

export default MoveSourcePanel;