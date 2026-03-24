import hljs from "highlight.js/lib/core";
import rust from "highlight.js/lib/languages/rust";

import type { CompilationStatus } from "../compiler/types";

hljs.registerLanguage("rust", rust);

interface MoveSourcePanelProps {
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}

function getEmptyMessage(status: CompilationStatus): string {
  switch (status.state) {
    case "compiling":
      return "Automatic compile is generating Move source from the current graph.";
    case "error":
      return "No Move source is available for the current graph yet. Resolve graph validation issues or compile errors to inspect generated output.";
    default:
      return "Edit the graph and wait for the automatic compile cycle to inspect generated Move source here.";
  }
}

function MoveSourceContent({
  displayedLines,
  highlightedSource,
  sourceCode,
  status,
}: {
  readonly displayedLines: readonly string[];
  readonly highlightedSource: string;
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}) {
  if (sourceCode === null) {
    return (
      <div className="ff-move-source__empty-state">
        <p className="ff-move-source__empty-title">No generated Move source yet</p>
        <p className="ff-move-source__empty-copy">{getEmptyMessage(status)}</p>
      </div>
    );
  }

  return (
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
  );
}

function MoveSourcePanel({ sourceCode, status }: MoveSourcePanelProps) {
  const displayedLines = sourceCode?.split("\n") ?? [];
  const highlightedSource = sourceCode === null ? "" : hljs.highlight(sourceCode, { language: "rust" }).value;

  return (
    <section aria-label="Move source view" className="ff-move-source">
      <header className="ff-move-source__header">
        <div>
          <p className="ff-move-source__eyebrow">Move</p>
          <h2 className="ff-move-source__title">Generated source</h2>
          <p className="ff-move-source__copy">You can view the generated source in this tab to help diagnose problems, move on to Deploy to deploy to the server.</p>
        </div>
      </header>

      <div className="ff-move-source__body">
        <p className="ff-move-source__learn-banner">
          Learn how to extend this code using{" "}
          <a className="ff-move-source__learn-link" href="https://evefrontier.space/move/" rel="noreferrer" target="_blank">
            Learn Move on Sui
          </a>
        </p>
        <MoveSourceContent displayedLines={displayedLines} highlightedSource={highlightedSource} sourceCode={sourceCode} status={status} />
      </div>
    </section>
  );
}

export default MoveSourcePanel;