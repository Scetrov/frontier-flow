import type { CompilationStatus as CompilationStatusValue, CompilerDiagnostic } from "../compiler/types";

import CompilationStatus from "./CompilationStatus";

const repositoryUrl = "https://github.com/Scetrov/frontier-flow";

interface FooterProps {
  readonly status?: CompilationStatusValue;
  readonly diagnostics?: readonly CompilerDiagnostic[];
  readonly onSelectDiagnostic?: (nodeId: string) => void;
}

function Footer({ status = { state: "idle" }, diagnostics = [], onSelectDiagnostic }: FooterProps) {
  return (
    <footer className="border-t border-[var(--ui-border-dark)] bg-[rgba(26,10,10,0.94)] px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-heading text-[0.7rem] uppercase tracking-[0.24em] text-[var(--brand-orange)]">Build v{__APP_VERSION__}</span>
          <span>Low-code Sui Move automation shell for EVE Frontier.</span>
          <CompilationStatus diagnostics={diagnostics} onSelectDiagnostic={onSelectDiagnostic} status={status} />
        </div>
        <a
          className="font-heading text-[0.72rem] uppercase tracking-[0.24em] text-[var(--cream-white)] transition-colors hover:text-[var(--brand-orange)]"
          href={repositoryUrl}
          rel="noreferrer"
          target="_blank"
        >
          Source Repository
        </a>
      </div>
    </footer>
  );
}

export default Footer;