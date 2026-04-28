import { describe, expect, it } from "vitest";

import { createGenerationContext, getGenerator } from "../../../compiler/generators";
import { createIrNode } from "../helpers";

describe("scoring modifier generators", () => {
  it.each([
    ["behaviourBonus", "BEHAVIOUR_STARTED_ATTACK"],
    ["aggressorBonus", "if ("],
    ["damageBonus", "100 -"],
    ["sizeTierBonus", "tier_for_group("],
  ])("emits a scoring fragment for %s", (nodeType, expectedFragment) => {
    const generator = getGenerator(nodeType);
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode(`${nodeType}_node`, nodeType), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("let ");
    expect(output).toContain(expectedFragment);
    expect(context.bindings.size).toBe(1);
  });

  it("emits remaining-total low-hp scoring when damageBonus is configured for finisher mode", () => {
    const generator = getGenerator("damageBonus");
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode("damage_bonus_node", "damageBonus", { damageStrategy: "remaining-total" }), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("remaining_total");
    expect(output).toContain("damage_total");
    expect(output).toContain("* 100");
    expect(context.bindings.size).toBe(1);
  });

  it("emits player-target weighting when behaviourBonus is configured for player screen mode", () => {
    const generator = getGenerator("behaviourBonus");
    const context = createGenerationContext("starter_contract");
    const lines = generator?.emit(createIrNode("behaviour_bonus_node", "behaviourBonus", { bonusStrategy: "player-target" }), context) ?? [];
    const output = lines.map((line) => line.code).join("\n");

    expect(output).toContain("PLAYER_TARGET_BONUS");
    expect(output).toContain("BEHAVIOUR_STARTED_ATTACK");
    expect(context.bindings.size).toBe(1);
  });
});