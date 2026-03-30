import type { CompilationStatus as CompilationStatusValue, CompilerDiagnostic, DeploymentStatus } from "../compiler/types";
import type { RemediationNotice } from "../types/nodes";

import CompilationStatus from "./CompilationStatus";
import { remediationNoticesToDiagnostics } from "./restoreSavedFlow";

const repositoryUrl = "https://github.com/Scetrov/frontier-flow";
const websiteUrl = "https://scetrov.live";

interface FooterProps {
  readonly deploymentStatus?: DeploymentStatus | null;
  readonly status?: CompilationStatusValue;
  readonly diagnostics?: readonly CompilerDiagnostic[];
  readonly remediationNotices?: readonly RemediationNotice[];
  readonly onSelectDiagnostic?: (nodeId: string) => void;
  readonly transientStatusMessage?: {
    readonly tone: "error" | "info" | "success";
    readonly text: string;
  } | null;
}

function getMergedDiagnostics(
  diagnostics: readonly CompilerDiagnostic[],
  remediationNotices: readonly RemediationNotice[],
): readonly CompilerDiagnostic[] {
  const remediationDiagnostics = remediationNoticesToDiagnostics(remediationNotices);

  return remediationDiagnostics.length > 0
    ? [...remediationDiagnostics, ...diagnostics]
    : diagnostics;
}

function getTransientStatusClassName(
  transientStatusMessage: FooterProps["transientStatusMessage"],
): string | null {
  if (transientStatusMessage == null) {
    return null;
  }

  const toneToClassName = {
    success: "text-[rgba(137,223,168,0.96)]",
    error: "text-[var(--brand-orange)]",
    info: "text-[var(--text-secondary)]",
  } as const;

  return toneToClassName[transientStatusMessage.tone];
}

function FooterStatusMessage({
  transientStatusMessage,
}: {
  readonly transientStatusMessage: FooterProps["transientStatusMessage"];
}) {
  const transientStatusClassName = getTransientStatusClassName(transientStatusMessage);

  if (transientStatusMessage == null || transientStatusClassName === null) {
    return null;
  }

  return (
    <span aria-live="polite" className={`font-heading text-[0.68rem] uppercase tracking-[0.18em] ${transientStatusClassName}`}>
      {transientStatusMessage.text}
    </span>
  );
}

function Footer({
  deploymentStatus = null,
  status = { state: "idle" },
  diagnostics = [],
  remediationNotices = [],
  onSelectDiagnostic,
  transientStatusMessage = null,
}: FooterProps) {
  const mergedDiagnostics = getMergedDiagnostics(diagnostics, remediationNotices);

  return (
    <footer className="border-t border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.94)] px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-heading text-[0.7rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">v{__APP_VERSION__}</span>
          <CompilationStatus deploymentStatus={deploymentStatus} diagnostics={mergedDiagnostics} onSelectDiagnostic={onSelectDiagnostic} status={status} />
          <FooterStatusMessage transientStatusMessage={transientStatusMessage} />
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <a
            className="font-heading text-[0.72rem] uppercase tracking-[0.24em] text-[var(--cream-white)] transition-colors hover:text-[var(--brand-orange)]"
            href="/colophon"
          >
            colophon
          </a>
          <a
            aria-label="GitHub Repository"
            className="inline-flex items-center justify-center text-[var(--cream-white)] transition-colors hover:text-[var(--brand-orange)]"
            href={repositoryUrl}
            rel="noreferrer"
            target="_blank"
          >
            <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 .5C5.649.5.5 5.649.5 12c0 5.086 3.292 9.403 7.86 10.925.575.106.785-.25.785-.556 0-.274-.01-1-.016-1.962-3.197.694-3.872-1.54-3.872-1.54-.523-1.328-1.277-1.682-1.277-1.682-1.044-.713.08-.699.08-.699 1.154.081 1.761 1.185 1.761 1.185 1.026 1.758 2.692 1.25 3.348.955.104-.743.402-1.25.73-1.538-2.552-.29-5.236-1.276-5.236-5.682 0-1.255.449-2.282 1.184-3.086-.119-.29-.513-1.459.112-3.042 0 0 .966-.309 3.166 1.179A11.02 11.02 0 0 1 12 6.08c.977.005 1.962.132 2.882.388 2.199-1.488 3.164-1.179 3.164-1.179.627 1.583.233 2.752.114 3.042.737.804 1.182 1.831 1.182 3.086 0 4.417-2.688 5.389-5.249 5.673.414.355.783 1.055.783 2.126 0 1.536-.014 2.775-.014 3.152 0 .308.207.668.79.555C20.211 21.399 23.5 17.084 23.5 12 23.5 5.649 18.351.5 12 .5Z" />
            </svg>
          </a>
          <a
            className="font-heading text-[0.72rem] uppercase tracking-[0.24em] text-[var(--cream-white)] transition-colors hover:text-[var(--brand-orange)]"
            href={websiteUrl}
            rel="noreferrer"
            target="_blank"
          >
            scetrov.live
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;