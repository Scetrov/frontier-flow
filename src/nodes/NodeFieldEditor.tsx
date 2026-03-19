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
          {options.map((option) => (
            <label key={option.value} className="ff-node-field-editor__choice">
              <span className="ff-node-field-editor__choice-main">
                <input
                  checked={selectedValues.has(option.value)}
                  className="ff-node-field-editor__checkbox"
                  onChange={() => {
                    onToggle(option.value);
                  }}
                  type="checkbox"
                />
                <span>{option.label}</span>
              </span>
              {option.description !== undefined && option.description.length > 0 ? (
                <span className="ff-node-field-editor__choice-meta">{option.description}</span>
              ) : null}
            </label>
          ))}
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

function NodeFieldEditor({ nodeLabel, nodeType, fields, onClose, onSave }: NodeFieldEditorProps) {
  const [draftFields, setDraftFields] = useState<NodeFieldMap>(() => normalizeNodeFields(nodeType, fields));
  const [nextCharacterAddress, setNextCharacterAddress] = useState("");
  const [remoteOptions, setRemoteOptions] = useState<readonly SelectableOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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

  const selectedTribeIds = useMemo(() => new Set(getNumberFieldList(draftFields, "selectedTribeIds")), [draftFields]);
  const selectedShipIds = useMemo(() => new Set(getNumberFieldList(draftFields, "selectedShipIds")), [draftFields]);
  const selectedGroupIds = useMemo(() => new Set(getNumberFieldList(draftFields, "selectedGroupIds")), [draftFields]);
  const characterAddresses = getStringFieldList(draftFields, "characterAddresses");

  const dialog = (
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

        <div className="ff-node-field-editor__body">
          {nodeType === "listTribe" ? (
            <NumericOptionEditor
              error={loadError}
              heading="Select one or more tribes from the live world API."
              loading={isLoadingOptions}
              onToggle={(value) => {
                setDraftFields((currentFields) => {
                  const next = new Set(getNumberFieldList(currentFields, "selectedTribeIds"));
                  if (next.has(value)) {
                    next.delete(value);
                  } else {
                    next.add(value);
                  }

                  return normalizeNodeFields(nodeType, { ...currentFields, selectedTribeIds: [...next] });
                });
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
                setDraftFields((currentFields) => {
                  const next = new Set(getNumberFieldList(currentFields, "selectedShipIds"));
                  if (next.has(value)) {
                    next.delete(value);
                  } else {
                    next.add(value);
                  }

                  return normalizeNodeFields(nodeType, { ...currentFields, selectedShipIds: [...next] });
                });
              }}
              options={remoteOptions}
              selectedValues={selectedShipIds}
            />
          ) : null}

          {nodeType === "listCharacter" ? (
            <CharacterListEditor
              addresses={characterAddresses}
              nextAddress={nextCharacterAddress}
              onAdd={() => {
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
              onRemove={(value) => {
                setDraftFields((currentFields) =>
                  normalizeNodeFields(nodeType, {
                    ...currentFields,
                    characterAddresses: getStringFieldList(currentFields, "characterAddresses").filter((address) => address !== value),
                  }),
                );
              }}
            />
          ) : null}

          {nodeType === "isInGroup" ? (
            <NumericOptionEditor
              error={null}
              heading="Select the ship groups this predicate should match."
              loading={false}
              onToggle={(value) => {
                setDraftFields((currentFields) => {
                  const next = new Set(getNumberFieldList(currentFields, "selectedGroupIds"));
                  if (next.has(value)) {
                    next.delete(value);
                  } else {
                    next.add(value);
                  }

                  return normalizeNodeFields(nodeType, { ...currentFields, selectedGroupIds: [...next] });
                });
              }}
              options={SHIP_GROUP_OPTIONS}
              selectedValues={selectedGroupIds}
            />
          ) : null}
        </div>

        <div className="ff-node-field-editor__actions">
          <button className="ff-node-field-editor__button" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="ff-node-field-editor__button ff-node-field-editor__button--primary"
            onClick={() => {
              onSave(draftFields);
            }}
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

export default NodeFieldEditor;