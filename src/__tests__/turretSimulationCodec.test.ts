import { describe, expect, it } from "vitest";
import { bcs } from "@mysten/sui/bcs";

import { createSimulationCandidateDraft } from "../test/turretSimulationFixtures";
import {
  decodeReturnedMoveBytes,
  decodeSimulationPriorityEntries,
  encodeSimulationCandidates,
  encodeSimulationPriorityEntries,
} from "../utils/turretSimulationCodec";

describe("turretSimulationCodec", () => {
  it("encodes the candidate draft using the stable TargetCandidateArg field order", () => {
    const bytes = encodeSimulationCandidates([createSimulationCandidateDraft({
      itemId: "900001",
      typeId: "900002",
      groupId: "25",
      characterId: 42,
      characterTribe: 7,
      hpRatio: "80",
      shieldRatio: "60",
      armorRatio: "55",
      isAggressor: true,
      priorityWeight: "120",
      behaviourChange: 2,
    })]);
    const decoded = bcs.vector(bcs.struct("TargetCandidate", {
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
    })).parse(bytes) as Array<Record<string, unknown>>;

    expect(decoded).toEqual([{
      item_id: "900001",
      type_id: "900002",
      group_id: "25",
      character_id: 42,
      character_tribe: 7,
      hp_ratio: "80",
      shield_ratio: "60",
      armor_ratio: "55",
      is_aggressor: true,
      priority_weight: "120",
      behaviour_change: 2,
    }]);
  });

  it("decodes returned Move bytes into priority entries", () => {
    const encodedEntries = encodeSimulationPriorityEntries([{
      targetItemId: "900001",
      priorityWeight: "120",
    }]);
    const outerMoveBytes = bcs.vector(bcs.U8).serialize(Array.from(encodedEntries)).toBytes();

    expect(decodeSimulationPriorityEntries(decodeReturnedMoveBytes(outerMoveBytes))).toEqual([{
      targetItemId: "900001",
      priorityWeight: "120",
    }]);
  });
});