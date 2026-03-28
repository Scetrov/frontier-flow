import { useEffect, useId, useRef, useState } from "react";
import { Database, Download, Upload, X } from "lucide-react";

import type { GraphTransferMode, GraphTransferState } from "../hooks/useGraphTransfer";
import type { NamedFlowContract } from "../utils/contractStorage";

interface GraphTransferDialogProps {
  readonly activeContract: NamedFlowContract;
  readonly walletConnected: boolean;
  readonly state: GraphTransferState;
  readonly onDismiss: () => void;
  readonly onImportFromFile: (file: File) => Promise<void>;
  readonly onImportFromWalrus: (blobId: string) => Promise<void>;
  readonly onPublish: () => Promise<void>;
  readonly onExport: () => Promise<void>;
}

function getDialogTitle(mode: GraphTransferMode | null): string {
  switch (mode) {
    case "import-file":
      return "Import YAML";
    case "import-walrus":
      return "Import From Walrus";
    case "publish":
      return "Export Walrus";
    case "export":
      return "Export YAML";
    default:
      return "Graph Transfer";
  }
}

export default function GraphTransferDialog({
  activeContract,
  walletConnected,
  state,
  onDismiss,
  onImportFromFile,
  onImportFromWalrus,
  onPublish,
  onExport,
}: GraphTransferDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const dismissRef = useRef<HTMLButtonElement | null>(null);
  const [walrusReference, setWalrusReference] = useState("");
  const fileInputId = useId();

  const actionButtonClassName = "ff-contract-bar__button ff-contract-bar__button--with-icon";

  useEffect(() => {
    if (!state.isOpen) {
      return;
    }

    dismissRef.current?.focus();
  }, [state.isOpen]);

  useEffect(() => {
    if (!state.isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss, state.isOpen]);

  if (!state.isOpen || state.mode === null) {
    return null;
  }

  return (
    <div className="ff-transfer-dialog__overlay" role="presentation">
      <button aria-label="Dismiss graph transfer dialog backdrop" className="ff-transfer-dialog__backdrop" onClick={onDismiss} type="button" />
      <div aria-labelledby="ff-transfer-dialog-title" aria-modal="true" className="ff-transfer-dialog" ref={dialogRef} role="dialog">
        <div className="ff-transfer-dialog__header">
          <div>
            <p className="ff-transfer-dialog__eyebrow">Graph Transfer</p>
            <h2 className="ff-transfer-dialog__title" id="ff-transfer-dialog-title">{getDialogTitle(state.mode)}</h2>
          </div>
          <button aria-label="Dismiss graph transfer dialog" className="ff-transfer-dialog__dismiss" onClick={onDismiss} ref={dismissRef} type="button">
            <X aria-hidden="true" className="ff-contract-bar__button-icon" />
            <span className="ff-contract-bar__button-label">Close</span>
          </button>
        </div>

        <div className="ff-transfer-dialog__body">
          {state.mode === "export" ? (
            <section className="ff-transfer-dialog__section">
              <p className="ff-transfer-dialog__copy">Download the active contract as a portable YAML document.</p>
              <p className="ff-transfer-dialog__detail">Contract: {activeContract.name}</p>
              <button className={actionButtonClassName} disabled={state.status === "publishing" || state.status === "validating"} onClick={() => { void onExport(); }} type="button">
                <Download aria-hidden="true" className="ff-contract-bar__button-icon" />
                <span className="ff-contract-bar__button-label">Download YAML</span>
              </button>
            </section>
          ) : null}

          {state.mode === "import-file" ? (
            <section className="ff-transfer-dialog__section">
              <p className="ff-transfer-dialog__copy">Select a previously exported Frontier Flow YAML file.</p>
              <label className="ff-contract-bar__field" htmlFor={fileInputId}>
                <span className="ff-contract-bar__label">Graph document</span>
                <input
                  accept=".yaml,.yml,text/yaml,application/x-yaml,application/x.frontier-flow+yaml"
                  className="ff-contract-bar__input ff-transfer-dialog__file-input"
                  id={fileInputId}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file !== undefined) {
                      void onImportFromFile(file);
                    }
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
              </label>
            </section>
          ) : null}

          {state.mode === "import-walrus" ? (
            <section className="ff-transfer-dialog__section">
              <p className="ff-transfer-dialog__copy">Enter a Walrus blob id to restore a published graph into the local contract library.</p>
              <label className="ff-contract-bar__field">
                <span className="ff-contract-bar__label">Walrus blob id</span>
                <input
                  aria-label="Walrus blob id"
                  className="ff-contract-bar__input"
                  onChange={(event) => { setWalrusReference(event.target.value); }}
                  placeholder="blob id"
                  type="text"
                  value={walrusReference}
                />
              </label>
              <button className={actionButtonClassName} disabled={state.status === "validating" || state.status === "importing"} onClick={() => { void onImportFromWalrus(walrusReference); }} type="button">
                <Database aria-hidden="true" className="ff-contract-bar__button-icon" />
                <span className="ff-contract-bar__button-label">Import Walrus</span>
              </button>
            </section>
          ) : null}

          {state.mode === "publish" ? (
            <section className="ff-transfer-dialog__section">
              <p className="ff-transfer-dialog__copy">Export the active contract to Walrus and store a reusable blob reference on the current local contract.</p>
              <p className="ff-transfer-dialog__detail">Contract: {activeContract.name}</p>
              <p className="ff-transfer-dialog__detail">Wallet: {walletConnected ? "Connected" : "Not connected"}</p>
              <button className={actionButtonClassName} disabled={!walletConnected || state.status === "publishing"} onClick={() => { void onPublish(); }} type="button">
                <Upload aria-hidden="true" className="ff-contract-bar__button-icon" />
                <span className="ff-contract-bar__button-label">Export Walrus</span>
              </button>
            </section>
          ) : null}

          {state.message !== null ? (
            <div aria-live="polite" className={`ff-transfer-dialog__status ff-transfer-dialog__status--${state.status}`} role="status">
              {state.message}
            </div>
          ) : null}

          {state.result?.walrusReference !== undefined ? (
            <div className="ff-transfer-dialog__result">
              <p className="ff-transfer-dialog__label">Walrus blob id</p>
              <code className="ff-transfer-dialog__code">{state.result.walrusReference.blobId}</code>
            </div>
          ) : null}

          {state.result?.importedName !== undefined ? (
            <div className="ff-transfer-dialog__result">
              <p className="ff-transfer-dialog__label">Imported contract</p>
              <code className="ff-transfer-dialog__code">{state.result.importedName}</code>
            </div>
          ) : null}

          {state.result?.downloadName !== undefined ? (
            <div className="ff-transfer-dialog__result">
              <p className="ff-transfer-dialog__label">Downloaded file</p>
              <code className="ff-transfer-dialog__code">{state.result.downloadName}</code>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}