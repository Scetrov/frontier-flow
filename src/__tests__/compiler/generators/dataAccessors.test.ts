import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

import type { NodeFieldMap } from "../../../types/nodes";

describe("data accessor generators", () => {
  it.each([
    ["listTribe", "configured values"],
    ["listShip", "configured values"],
    ["listCharacter", "configured values"],
    ["getTribe", "character_tribe"],
    ["hpRatio", "candidate.hp_ratio"],
    ["shieldRatio", "candidate.shield_ratio"],
    ["armorRatio", "candidate.armor_ratio"],
    ["getGroupId", "candidate.group_id"],
    ["getBehaviour", "candidate.behaviour_change"],
    ["isAggressor", "candidate.is_aggressor"],
    ["getPriorityWeight", "candidate.priority_weight"],
  ])("emits a code fragment for %s", (nodeType, expectedFragment) => {
    const generator = getGenerator(nodeType);
    const context = createGenerationContext("starter_contract");
    const fields: NodeFieldMap = nodeType === "listTribe"
      ? { selectedTribeIds: [98000418] }
      : nodeType === "listShip"
        ? { selectedShipIds: [81609] }
        : nodeType === "listCharacter"
          ? { characterAddresses: ["0x1234"] }
          : {};
    const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType, fields), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("let ");
    expect(output).toContain(expectedFragment);
    expect(context.bindings.size).toBeGreaterThan(0);
  });
});