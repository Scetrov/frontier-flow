import { describe, expect, it } from "vitest";

import { nodeDefinitions } from "../../data/node-definitions";
import {
  compileableSmartTurretExtensions,
  smartTurretExtensionFixtures,
} from "../../__fixtures__/graphs/smartTurretExtensionFixtures";

const expectedExtensionIds = [
  "turret_aggressor_first",
  "turret_group_specialist",
  "turret_last_stand",
  "turret_low_hp_finisher",
  "turret_player_screen",
  "turret_round_robin",
  "turret_size_priority",
  "turret_threat_ledger",
  "turret_type_blocklist",
] as const;

describe("smart turret extension alignment", () => {
  it("tracks the full external extension inventory", () => {
    expect(smartTurretExtensionFixtures.map((extension) => extension.extensionId)).toEqual(expectedExtensionIds);
  });

  it("maps every extension to known node definitions", () => {
    const availableNodeTypes = new Set(nodeDefinitions.map((definition) => definition.type));

    for (const extension of smartTurretExtensionFixtures) {
      expect(extension.requiredNodeTypes.length).toBeGreaterThan(0);
      for (const nodeType of extension.requiredNodeTypes) {
        expect(availableNodeTypes.has(nodeType), `${extension.extensionId} is missing node type ${nodeType}`).toBe(true);
      }
    }
  });

  it("documents which extension shapes are fully compilable today", () => {
    expect(compileableSmartTurretExtensions.map((extension) => extension.extensionId)).toEqual([
      "turret_aggressor_first",
      "turret_low_hp_finisher",
      "turret_player_screen",
      "turret_size_priority",
    ]);

    for (const extension of smartTurretExtensionFixtures) {
      if (!extension.compileSupported) {
        expect(extension.blockedBy.length).toBeGreaterThan(0);
      }
    }
  });
});