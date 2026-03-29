import { bcs } from "@mysten/sui/bcs";

import type { SimulationCandidateDraft, SimulationPriorityEntry } from "../types/turretSimulation";

interface EncodedTargetCandidateArg {
  readonly item_id: string;
  readonly type_id: string;
  readonly group_id: string;
  readonly character_id: number;
  readonly character_tribe: number;
  readonly hp_ratio: string;
  readonly shield_ratio: string;
  readonly armor_ratio: string;
  readonly is_aggressor: boolean;
  readonly priority_weight: string;
  readonly behaviour_change: number;
}

const TARGET_CANDIDATE_BCS = bcs.struct("TargetCandidate", {
  item_id: bcs.U64,
  type_id: bcs.U64,
  group_id: bcs.U64,
  character_id: bcs.U32,
  character_tribe: bcs.U32,
  hp_ratio: bcs.U64,
  shield_ratio: bcs.U64,
  armor_ratio: bcs.U64,
  is_aggressor: bcs.Bool,
  priority_weight: bcs.U64,
  behaviour_change: bcs.U8,
});

const RETURN_TARGET_PRIORITY_LIST_BCS = bcs.struct("ReturnTargetPriorityList", {
  target_item_id: bcs.U64,
  priority_weight: bcs.U64,
});

function toEncodedCandidate(candidate: SimulationCandidateDraft): EncodedTargetCandidateArg {
  return {
    item_id: candidate.itemId,
    type_id: candidate.typeId,
    group_id: candidate.groupId,
    character_id: candidate.characterId ?? 0,
    character_tribe: candidate.characterTribe ?? 0,
    hp_ratio: candidate.hpRatio,
    shield_ratio: candidate.shieldRatio,
    armor_ratio: candidate.armorRatio,
    is_aggressor: candidate.isAggressor,
    priority_weight: candidate.priorityWeight,
    behaviour_change: candidate.behaviourChange,
  };
}

/**
 * Encode one or more simulation candidates into the stable Move BCS layout.
 */
export function encodeSimulationCandidates(candidates: readonly SimulationCandidateDraft[]): Uint8Array {
  return bcs.vector(TARGET_CANDIDATE_BCS).serialize(candidates.map(toEncodedCandidate)).toBytes();
}

/**
 * Decode the returned priority list bytes produced by the extension runtime.
 */
export function decodeSimulationPriorityEntries(bytes: Uint8Array): readonly SimulationPriorityEntry[] {
  return bcs.vector(RETURN_TARGET_PRIORITY_LIST_BCS).parse(bytes)
    .map((entry) => ({
      targetItemId: entry.target_item_id,
      priorityWeight: entry.priority_weight,
    }));
}

/**
 * Decode the outer Move `vector<u8>` wrapper returned by dev-inspect.
 */
export function decodeReturnedMoveBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bcs.vector(bcs.U8).parse(bytes));
}

/**
 * Encode simulation results into the same BCS shape returned by the extension runtime.
 */
export function encodeSimulationPriorityEntries(entries: readonly SimulationPriorityEntry[]): Uint8Array {
  return bcs.vector(RETURN_TARGET_PRIORITY_LIST_BCS).serialize(entries.map((entry) => ({
    target_item_id: entry.targetItemId,
    priority_weight: entry.priorityWeight,
  }))).toBytes();
}