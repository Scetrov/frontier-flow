import { useState } from "react";

import type { CompilationStatus as CompilationStatusValue, CompilerDiagnostic } from "../compiler/types";

interface CompilationStatusProps {
  readonly status: CompilationStatusValue;
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly onSelectDiagnostic?: (nodeId: string) => void;
}

function getStatusLabel(status: CompilationStatusValue): string {
  switch (status.state) {
    case "idle":
      return "Idle";
    case "compiling":
      return "Compiling";
    case "compiled":
      return "Compiled";
    case "error":
      return "Error";
  }
}

function getStatusClassName(status: CompilationStatusValue): string {
  return `ff-compilation-status ff-compilation-status--${status.state}`;
}

/**
 * Persistent footer status indicator for the graph compilation pipeline.
 */
function CompilationStatus({ status, diagnostics, onSelectDiagnostic }: CompilationStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDiagnostics = diagnostics.length > 0;

  return (
    <div className={getStatusClassName(status)}>
      <div aria-live="polite" className="ff-compilation-status__summary">
        <button
          aria-controls="compilation-diagnostics"
          aria-expanded={hasDiagnostics ? isExpanded : false}
          className="ff-compilation-status__button"
          disabled={!hasDiagnostics}
          onClick={() => {
            if (hasDiagnostics) {
              setIsExpanded((expanded) => !expanded);
            }
          }}
          type="button"
        >
          <span aria-hidden="true" className="ff-compilation-status__dot" />
          <span className="ff-compilation-status__label">{getStatusLabel(status)}</span>
        </button>
      </div>

      {hasDiagnostics && isExpanded ? (
        <div className="ff-compilation-status__panel" id="compilation-diagnostics">
          <ul className="ff-compilation-status__list">
            {diagnostics.map((diagnostic, index) => {
              const canFocusNode = diagnostic.reactFlowNodeId !== null && onSelectDiagnostic !== undefined;

              return (
                <li key={`${diagnostic.userMessage}-${String(index)}`}>
                  {canFocusNode ? (
                    <button
                      className="ff-compilation-status__diagnostic"
                      onClick={() => {
                        onSelectDiagnostic(diagnostic.reactFlowNodeId ?? "");
                      }}
                      type="button"
                    >
                      {diagnostic.userMessage}
                    </button>
                  ) : (
                    <span className="ff-compilation-status__message">{diagnostic.userMessage}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default CompilationStatus;