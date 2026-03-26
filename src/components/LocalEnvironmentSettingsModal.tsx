import { useEffect, useId, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

/* eslint-disable max-lines-per-function */

import {
  loadLocalEnvironmentConfig,
  saveLocalEnvironmentConfig,
  isValidEnvironmentUrl,
  isValidWorldPackageId,
  isValidWorldPackageVersion,
  trimLocalEnvironmentDraft,
  validateWorldPackageViaGraphQl,
  type LocalEnvironmentDraft,
} from "../data/localEnvironment";

interface LocalEnvironmentSettingsModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface LocalEnvironmentFieldErrors {
  readonly rpcUrl?: string;
  readonly graphQlUrl?: string;
  readonly worldPackageId?: string;
  readonly worldPackageVersion?: string;
}

type LocalEnvironmentTextField = Exclude<keyof LocalEnvironmentDraft, "useEphemeralKeypair">;

interface LocalEnvironmentFieldProps {
  readonly error?: string;
  readonly label: string;
  readonly onBlur: () => void;
  readonly onChange: (value: string) => void;
  readonly value: string;
}

interface LocalEnvironmentSettingsPanelProps {
  readonly closeButtonRef: RefObject<HTMLButtonElement | null>;
  readonly draft: LocalEnvironmentDraft;
  readonly errors: LocalEnvironmentFieldErrors;
  readonly graphQlValidationMessage: string | null;
  readonly handleFieldBlur: (field: LocalEnvironmentTextField) => void;
  readonly isSaving: boolean;
  readonly onClose: () => void;
  readonly onSave: () => void;
  readonly panelRef: RefObject<HTMLElement | null>;
  readonly setDraft: Dispatch<SetStateAction<LocalEnvironmentDraft>>;
  readonly setGraphQlValidationMessage: Dispatch<SetStateAction<string | null>>;
  readonly titleId: string;
}

function getFocusableElements(panel: HTMLElement | null): HTMLElement[] {
  if (panel === null) {
    return [];
  }

  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function trapFocusWithinPanel(
  event: KeyboardEvent,
  panel: HTMLElement | null,
  fallbackElement: HTMLButtonElement | null,
): void {
  const focusableElements = getFocusableElements(panel);

  if (focusableElements.length === 0) {
    event.preventDefault();
    fallbackElement?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function toDraft(): LocalEnvironmentDraft {
  const config = loadLocalEnvironmentConfig();

  return {
    rpcUrl: config.rpcUrl,
    graphQlUrl: config.graphQlUrl,
    worldPackageId: config.worldPackageId,
    worldPackageVersion: config.worldPackageVersion,
    useEphemeralKeypair: config.useEphemeralKeypair,
  };
}

function validateDraft(draft: LocalEnvironmentDraft): LocalEnvironmentFieldErrors {
  return {
    rpcUrl: isValidEnvironmentUrl(draft.rpcUrl) ? undefined : "Enter a valid HTTP or HTTPS RPC URL.",
    graphQlUrl: isValidEnvironmentUrl(draft.graphQlUrl) ? undefined : "Enter a valid HTTP or HTTPS GraphQL URL.",
    worldPackageId: isValidWorldPackageId(draft.worldPackageId) ? undefined : "Enter a valid 0x-prefixed hex world package id.",
    worldPackageVersion: isValidWorldPackageVersion(draft.worldPackageVersion) ? undefined : "Enter a valid semantic version such as 0.0.18.",
  };
}

function hasValidationErrors(errors: LocalEnvironmentFieldErrors): boolean {
  return Object.values(errors).some((value) => value !== undefined);
}

function getInputClassName(hasError: boolean): string {
  return hasError
    ? "ff-local-environment-modal__input ff-local-environment-modal__input--invalid"
    : "ff-local-environment-modal__input";
}

function LocalEnvironmentField({ error, label, onBlur, onChange, value }: LocalEnvironmentFieldProps) {
  const id = useId();

  return (
    <label className="ff-local-environment-modal__field" htmlFor={id}>
      <span className="ff-local-environment-modal__label">{label}</span>
      <input
        id={id}
        className={getInputClassName(error !== undefined)}
        onBlur={onBlur}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        type="text"
        value={value}
      />
      {error ? <span className="ff-local-environment-modal__error">{error}</span> : null}
    </label>
  );
}

// eslint-disable-next-line max-lines-per-function
function LocalEnvironmentSettingsPanel({
  closeButtonRef,
  draft,
  errors,
  graphQlValidationMessage,
  handleFieldBlur,
  isSaving,
  onClose,
  onSave,
  panelRef,
  setDraft,
  setGraphQlValidationMessage,
  titleId,
}: LocalEnvironmentSettingsPanelProps) {
  return (
    <div className="ff-deployment-modal" role="presentation">
      <div aria-hidden="true" className="ff-deployment-modal__backdrop" />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="ff-deployment-modal__panel ff-local-environment-modal__panel"
        ref={panelRef}
        role="dialog"
      >
        <header className="ff-deployment-modal__header">
          <div>
            <p className="ff-deployment-modal__eyebrow">Environment</p>
            <h2 className="ff-deployment-modal__title" id={titleId}>Local deployment settings</h2>
            <p className="ff-deployment-modal__copy">Configure the local RPC, GraphQL endpoint, world package metadata, and signing mode used for local EVE Frontier deployment.</p>
          </div>
          <button className="ff-local-environment-modal__close" onClick={onClose} ref={closeButtonRef} type="button">
            Close
          </button>
        </header>

        <div className="ff-local-environment-modal__grid">
          <LocalEnvironmentField
            error={errors.rpcUrl}
            label="RPC URL"
            onBlur={() => {
              handleFieldBlur("rpcUrl");
            }}
            onChange={(value) => {
              setDraft((currentDraft) => ({ ...currentDraft, rpcUrl: value }));
            }}
            value={draft.rpcUrl}
          />

          <LocalEnvironmentField
            error={errors.graphQlUrl}
            label="GraphQL URL"
            onBlur={() => {
              handleFieldBlur("graphQlUrl");
            }}
            onChange={(value) => {
              setDraft((currentDraft) => ({ ...currentDraft, graphQlUrl: value }));
            }}
            value={draft.graphQlUrl}
          />

          <LocalEnvironmentField
            error={errors.worldPackageId}
            label="World Package ID"
            onBlur={() => {
              handleFieldBlur("worldPackageId");
            }}
            onChange={(value) => {
              setDraft((currentDraft) => ({ ...currentDraft, worldPackageId: value }));
              setGraphQlValidationMessage(null);
            }}
            value={draft.worldPackageId}
          />

          <LocalEnvironmentField
            error={errors.worldPackageVersion}
            label="World Package Version"
            onBlur={() => {
              handleFieldBlur("worldPackageVersion");
            }}
            onChange={(value) => {
              setDraft((currentDraft) => ({ ...currentDraft, worldPackageVersion: value }));
            }}
            value={draft.worldPackageVersion}
          />

          <label className="ff-local-environment-modal__toggle">
            <input
              aria-label="Use ephemeral keypair"
              checked={draft.useEphemeralKeypair}
              className="ff-local-environment-modal__toggle-input"
              onChange={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  useEphemeralKeypair: event.target.checked,
                }));
              }}
              type="checkbox"
            />
            <span className="ff-local-environment-modal__toggle-copy">
              <span className="ff-local-environment-modal__label">Use ephemeral keypair</span>
              <span className="ff-local-environment-modal__toggle-help">
                Keep this enabled to fund and sign localnet deployments with a temporary faucet-backed keypair. Disable it to request approval from the connected wallet instead.
              </span>
            </span>
          </label>
        </div>

        {graphQlValidationMessage ? (
          <p className="ff-local-environment-modal__validation" role="alert">{graphQlValidationMessage}</p>
        ) : null}

        <footer className="ff-local-environment-modal__actions">
          <button className="ff-local-environment-modal__action" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="ff-local-environment-modal__action ff-local-environment-modal__action--primary" disabled={isSaving} onClick={onSave} type="button">
            {isSaving ? "Validating…" : "Save"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function useModalFocusManagement(
  isOpen: boolean,
  onClose: () => void,
  closeButtonRef: RefObject<HTMLButtonElement | null>,
  panelRef: RefObject<HTMLElement | null>,
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [closeButtonRef, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        trapFocusWithinPanel(event, panelRef.current, closeButtonRef.current);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeButtonRef, isOpen, onClose, panelRef]);
}

async function validateAndSaveLocalEnvironmentDraft(
  draft: LocalEnvironmentDraft,
): Promise<WorldPackageValidationSaveResult> {
  const graphQlValidation = await validateWorldPackageViaGraphQl({
    graphQlUrl: draft.graphQlUrl,
    worldPackageId: draft.worldPackageId,
  });

  if (!graphQlValidation.isValid) {
    return {
      didSave: false,
      message: graphQlValidation.message ?? "Could not validate the world package id against the configured GraphQL endpoint.",
    };
  }

  saveLocalEnvironmentConfig(typeof window === "undefined" ? undefined : window.localStorage, draft);
  return { didSave: true };
}

interface WorldPackageValidationSaveResult {
  readonly didSave: boolean;
  readonly message?: string;
}

function LocalEnvironmentSettingsModal({ isOpen, onClose }: LocalEnvironmentSettingsModalProps) {
  const [draft, setDraft] = useState<LocalEnvironmentDraft>(toDraft);
  const [errors, setErrors] = useState<LocalEnvironmentFieldErrors>({});
  const [graphQlValidationMessage, setGraphQlValidationMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useModalFocusManagement(isOpen, onClose, closeButtonRef, panelRef);

  if (!isOpen) {
    return null;
  }

  const handleFieldBlur = (field: LocalEnvironmentTextField) => {
    setDraft((currentDraft) => {
      const trimmedDraft = trimLocalEnvironmentDraft(currentDraft);
      const nextErrors = validateDraft(trimmedDraft);
      setErrors((currentErrors) => ({
        ...currentErrors,
        [field]: nextErrors[field],
      }));
      return trimmedDraft;
    });
  };

  const handleSave = async () => {
    const trimmedDraft = trimLocalEnvironmentDraft(draft);
    const nextErrors = validateDraft(trimmedDraft);

    setDraft(trimmedDraft);
    setErrors(nextErrors);
    setGraphQlValidationMessage(null);

    if (hasValidationErrors(nextErrors)) {
      return;
    }

    setIsSaving(true);
    const saveResult = await validateAndSaveLocalEnvironmentDraft(trimmedDraft);
    setIsSaving(false);

    if (!saveResult.didSave) {
      setGraphQlValidationMessage(saveResult.message ?? "Could not validate the world package id against the configured GraphQL endpoint.");
      setErrors((currentErrors) => ({
        ...currentErrors,
        worldPackageId: saveResult.message ?? currentErrors.worldPackageId,
      }));
      return;
    }

    onClose();
  };

  return (
    <LocalEnvironmentSettingsPanel
      closeButtonRef={closeButtonRef}
      draft={draft}
      errors={errors}
      graphQlValidationMessage={graphQlValidationMessage}
      handleFieldBlur={handleFieldBlur}
      isSaving={isSaving}
      onClose={onClose}
      onSave={() => {
        void handleSave();
      }}
      panelRef={panelRef}
      setDraft={setDraft}
      setGraphQlValidationMessage={setGraphQlValidationMessage}
      titleId={titleId}
    />
  );
}

export default LocalEnvironmentSettingsModal;