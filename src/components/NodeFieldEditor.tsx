import { useMemo, useState } from "react";

import type {
  EditableFieldDefinition,
  NodeFieldScalarValue,
  NodeFieldValue,
  NodeFieldValueSet,
} from "../types/nodes";

interface NodeFieldEditorProps {
  readonly nodeLabel: string;
  readonly fields: readonly EditableFieldDefinition[];
  readonly valueSet?: NodeFieldValueSet;
  readonly onCancel: () => void;
  readonly onSave: (valueSet: NodeFieldValueSet) => void;
}

type DraftFieldValue = string | string[];

function isListValue(value: NodeFieldValue | undefined): value is readonly NodeFieldScalarValue[] {
  return Array.isArray(value);
}

function createDraftValue(field: EditableFieldDefinition, valueSet: NodeFieldValueSet | undefined): DraftFieldValue {
  const persistedValue = valueSet?.values[field.id] ?? field.defaultValue;

  if (field.editorKind === "list-editor") {
    if (isListValue(persistedValue)) {
      return persistedValue.map((entry) => String(entry));
    }

    return [];
  }

  return persistedValue === undefined ? "" : String(persistedValue);
}

function coerceScalarValue(field: EditableFieldDefinition, rawValue: string): NodeFieldScalarValue | undefined {
  const trimmedValue = rawValue.trim();

  switch (field.valueType) {
    case "number":
    case "typeId": {
      if (trimmedValue.length === 0) {
        return undefined;
      }

      const parsedValue = Number(trimmedValue);
      return Number.isFinite(parsedValue) ? parsedValue : undefined;
    }
    case "boolean":
      if (trimmedValue === "true") {
        return true;
      }

      if (trimmedValue === "false") {
        return false;
      }

      return undefined;
    case "string":
    case "tribe":
      return trimmedValue;
  }
}

function validateFieldDraft(field: EditableFieldDefinition, draftValue: DraftFieldValue): { value?: NodeFieldValue; error?: string } {
  if (field.editorKind === "list-editor") {
    const values = Array.isArray(draftValue) ? draftValue : [];
    const normalizedValues: NodeFieldScalarValue[] = [];
    const seenValues = new Set<string>();

    values.forEach((entry, index) => {
      const trimmedValue = entry.trim();
      if (trimmedValue.length === 0 && field.validationRules?.allowBlank !== true) {
        throw new Error(`${field.label} item ${String(index + 1)} cannot be blank.`);
      }

      if (trimmedValue.length === 0) {
        return;
      }

      const coercedValue = coerceScalarValue(field, trimmedValue);
      if (coercedValue === undefined || (typeof coercedValue === "string" && coercedValue.trim().length === 0)) {
        throw new Error(`${field.label} item ${String(index + 1)} is invalid.`);
      }

      const duplicateKey = typeof coercedValue === "string" ? coercedValue.toLowerCase() : String(coercedValue);
      if (field.validationRules?.allowDuplicates !== true && seenValues.has(duplicateKey)) {
        throw new Error(`${field.label} contains a duplicate value.`);
      }

      seenValues.add(duplicateKey);
      normalizedValues.push(coercedValue);
    });

    if ((field.validationRules?.minItems ?? 0) > normalizedValues.length) {
      return {
        error: `${field.label} requires at least ${String(field.validationRules?.minItems ?? 0)} value(s).`,
      };
    }

    return {
      value: normalizedValues,
    };
  }

  const scalarDraft = typeof draftValue === "string" ? draftValue : "";
  const coercedValue = coerceScalarValue(field, scalarDraft);

  if (field.required && (coercedValue === undefined || coercedValue === "")) {
    return {
      error: `${field.label} is required.`,
    };
  }

  if (scalarDraft.trim().length > 0 && coercedValue === undefined) {
    return {
      error: `${field.label} is invalid.`,
    };
  }

  return {
    value: coercedValue,
  };
}

/**
 * Modal editor for node-level typed field values.
 */
function NodeFieldEditor({ nodeLabel, fields, valueSet, onCancel, onSave }: NodeFieldEditorProps) {
  const [draftValues, setDraftValues] = useState<Record<string, DraftFieldValue>>(() =>
    Object.fromEntries(fields.map((field) => [field.id, createDraftValue(field, valueSet)])),
  );
  const [errorsByField, setErrorsByField] = useState<Record<string, string>>({});

  const headingId = useMemo(() => `node-field-editor-${nodeLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, [nodeLabel]);

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    const nextValues: Record<string, NodeFieldValue> = {};

    for (const field of fields) {
      try {
        const validation = validateFieldDraft(field, draftValues[field.id] ?? createDraftValue(field, valueSet));
        if (validation.error !== undefined) {
          nextErrors[field.id] = validation.error;
          continue;
        }

        if (validation.value !== undefined) {
          nextValues[field.id] = validation.value;
        }
      } catch (error) {
        nextErrors[field.id] = error instanceof Error ? error.message : `${field.label} is invalid.`;
      }
    }

    setErrorsByField(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSave({
      values: nextValues,
      lastEditedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="ff-node-field-editor" role="presentation">
      <button aria-label="Dismiss node field editor" className="ff-node-field-editor__backdrop" onClick={onCancel} type="button" />
      <div aria-labelledby={headingId} aria-modal="true" className="ff-node-field-editor__dialog" role="dialog">
        <div className="ff-node-field-editor__header">
          <p className="ff-node-field-editor__eyebrow">Node Fields</p>
          <h2 className="ff-node-field-editor__title" id={headingId}>
            Edit fields for {nodeLabel}
          </h2>
        </div>

        <div className="ff-node-field-editor__body">
          {fields.map((field) => {
            const draftValue = draftValues[field.id] ?? createDraftValue(field, valueSet);
            const listValues = Array.isArray(draftValue) ? draftValue : [];

            return (
              <section className="ff-node-field-editor__section" key={field.id}>
                <div className="ff-node-field-editor__section-header">
                  <label className="ff-node-field-editor__label">{field.label}</label>
                  {field.editorKind === "list-editor" ? (
                    <button
                      className="ff-node-field-editor__add"
                      onClick={() => {
                        setDraftValues((currentValues) => ({
                          ...currentValues,
                          [field.id]: [...listValues, ""],
                        }));
                      }}
                      type="button"
                    >
                      Add {field.label} value
                    </button>
                  ) : null}
                </div>

                {field.editorKind === "list-editor" ? (
                  <div className="ff-node-field-editor__list">
                    {listValues.length === 0 ? (
                      <p className="ff-node-field-editor__empty">No values added yet.</p>
                    ) : null}
                    {listValues.map((entry, index) => (
                      <div className="ff-node-field-editor__list-row" key={`${field.id}_${String(index)}`}>
                        <input
                          aria-label={`${field.label} value ${String(index + 1)}`}
                          className="ff-node-field-editor__input"
                          onChange={(event) => {
                            const nextValues = [...listValues];
                            nextValues[index] = event.target.value;
                            setDraftValues((currentValues) => ({
                              ...currentValues,
                              [field.id]: nextValues,
                            }));
                          }}
                          type="text"
                          value={entry}
                        />
                        <button
                          aria-label={`Remove ${field.label} value ${String(index + 1)}`}
                          className="ff-node-field-editor__remove"
                          onClick={() => {
                            setDraftValues((currentValues) => ({
                              ...currentValues,
                              [field.id]: listValues.filter((_, valueIndex) => valueIndex !== index),
                            }));
                          }}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <input
                    aria-label={field.label}
                    className="ff-node-field-editor__input"
                    onChange={(event) => {
                      setDraftValues((currentValues) => ({
                        ...currentValues,
                        [field.id]: event.target.value,
                      }));
                    }}
                    type="text"
                    value={String(draftValue)}
                  />
                )}

                {field.id in errorsByField ? <p className="ff-node-field-editor__error">{errorsByField[field.id]}</p> : null}
              </section>
            );
          })}
        </div>

        <div className="ff-node-field-editor__actions">
          <button className="ff-node-field-editor__button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="ff-node-field-editor__button ff-node-field-editor__button--primary" onClick={handleSave} type="button">
            Save node fields
          </button>
        </div>
      </div>
    </div>
  );
}

export default NodeFieldEditor;