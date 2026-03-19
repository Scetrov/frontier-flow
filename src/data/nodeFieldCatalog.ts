import type { NodeFieldMap, NodeFieldValue } from "../types/nodes";

export interface NumericOption {
  readonly value: number;
  readonly label: string;
  readonly description?: string;
}

export const SHIP_GROUP_OPTIONS: readonly NumericOption[] = [
  { value: 31, label: "Shuttle", description: "Small civilian hull" },
  { value: 237, label: "Corvette", description: "Starter combat hull" },
  { value: 25, label: "Frigate", description: "Light combat ship" },
  { value: 420, label: "Destroyer", description: "Anti-frigate hull" },
  { value: 26, label: "Cruiser", description: "Medium combat ship" },
  { value: 419, label: "Combat Battlecruiser", description: "Heavy frontline hull" },
] as const;

const DEFAULT_FIELDS_BY_NODE_TYPE: Readonly<Partial<Record<string, NodeFieldMap>>> = {
  listTribe: { selectedTribeIds: [] },
  listShip: { selectedShipIds: [] },
  listCharacter: { characterAddresses: [] },
  isInGroup: { selectedGroupIds: [] },
};

const EDITABLE_NODE_TYPES = new Set(Object.keys(DEFAULT_FIELDS_BY_NODE_TYPE));

function readNumberList(value: NodeFieldValue | undefined): readonly number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

function readStringList(value: NodeFieldValue | undefined): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeStringList(value: NodeFieldValue | undefined): readonly string[] {
  const seen = new Set<string>();

  return readStringList(value)
    .map((item) => item.trim())
    .filter((item) => {
      if (item.length === 0 || seen.has(item)) {
        return false;
      }

      seen.add(item);
      return true;
    });
}

function normalizeNumberList(value: NodeFieldValue | undefined): readonly number[] {
  const seen = new Set<number>();

  return readNumberList(value).filter((item) => {
    if (!Number.isFinite(item) || seen.has(item)) {
      return false;
    }

    seen.add(item);
    return true;
  });
}

function asRecord(value: unknown): Readonly<Record<string, NodeFieldValue>> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  return value as Readonly<Record<string, NodeFieldValue>>;
}

export function hasEditableNodeFields(nodeType: string): boolean {
  return EDITABLE_NODE_TYPES.has(nodeType);
}

export function getDefaultNodeFields(nodeType: string): NodeFieldMap {
  return DEFAULT_FIELDS_BY_NODE_TYPE[nodeType] ?? {};
}

export function normalizeNodeFields(nodeType: string, incoming: unknown): NodeFieldMap {
  const fields = asRecord(incoming);

  switch (nodeType) {
    case "listTribe":
      return {
        selectedTribeIds: normalizeNumberList(fields.selectedTribeIds),
      };
    case "listShip":
      return {
        selectedShipIds: normalizeNumberList(fields.selectedShipIds),
      };
    case "listCharacter":
      return {
        characterAddresses: normalizeStringList(fields.characterAddresses),
      };
    case "isInGroup":
      return {
        selectedGroupIds: normalizeNumberList(fields.selectedGroupIds),
      };
    default:
      return {};
  }
}

export function getNumberFieldList(fields: NodeFieldMap | undefined, key: string): readonly number[] {
  if (fields === undefined) {
    return [];
  }

  return normalizeNumberList(fields[key]);
}

export function getStringFieldList(fields: NodeFieldMap | undefined, key: string): readonly string[] {
  if (fields === undefined) {
    return [];
  }

  return normalizeStringList(fields[key]);
}

export function getNodeFieldSummary(nodeType: string, fields: NodeFieldMap | undefined): readonly string[] {
  switch (nodeType) {
    case "listTribe": {
      const count = getNumberFieldList(fields, "selectedTribeIds").length;
      return [count === 0 ? "No tribes selected" : `${String(count)} tribe${count === 1 ? "" : "s"} selected`];
    }
    case "listShip": {
      const count = getNumberFieldList(fields, "selectedShipIds").length;
      return [count === 0 ? "No ships selected" : `${String(count)} ship${count === 1 ? "" : "s"} selected`];
    }
    case "listCharacter": {
      const addresses = getStringFieldList(fields, "characterAddresses");
      if (addresses.length === 0) {
        return ["No character addresses added"];
      }

      return [`${String(addresses.length)} character${addresses.length === 1 ? "" : "s"} configured`, addresses[0]];
    }
    case "isInGroup": {
      const selectedGroupIds = new Set(getNumberFieldList(fields, "selectedGroupIds"));
      const selectedLabels = SHIP_GROUP_OPTIONS.filter((option) => selectedGroupIds.has(option.value)).map((option) => option.label);
      if (selectedLabels.length === 0) {
        return ["No ship groups selected"];
      }

      return [selectedLabels.join(", ")];
    }
    default:
      return [];
  }
}