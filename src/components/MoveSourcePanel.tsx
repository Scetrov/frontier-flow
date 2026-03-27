import { useEffect, useMemo, useState } from "react";

import hljs from "highlight.js/lib/core";
import ini from "highlight.js/lib/languages/ini";
import rust from "highlight.js/lib/languages/rust";

import type { CompilationStatus } from "../compiler/types";

hljs.registerLanguage("ini", ini);
hljs.registerLanguage("rust", rust);

interface VirtualArtifactFile {
  readonly path: string;
  readonly content: string;
  readonly language: "ini" | "rust";
}

interface FileTabLabelParts {
  readonly directory: string | null;
  readonly filename: string;
}

interface MoveSourcePanelProps {
  readonly onRebuild?: () => void | Promise<void>;
  readonly sourceCode: string | null;
  readonly status: CompilationStatus;
}

interface MoveSourceSelection {
  readonly displayedLines: readonly string[];
  readonly files: readonly VirtualArtifactFile[];
  readonly highlightedBuildOutput: string | null;
  readonly highlightedSource: string;
  readonly selectedFile: VirtualArtifactFile | null;
  readonly selectedFilePath: string | null;
  readonly setSelectedFilePath: (path: string) => void;
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

function getArtifactFiles(sourceCode: string | null, status: CompilationStatus): readonly VirtualArtifactFile[] {
  const artifact = status.state === "compiled" || status.state === "error"
    ? status.artifact ?? null
    : null;

  if (artifact === null) {
    return sourceCode === null
      ? []
      : [{ path: "Generated.move", content: sourceCode, language: "rust" }];
  }

  const files = new Map<string, VirtualArtifactFile>();
  files.set("Move.toml", { path: "Move.toml", content: artifact.moveToml, language: "ini" });

  for (const file of artifact.sourceFiles ?? [{ path: artifact.sourceFilePath, content: artifact.moveSource }]) {
    files.set(file.path, {
      path: file.path,
      content: file.content,
      language: file.path.endsWith(".move") ? "rust" : "ini",
    });
  }

  return Array.from(files.values());
}

function getBuildOutput(status: CompilationStatus): string | null {
  const artifactDiagnostics = status.state === "compiled" || status.state === "error"
    ? status.artifact?.diagnostics ?? []
    : [];
  const statusDiagnostics = status.state === "error"
    ? status.diagnostics
    : [];
  const messages = Array.from(new Set([...statusDiagnostics, ...artifactDiagnostics]
    .map((diagnostic) => diagnostic.rawMessage.trim())
    .filter((message) => message.length > 0)));

  return messages.length > 0 ? messages.join("\n\n") : null;
}

function getDefaultFilePath(files: readonly VirtualArtifactFile[], status: CompilationStatus, sourceCode: string | null): string | null {
  const artifact = status.state === "compiled" || status.state === "error"
    ? status.artifact ?? null
    : null;

  if (artifact !== null && files.some((file) => file.path === artifact.sourceFilePath)) {
    return artifact.sourceFilePath;
  }

  if (sourceCode !== null) {
    const generatedFile = files.find((file) => file.content === sourceCode && file.path.endsWith(".move"));
    if (generatedFile !== undefined) {
      return generatedFile.path;
    }
  }

  return files[0]?.path ?? null;
}

function highlightSource(content: string, language: VirtualArtifactFile["language"]): string {
  return hljs.highlight(content, { language }).value;
}

function escapeHtml(content: string): string {
  return content
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlightBuildOutput(buildOutput: string | null): string | null {
  if (buildOutput === null) {
    return null;
  }

  return buildOutput.split("\n").map((line) => {
    const lineMatch = /^(warning|error)\[([^\]]+)\](.*)$/.exec(line);
    if (lineMatch === null) {
      return escapeHtml(line);
    }

    const [, severity, code, remainder] = lineMatch;
    return `<span class="ff-move-source__output-token ff-move-source__output-token--${severity}">${severity}[${escapeHtml(code)}]</span>${escapeHtml(remainder)}`;
  }).join("\n");
}

function getFileTabLabelParts(path: string): FileTabLabelParts {
  const segments = path.split("/").filter((segment) => segment.length > 0);
  if (segments.length <= 1) {
    return {
      directory: "/",
      filename: path,
    };
  }

  return {
    directory: `${segments.slice(0, -1).join("/")}/`,
    filename: segments[segments.length - 1],
  };
}

function useCopyLabel(): readonly [string, () => void] {
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    if (copyLabel !== "Copied") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyLabel("Copy");
    }, 1_500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyLabel]);

  return [copyLabel, () => { setCopyLabel("Copied"); }] as const;
}

function useMoveSourceSelection(sourceCode: string | null, status: CompilationStatus): MoveSourceSelection {
  const files = useMemo(() => getArtifactFiles(sourceCode, status), [sourceCode, status]);
  const highlightedBuildOutput = useMemo(() => highlightBuildOutput(getBuildOutput(status)), [status]);
  const defaultFilePath = useMemo(() => getDefaultFilePath(files, status, sourceCode), [files, sourceCode, status]);
  const [selectedFilePath, setSelectedFilePathState] = useState<string | null>(defaultFilePath);

  const resolvedSelectedFilePath = selectedFilePath !== null && files.some((file) => file.path === selectedFilePath)
    ? selectedFilePath
    : defaultFilePath;
  const selectedFile = useMemo(
    () => files.find((file) => file.path === resolvedSelectedFilePath) ?? null,
    [files, resolvedSelectedFilePath],
  );
  const displayedLines = selectedFile?.content.split("\n") ?? [];
  const highlightedSource = selectedFile === null ? "" : highlightSource(selectedFile.content, selectedFile.language);

  return {
    displayedLines,
    files,
    highlightedBuildOutput,
    highlightedSource,
    selectedFile,
    selectedFilePath: resolvedSelectedFilePath,
    setSelectedFilePath: setSelectedFilePathState,
  };
}

function MoveSourceActions({
  copyLabel,
  isCompiling,
  onCopy,
  onRebuild,
  selectedFile,
}: {
  readonly copyLabel: string;
  readonly isCompiling: boolean;
  readonly onCopy: () => void;
  readonly onRebuild?: () => void | Promise<void>;
  readonly selectedFile: VirtualArtifactFile | null;
}) {
  return (
    <div className="ff-move-source__actions" role="group" aria-label="Move source actions">
      <button
        className="ff-move-source__action"
        disabled={selectedFile === null}
        onClick={onCopy}
        type="button"
      >
        {copyLabel}
      </button>
      <button
        className="ff-move-source__action"
        disabled={isCompiling}
        onClick={() => { void onRebuild?.(); }}
        type="button"
      >
        {isCompiling ? "Rebuilding..." : "Rebuild"}
      </button>
    </div>
  );
}

function MoveSourceTabs({
  files,
  onSelectFile,
  selectedFilePath,
}: {
  readonly files: readonly VirtualArtifactFile[];
  readonly onSelectFile: (path: string) => void;
  readonly selectedFilePath: string | null;
}) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div aria-label="Generated package files" className="ff-move-source__tabs" role="tablist">
      {files.map((file) => {
        const isSelected = file.path === selectedFilePath;
        const labelParts = getFileTabLabelParts(file.path);

        return (
          <button
            aria-controls={`move-source-panel-${file.path}`}
            aria-selected={isSelected}
            className="ff-move-source__tab"
            id={`move-source-tab-${file.path}`}
            key={file.path}
            onClick={() => {
              onSelectFile(file.path);
            }}
            role="tab"
            type="button"
          >
            {labelParts.directory !== null ? (
              <span className="ff-move-source__tab-path">{labelParts.directory}</span>
            ) : null}
            <span className="ff-move-source__tab-filename">{labelParts.filename}</span>
          </button>
        );
      })}
    </div>
  );
}

function MoveSourceContent({
  displayedLines,
  highlightedSource,
  selectedFile,
  status,
}: {
  readonly displayedLines: readonly string[];
  readonly highlightedSource: string;
  readonly selectedFile: VirtualArtifactFile | null;
  readonly status: CompilationStatus;
}) {
  if (selectedFile === null) {
    return (
      <div className="ff-move-source__empty-state">
        <p className="ff-move-source__empty-title">No generated Move source yet</p>
        <p className="ff-move-source__empty-copy">{getEmptyMessage(status)}</p>
      </div>
    );
  }

  return (
    <div
      aria-multiline="true"
      aria-label={`${selectedFile.path} source viewer`}
      aria-readonly="true"
      className="ff-move-source__syntax"
      role="textbox"
      tabIndex={0}
    >
      <ol aria-hidden="true" className="ff-move-source__gutter">
        {displayedLines.map((_, index) => (
          <li className="ff-move-source__line-number" key={index}>
            {index + 1}
          </li>
        ))}
      </ol>
      <pre aria-label={`${selectedFile.path} contents`} className="ff-move-source__pre">
        <code
          className="ff-move-source__code hljs language-rust"
          dangerouslySetInnerHTML={{ __html: highlightedSource }}
        />
      </pre>
    </div>
  );
}

function MoveBuildOutput({ highlightedBuildOutput }: { readonly highlightedBuildOutput: string }) {
  return (
    <aside aria-label="Build output" className="ff-move-source__output" role="region">
      <div className="ff-move-source__output-header">
        <p className="ff-move-source__output-eyebrow">Build</p>
        <h3 className="ff-move-source__output-title">Build output</h3>
        <p className="ff-move-source__output-copy">Warnings below are not unusual as the emitter will sometimes produce extra variables and aliases. If there are errors please log them on <a className="ff-alpha-banner__link keychainify-checked" href="https://github.com/Scetrov/frontier-flow/issues" rel="noopener noreferrer" target="_blank">GitHub</a>.</p>
      </div>
      <pre aria-label="Build output contents" className="ff-move-source__output-code">
        <code dangerouslySetInnerHTML={{ __html: highlightedBuildOutput }} />
      </pre>
    </aside>
  );
}

function MoveSourcePanel({ onRebuild, sourceCode, status }: MoveSourcePanelProps) {
  const isCompiling = status.state === "compiling";
  const {
    displayedLines,
    files,
    highlightedBuildOutput,
    highlightedSource,
    selectedFile,
    selectedFilePath,
    setSelectedFilePath,
  } = useMoveSourceSelection(sourceCode, status);
  const [copyLabel, setCopiedLabel] = useCopyLabel();

  async function handleCopy(): Promise<void> {
    if (selectedFile === null) {
      return;
    }

    await navigator.clipboard.writeText(selectedFile.content);
    setCopiedLabel();
  }

  return (
    <section aria-label="Move source view" className="ff-move-source">
      <header className="ff-move-source__header">
        <div>
          <p className="ff-move-source__eyebrow">Move</p>
          <h2 className="ff-move-source__title">Generated source</h2>
          <p className="ff-move-source__copy">Inspect the generated Move package in this tab to diagnose issues before switching to Deploy.</p>
        </div>
        <MoveSourceActions
          copyLabel={copyLabel}
          isCompiling={isCompiling}
          onCopy={() => { void handleCopy(); }}
          onRebuild={onRebuild}
          selectedFile={selectedFile}
        />
      </header>

      <div className="ff-move-source__body">
        <p className="ff-move-source__learn-banner">
          Learn how to extend this code using{" "}
          <a className="ff-move-source__learn-link" href="https://evefrontier.space/move/" rel="noreferrer" target="_blank">
            Learn Move on Sui
          </a>
        </p>
        <MoveSourceTabs files={files} onSelectFile={setSelectedFilePath} selectedFilePath={selectedFilePath} />
        <div
          aria-labelledby={selectedFile === null ? undefined : `move-source-tab-${selectedFile.path}`}
          className={highlightedBuildOutput === null ? "ff-move-source__panel" : "ff-move-source__panel ff-move-source__panel--split"}
          id={selectedFile === null ? undefined : `move-source-panel-${selectedFile.path}`}
          role={selectedFile === null ? undefined : "tabpanel"}
        >
          <div className="ff-move-source__panel-main">
            <MoveSourceContent displayedLines={displayedLines} highlightedSource={highlightedSource} selectedFile={selectedFile} status={status} />
          </div>
          {highlightedBuildOutput !== null ? <MoveBuildOutput highlightedBuildOutput={highlightedBuildOutput} /> : null}
        </div>
      </div>
    </section>
  );
}

export default MoveSourcePanel;