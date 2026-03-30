import type { SimulationCandidateDraft, SimulationFieldErrors } from "../types/turretSimulation";

export interface ValidateSimulationDraftInput {
  readonly candidate: SimulationCandidateDraft;
  readonly ownerCharacterId: string | null;
}

export interface ValidateSimulationDraftResult {
  readonly isValid: boolean;
  readonly fieldErrors: SimulationFieldErrors;
}

interface DigitFieldRule {
  readonly key: "itemId" | "typeId" | "groupId" | "priorityWeight";
  readonly message: string;
}

interface RatioFieldRule {
  readonly key: "hpRatio" | "shieldRatio" | "armorRatio";
  readonly invalidMessage: string;
  readonly rangeMessage: string;
}

const DIGIT_FIELD_RULES: readonly DigitFieldRule[] = [
  { key: "itemId", message: "Item id must be a non-negative integer." },
  { key: "typeId", message: "Type id must be a non-negative integer." },
  { key: "groupId", message: "Group id must be a non-negative integer." },
  { key: "priorityWeight", message: "Priority weight must be a non-negative integer." },
];

const RATIO_FIELD_RULES: readonly RatioFieldRule[] = [
  { key: "hpRatio", invalidMessage: "HP ratio must be a non-negative integer.", rangeMessage: "HP ratio must stay within 0-100." },
  { key: "shieldRatio", invalidMessage: "Shield ratio must be a non-negative integer.", rangeMessage: "Shield ratio must stay within 0-100." },
  { key: "armorRatio", invalidMessage: "Armor ratio must be a non-negative integer.", rangeMessage: "Armor ratio must stay within 0-100." },
];

function validateDigitFields(candidate: SimulationCandidateDraft, fieldErrors: SimulationFieldErrors): void {
  for (const rule of DIGIT_FIELD_RULES) {
    if (!isDigitsOnly(candidate[rule.key])) {
      fieldErrors[rule.key] = rule.message;
    }
  }
}

function validateRatioFields(candidate: SimulationCandidateDraft, fieldErrors: SimulationFieldErrors): void {
  for (const rule of RATIO_FIELD_RULES) {
    const value = candidate[rule.key];

    if (!isDigitsOnly(value)) {
      fieldErrors[rule.key] = rule.invalidMessage;
      continue;
    }

    if (Number(value) > 100) {
      fieldErrors[rule.key] = rule.rangeMessage;
    }
  }
}

function validateCharacterFields(candidate: SimulationCandidateDraft, fieldErrors: SimulationFieldErrors): void {
  if (candidate.characterId !== null && !isU32(candidate.characterId)) {
    fieldErrors.characterId = "Character id must be a non-negative integer within u32 range.";
  }

  if (candidate.characterTribe !== null && !isU32(candidate.characterTribe)) {
    fieldErrors.characterTribe = "Character tribe must be a non-negative integer within u32 range.";
  }
}

function isDigitsOnly(value: string): boolean {
  return /^\d+$/.test(value);
}

function isU32(value: number | null): boolean {
  return value !== null && Number.isInteger(value) && value >= 0 && value <= 4_294_967_295;
}

/**
 * Return true when the current draft has the minimum data required for execution.
 */
export function isSimulationDraftComplete(input: ValidateSimulationDraftInput): boolean {
  return validateSimulationDraft(input).isValid;
}

/**
 * Validate simulation input values before execution.
 */
export function validateSimulationDraft(input: ValidateSimulationDraftInput): ValidateSimulationDraftResult {
  const { candidate, ownerCharacterId } = input;
  const fieldErrors: SimulationFieldErrors = {};

  validateDigitFields(candidate, fieldErrors);
  validateCharacterFields(candidate, fieldErrors);
  validateRatioFields(candidate, fieldErrors);

  if (ownerCharacterId === null || ownerCharacterId.trim().length === 0) {
    fieldErrors.characterId ??= "Resolve the turret owner character before running a simulation.";
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}