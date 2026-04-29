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

export const BEHAVIOUR_CODE_OPTIONS: readonly NumericOption[] = [
  { value: 1, label: "Entered", description: "Target entered turret range" },
  { value: 2, label: "Started Attack", description: "Target began attacking" },
  { value: 3, label: "Stopped Attack", description: "Target stopped attacking" },
] as const;

const DEFAULT_FIELDS_BY_NODE_TYPE: Readonly<Partial<Record<string, NodeFieldMap>>> = {
  hasBehaviour: { selectedBehaviourCodes: [] },
  listTribe: { selectedTribeIds: [] },
  listShip: { selectedShipIds: [] },
  listCharacter: { characterAddresses: [] },
  isInGroup: { selectedGroupIds: [] },
};

const EDITABLE_NODE_TYPES = new Set(["hasBehaviour", "listTribe", "listShip", "listCharacter", "isInGroup"]);
const MAX_SAFE_QUEUE_WEIGHT = Number.MAX_SAFE_INTEGER;

function normalizeQueueWeight(value: NodeFieldValue | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 100;
  }

  const clampedValue = Math.min(Math.trunc(value), MAX_SAFE_QUEUE_WEIGHT);

  return clampedValue <= 0 ? 100 : clampedValue;
}

type NodeFieldNormalizer = (fields: Readonly<Record<string, NodeFieldValue>>) => NodeFieldMap;

function normalizeAddToQueueFields(fields: Readonly<Record<string, NodeFieldValue>>): NodeFieldMap {
  if (!("weight" in fields)) {
    return {};
  }

  return {
    weight: normalizeQueueWeight(fields.weight),
  };
}

const NODE_FIELD_NORMALIZERS: Readonly<Partial<Record<string, NodeFieldNormalizer>>> = {
  behaviourBonus: (fields) => ({
    bonusStrategy: fields.bonusStrategy === "player-target" ? "player-target" : "behaviour-only",
  }),
  damageBonus: (fields) => ({
    damageStrategy: fields.damageStrategy === "remaining-total" ? "remaining-total" : "weighted-break",
  }),
  hasBehaviour: (fields) => ({
    selectedBehaviourCodes: normalizeNumberList(fields.selectedBehaviourCodes),
  }),
  listTribe: (fields) => ({
    selectedTribeIds: normalizeNumberList(fields.selectedTribeIds),
  }),
  listShip: (fields) => ({
    selectedShipIds: normalizeNumberList(fields.selectedShipIds),
  }),
  listCharacter: (fields) => ({
    characterAddresses: normalizeStringList(fields.characterAddresses),
  }),
  isInGroup: (fields) => ({
    selectedGroupIds: normalizeNumberList(fields.selectedGroupIds),
  }),
  addToQueue: normalizeAddToQueueFields,
};

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
  return NODE_FIELD_NORMALIZERS[nodeType]?.(fields) ?? {};
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

type NodeFieldSummaryBuilder = (fields: NodeFieldMap | undefined) => readonly string[];

function formatSelectionSummary(count: number, singularLabel: string, emptyLabel: string): readonly string[] {
  return [count === 0 ? emptyLabel : `${String(count)} ${singularLabel}${count === 1 ? "" : "s"} selected`];
}

function summarizeTribes(fields: NodeFieldMap | undefined): readonly string[] {
  return formatSelectionSummary(getNumberFieldList(fields, "selectedTribeIds").length, "tribe", "No tribes selected");
}

function summarizeShips(fields: NodeFieldMap | undefined): readonly string[] {
  return formatSelectionSummary(getNumberFieldList(fields, "selectedShipIds").length, "ship", "No ships selected");
}

function summarizeCharacters(fields: NodeFieldMap | undefined): readonly string[] {
  const addresses = getStringFieldList(fields, "characterAddresses");
  if (addresses.length === 0) {
    return ["No character addresses added"];
  }

  return [`${String(addresses.length)} character${addresses.length === 1 ? "" : "s"} configured`, addresses[0]];
}

function summarizeShipGroups(fields: NodeFieldMap | undefined): readonly string[] {
  const selectedGroupIds = new Set(getNumberFieldList(fields, "selectedGroupIds"));
  const selectedLabels = SHIP_GROUP_OPTIONS.filter((option) => selectedGroupIds.has(option.value)).map((option) => option.label);
  return selectedLabels.length === 0 ? ["No ship groups selected"] : [selectedLabels.join(", ")];
}

function summarizeBehaviours(fields: NodeFieldMap | undefined): readonly string[] {
  const selectedBehaviourCodes = new Set(getNumberFieldList(fields, "selectedBehaviourCodes"));
  const selectedLabels = BEHAVIOUR_CODE_OPTIONS
    .filter((option) => selectedBehaviourCodes.has(option.value))
    .map((option) => option.label);

  return selectedLabels.length === 0 ? ["No behaviours selected"] : [selectedLabels.join(", ")];
}

const NODE_FIELD_SUMMARY_BUILDERS: Readonly<Partial<Record<string, NodeFieldSummaryBuilder>>> = {
  hasBehaviour: summarizeBehaviours,
  isInGroup: summarizeShipGroups,
  listCharacter: summarizeCharacters,
  listShip: summarizeShips,
  listTribe: summarizeTribes,
};

export function getNodeFieldSummary(nodeType: string, fields: NodeFieldMap | undefined): readonly string[] {
  return NODE_FIELD_SUMMARY_BUILDERS[nodeType]?.(fields) ?? [];
}