import { describe, expect, it } from "vitest";

import { createSimulationCandidateDraft } from "../test/turretSimulationFixtures";
import { validateSimulationDraft } from "../utils/turretSimulationValidation";

describe("turretSimulationValidation", () => {
  it("prefers the owner-character resolution message when character id is missing", () => {
    const result = validateSimulationDraft({
      candidate: createSimulationCandidateDraft({
        characterId: null,
        characterTribe: null,
        groupId: "25",
        typeId: "81609",
      }),
      ownerCharacterId: null,
    });

    expect(result.fieldErrors.characterId).toBe("Resolve the turret owner character before running a simulation.");
    expect(result.fieldErrors.characterTribe).toBeUndefined();
  });

  it("still reports u32-range errors when character values are present but invalid", () => {
    const result = validateSimulationDraft({
      candidate: createSimulationCandidateDraft({
        characterId: -1,
        characterTribe: 5_000_000_000,
        groupId: "25",
        typeId: "81609",
      }),
      ownerCharacterId: "0xownercharacter",
    });

    expect(result.fieldErrors.characterId).toBe("Character id must be a non-negative integer within u32 range.");
    expect(result.fieldErrors.characterTribe).toBe("Character tribe must be a non-negative integer within u32 range.");
  });
});