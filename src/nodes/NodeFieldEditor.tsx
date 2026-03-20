import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  SHIP_GROUP_OPTIONS,
  getNumberFieldList,
  getStringFieldList,
  normalizeNodeFields,
  type NumericOption,
} from "../data/nodeFieldCatalog";
import type { NodeFieldMap } from "../types/nodes";
import { buildShipOption, buildTribeOption, loadWorldApiOptions, type SelectableOption } from "./nodeFieldEditorOptions";

interface NodeFieldEditorProps {
  readonly nodeLabel: string;
  readonly nodeType: string;
  readonly fields: NodeFieldMap;
  readonly onClose: () => void;
  readonly onSave: (fields: NodeFieldMap) => void;
}

function toggleNumericField(currentFields: NodeFieldMap, key: string, value: number, nodeType: string): NodeFieldMap {
  const next = new Set(getNumberFieldList(currentFields, key));
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return normalizeNodeFields(nodeType, { ...currentFields, [key]: [...next].sort((left, right) => left - right) });
}

function useRemoteNodeFieldOptions(nodeType: string) {
  const [remoteOptions, setRemoteOptions] = useState<readonly SelectableOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadOptions() {
      if (nodeType !== "listTribe" && nodeType !== "listShip") {
        setRemoteOptions([]);
        setLoadError(null);
        setIsLoadingOptions(false);
        return;
      }

      setIsLoadingOptions(true);
      setLoadError(null);

      try {
        const options = nodeType === "listTribe"
          ? await loadWorldApiOptions(
              "https://world-api-stillness.live.tech.evefrontier.com/v2/tribes",
              buildTribeOption,
            )
          : await loadWorldApiOptions(
              "https://world-api-stillness.live.tech.evefrontier.com/v2/ships",
              buildShipOption,
            );

        if (!isCancelled) {
          setRemoteOptions(options);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load options.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingOptions(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isCancelled = true;
    };
  }, [nodeType]);

  return { remoteOptions, isLoadingOptions, loadError };
}

function NumericOptionEditor({
  heading,
  options,
  selectedValues,
  loading,
  error,
  onToggle,
}: {
  readonly heading: string;
  readonly options: readonly NumericOption[] | readonly SelectableOption[];
  readonly selectedValues: ReadonlySet<number>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onToggle: (value: number) => void;
}) {
  return (
    <section className="ff-node-field-editor__section">
      <div className="ff-node-field-editor__section-header">
        <p className="ff-node-field-editor__label">Values</p>
        <p className="ff-contract-bar__meta">{heading}</p>
      </div>

      {loading ? <p className="ff-node-field-editor__empty">Loading options…</p> : null}
      {error !== null ? <p className="ff-node-field-editor__error">{error}</p> : null}

      {!loading && error === null ? (
        <div className="ff-node-field-editor__list">
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value);

            return (
            <label
              key={option.value}
              className={`ff-node-field-editor__choice${isSelected ? " is-selected" : ""}`}
            >
              <span className="ff-node-field-editor__choice-main">
                <input
                  checked={isSelected}
                  className="ff-node-field-editor__checkbox"
                  onChange={() => {
                    onToggle(option.value);
                  }}
                  type="checkbox"
                />
                <span aria-hidden="true" className="ff-node-field-editor__checkbox-indicator" />
                <span>{option.label}</span>
              </span>
              {option.description !== undefined && option.description.length > 0 ? (
                <span className="ff-node-field-editor__choice-meta">{option.description}</span>
              ) : null}
            </label>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function CharacterListEditor({
  addresses,
  nextAddress,
  onAddressChange,
  onAdd,
  onRemove,
}: {
  readonly addresses: readonly string[];
  readonly nextAddress: string;
  readonly onAddressChange: (value: string) => void;
  readonly onAdd: () => void;
  readonly onRemove: (value: string) => void;
}) {
  return (
    <section className="ff-node-field-editor__section">
      <div className="ff-node-field-editor__section-header">
        <p className="ff-node-field-editor__label">Character Addresses</p>
        <p className="ff-contract-bar__meta">Add one address per entry.</p>
      </div>

      <div className="ff-node-field-editor__list-row">
        <input
          aria-label="Character address"
          className="ff-node-field-editor__input"
          onChange={(event) => {
            onAddressChange(event.target.value);
          }}
          placeholder="0x1234..."
          type="text"
          value={nextAddress}
        />
        <button className="ff-node-field-editor__add" onClick={onAdd} type="button">
          Add
        </button>
      </div>

      {addresses.length === 0 ? <p className="ff-node-field-editor__empty">No character addresses added yet.</p> : null}

      {addresses.length > 0 ? (
        <div className="ff-node-field-editor__list">
          {addresses.map((address) => (
            <div key={address} className="ff-node-field-editor__list-row">
              <span className="ff-node-field-editor__choice-main">{address}</span>
              <button
                className="ff-node-field-editor__remove"
                onClick={() => {
                  onRemove(address);
                }}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function NodeFieldEditorBody({
  characterAddresses,
  isLoadingOptions,
  loadError,
  nextCharacterAddress,
  nodeType,
  onAddCharacter,
  onAddressChange,
  onRemoveCharacter,
  onSetDraftFields,
  remoteOptions,
  selectedGroupIds,
  selectedShipIds,
  selectedTribeIds,
}: {
  readonly characterAddresses: readonly string[];
  readonly isLoadingOptions: boolean;
  readonly loadError: string | null;
  readonly nextCharacterAddress: string;
  readonly nodeType: string;
  readonly onAddCharacter: () => void;
  readonly onAddressChange: (value: string) => void;
  readonly onRemoveCharacter: (value: string) => void;
  readonly onSetDraftFields: React.Dispatch<React.SetStateAction<NodeFieldMap>>;
  readonly remoteOptions: readonly SelectableOption[];
  readonly selectedGroupIds: ReadonlySet<number>;
  readonly selectedShipIds: ReadonlySet<number>;
  readonly selectedTribeIds: ReadonlySet<number>;
}) {
  return (
    <div className="ff-node-field-editor__body">
      {nodeType === "listTribe" ? (
        <NumericOptionEditor
          error={loadError}
          heading="Select one or more tribes from the live world API."
          loading={isLoadingOptions}
          onToggle={(value) => {
            onSetDraftFields((currentFields) => toggleNumericField(currentFields, "selectedTribeIds", value, nodeType));
          }}
          options={remoteOptions}
          selectedValues={selectedTribeIds}
        />
      ) : null}

      {nodeType === "listShip" ? (
        <NumericOptionEditor
          error={loadError}
          heading="Select one or more ships from the live world API."
          loading={isLoadingOptions}
          onToggle={(value) => {
            onSetDraftFields((currentFields) => toggleNumericField(currentFields, "selectedShipIds", value, nodeType));
          }}
          options={remoteOptions}
          selectedValues={selectedShipIds}
        />
      ) : null}

      {nodeType === "listCharacter" ? (
        <CharacterListEditor
          addresses={characterAddresses}
          nextAddress={nextCharacterAddress}
          onAdd={onAddCharacter}
          onAddressChange={onAddressChange}
          onRemove={onRemoveCharacter}
        />
      ) : null}

      {nodeType === "isInGroup" ? (
        <NumericOptionEditor
          error={null}
          heading="Select the ship groups this predicate should match."
          loading={false}
          onToggle={(value) => {
            onSetDraftFields((currentFields) => toggleNumericField(currentFields, "selectedGroupIds", value, nodeType));
          }}
          options={SHIP_GROUP_OPTIONS}
          selectedValues={selectedGroupIds}
        />
      ) : null}
    </div>
  );
}

function NodeFieldEditorDialog({
  children,
  dialogDescriptionId,
  dialogRef,
  dialogTitleId,
  nodeLabel,
  onClose,
  onSave,
}: {
  readonly children: React.ReactNode;
  readonly dialogDescriptionId: string;
  readonly dialogRef: React.RefObject<HTMLDivElement | null>;
  readonly dialogTitleId: string;
  readonly nodeLabel: string;
  readonly onClose: () => void;
  readonly onSave: () => void;
}) {
  return (
    <div className="ff-node-field-editor" role="presentation">
      <button aria-label="Close node editor" className="ff-node-field-editor__backdrop" onClick={onClose} type="button" />
      <div
        aria-describedby={dialogDescriptionId}
        aria-labelledby={dialogTitleId}
        aria-modal="true"
        className="ff-node-field-editor__dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div>
          <p className="ff-node-field-editor__eyebrow">Node Editor</p>
          <h2 className="ff-node-field-editor__title" id={dialogTitleId}>{nodeLabel}</h2>
          <p className="ff-contract-bar__meta" id={dialogDescriptionId}>Configure node-specific values before saving your changes.</p>
        </div>

        {children}

        <div className="ff-node-field-editor__actions">
          <button className="ff-node-field-editor__button" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="ff-node-field-editor__button ff-node-field-editor__button--primary" onClick={onSave} type="button">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function NodeFieldEditor({ nodeLabel, nodeType, fields, onClose, onSave }: NodeFieldEditorProps) {
  const [draftFields, setDraftFields] = useState<NodeFieldMap>(() => normalizeNodeFields(nodeType, fields));
  const [nextCharacterAddress, setNextCharacterAddress] = useState("");
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { remoteOptions, isLoadingOptions, loadError } = useRemoteNodeFieldOptions(nodeType);

  useEffect(() => {
    setDraftFields(normalizeNodeFields(nodeType, fields));
  }, [fields, nodeType]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();

    return () => {
      const previousFocus = previousFocusRef.current;
      if (previousFocus !== null && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectedTribeIds = useMemo(() => new Set(getNumberFieldList(draftFields, "selectedTribeIds")), [draftFields]);
  const selectedShipIds = useMemo(() => new Set(getNumberFieldList(draftFields, "selectedShipIds")), [draftFields]);
  const selectedGroupIds = useMemo(() => new Set(getNumberFieldList(draftFields, "selectedGroupIds")), [draftFields]);
  const characterAddresses = getStringFieldList(draftFields, "characterAddresses");

  return createPortal(
    <NodeFieldEditorDialog
      dialogDescriptionId={dialogDescriptionId}
      dialogRef={dialogRef}
      dialogTitleId={dialogTitleId}
      nodeLabel={nodeLabel}
      onClose={onClose}
      onSave={() => {
        onSave(draftFields);
      }}
    >
      <NodeFieldEditorBody
        characterAddresses={characterAddresses}
        isLoadingOptions={isLoadingOptions}
        loadError={loadError}
        nextCharacterAddress={nextCharacterAddress}
        nodeType={nodeType}
        onAddCharacter={() => {
          const trimmedValue = nextCharacterAddress.trim();
          if (trimmedValue.length === 0) {
            return;
          }

          setDraftFields((currentFields) =>
            normalizeNodeFields(nodeType, {
              ...currentFields,
              characterAddresses: [...getStringFieldList(currentFields, "characterAddresses"), trimmedValue],
            }),
          );
          setNextCharacterAddress("");
        }}
        onAddressChange={setNextCharacterAddress}
        onRemoveCharacter={(value) => {
          setDraftFields((currentFields) =>
            normalizeNodeFields(nodeType, {
              ...currentFields,
              characterAddresses: getStringFieldList(currentFields, "characterAddresses").filter((address) => address !== value),
            }),
          );
        }}
        onSetDraftFields={setDraftFields}
        remoteOptions={remoteOptions}
        selectedGroupIds={selectedGroupIds}
        selectedShipIds={selectedShipIds}
        selectedTribeIds={selectedTribeIds}
      />
    </NodeFieldEditorDialog>,
    document.body,
  );
}

export default NodeFieldEditor;