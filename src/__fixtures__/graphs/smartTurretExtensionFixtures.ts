export interface GraphFixtureNode {
  readonly id: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly y: number };
}

export interface GraphFixtureEdge {
  readonly id: string;
  readonly source: string;
  readonly sourceHandle: string;
  readonly target: string;
  readonly targetHandle: string;
}

export interface GraphFixture {
  readonly moduleName: string;
  readonly nodes: readonly GraphFixtureNode[];
  readonly edges: readonly GraphFixtureEdge[];
}

interface SmartTurretExtensionBase {
  readonly extensionId: string;
  readonly behaviorName: string;
  readonly requiredNodeTypes: readonly string[];
}

export interface CompilableSmartTurretExtension extends SmartTurretExtensionBase {
  readonly compileSupported: true;
  readonly contractName: string;
  readonly expectedModuleName: string;
  readonly fixture: GraphFixture;
}

export interface PendingSmartTurretExtension extends SmartTurretExtensionBase {
  readonly compileSupported: false;
  readonly blockedBy: string;
}

export type SmartTurretExtensionFixture = CompilableSmartTurretExtension | PendingSmartTurretExtension;

export const smartTurretExtensionFixtures = [
  {
    extensionId: "turret_aggressor_first",
    behaviorName: "Aggressor First",
    compileSupported: true,
    contractName: "Turret Aggressor First",
    expectedModuleName: "turret_aggressor_first",
    requiredNodeTypes: [
      "aggression",
      "getPriorityWeight",
      "isAggressor",
      "aggressorBonus",
      "hpRatio",
      "shieldRatio",
      "armorRatio",
      "damageBonus",
      "addToQueue",
    ],
    fixture: {
      moduleName: "turret_aggressor_first",
      nodes: [
        { id: "aggressor_first_aggression", type: "aggression", position: { x: 0, y: 120 } },
        { id: "aggressor_first_get_priority_weight", type: "getPriorityWeight", position: { x: 220, y: -40 } },
        { id: "aggressor_first_is_aggressor", type: "isAggressor", position: { x: 220, y: 80 } },
        { id: "aggressor_first_hp_ratio", type: "hpRatio", position: { x: 220, y: 200 } },
        { id: "aggressor_first_shield_ratio", type: "shieldRatio", position: { x: 220, y: 320 } },
        { id: "aggressor_first_armor_ratio", type: "armorRatio", position: { x: 220, y: 440 } },
        { id: "aggressor_first_aggressor_bonus", type: "aggressorBonus", position: { x: 460, y: 40 } },
        { id: "aggressor_first_damage_bonus", type: "damageBonus", position: { x: 700, y: 220 } },
        { id: "aggressor_first_add_to_queue", type: "addToQueue", position: { x: 960, y: 180 } },
      ],
      edges: [
        { id: "af_target_weight", source: "aggressor_first_aggression", sourceHandle: "target", target: "aggressor_first_get_priority_weight", targetHandle: "target" },
        { id: "af_target_flag", source: "aggressor_first_aggression", sourceHandle: "target", target: "aggressor_first_is_aggressor", targetHandle: "target" },
        { id: "af_target_hp", source: "aggressor_first_aggression", sourceHandle: "target", target: "aggressor_first_hp_ratio", targetHandle: "target" },
        { id: "af_target_shield", source: "aggressor_first_aggression", sourceHandle: "target", target: "aggressor_first_shield_ratio", targetHandle: "target" },
        { id: "af_target_armor", source: "aggressor_first_aggression", sourceHandle: "target", target: "aggressor_first_armor_ratio", targetHandle: "target" },
        { id: "af_weight_in", source: "aggressor_first_get_priority_weight", sourceHandle: "weight", target: "aggressor_first_aggressor_bonus", targetHandle: "weight_in" },
        { id: "af_is_aggressor", source: "aggressor_first_is_aggressor", sourceHandle: "is_aggressor", target: "aggressor_first_aggressor_bonus", targetHandle: "is_aggressor" },
        { id: "af_bonus_to_damage", source: "aggressor_first_aggressor_bonus", sourceHandle: "weight_out", target: "aggressor_first_damage_bonus", targetHandle: "weight_in" },
        { id: "af_hp", source: "aggressor_first_hp_ratio", sourceHandle: "hp_ratio", target: "aggressor_first_damage_bonus", targetHandle: "hp_ratio" },
        { id: "af_shield", source: "aggressor_first_shield_ratio", sourceHandle: "shield_ratio", target: "aggressor_first_damage_bonus", targetHandle: "shield_ratio" },
        { id: "af_armor", source: "aggressor_first_armor_ratio", sourceHandle: "armor_ratio", target: "aggressor_first_damage_bonus", targetHandle: "armor_ratio" },
        { id: "af_priority", source: "aggressor_first_aggression", sourceHandle: "priority", target: "aggressor_first_add_to_queue", targetHandle: "priority_in" },
        { id: "af_target_action", source: "aggressor_first_aggression", sourceHandle: "target", target: "aggressor_first_add_to_queue", targetHandle: "target" },
        { id: "af_weight", source: "aggressor_first_damage_bonus", sourceHandle: "weight_out", target: "aggressor_first_add_to_queue", targetHandle: "weight" },
      ],
    },
  },
  {
    extensionId: "turret_group_specialist",
    behaviorName: "Group Specialist",
    compileSupported: false,
    requiredNodeTypes: ["aggression", "getGroupId", "groupBonusConfig", "groupBonusLookup", "addToQueue"],
    blockedBy: "Config-backed group bonus flows still fail validation because config source nodes sit outside the event-trigger entry path.",
  },
  {
    extensionId: "turret_last_stand",
    behaviorName: "Last Stand",
    compileSupported: false,
    requiredNodeTypes: ["aggression", "countAggressors", "damageBonus", "addToQueue"],
    blockedBy: "Raid-mode selection needs a candidate-list source and branching stage that the current graph model does not provide.",
  },
  {
    extensionId: "turret_low_hp_finisher",
    behaviorName: "Low HP Finisher",
    compileSupported: true,
    contractName: "Turret Low HP Finisher",
    expectedModuleName: "turret_low_hp_finisher",
    requiredNodeTypes: ["aggression", "getPriorityWeight", "hpRatio", "shieldRatio", "armorRatio", "damageBonus", "addToQueue"],
    fixture: {
      moduleName: "turret_low_hp_finisher",
      nodes: [
        { id: "low_hp_aggression", type: "aggression", position: { x: 0, y: 180 } },
        { id: "low_hp_get_priority_weight", type: "getPriorityWeight", position: { x: 220, y: 0 } },
        { id: "low_hp_hp_ratio", type: "hpRatio", position: { x: 220, y: 140 } },
        { id: "low_hp_shield_ratio", type: "shieldRatio", position: { x: 220, y: 260 } },
        { id: "low_hp_armor_ratio", type: "armorRatio", position: { x: 220, y: 380 } },
        { id: "low_hp_damage_bonus", type: "damageBonus", position: { x: 480, y: 200 } },
        { id: "low_hp_add_to_queue", type: "addToQueue", position: { x: 740, y: 200 } },
      ],
      edges: [
        { id: "lh_weight", source: "low_hp_aggression", sourceHandle: "target", target: "low_hp_get_priority_weight", targetHandle: "target" },
        { id: "lh_target_hp", source: "low_hp_aggression", sourceHandle: "target", target: "low_hp_hp_ratio", targetHandle: "target" },
        { id: "lh_target_shield", source: "low_hp_aggression", sourceHandle: "target", target: "low_hp_shield_ratio", targetHandle: "target" },
        { id: "lh_target_armor", source: "low_hp_aggression", sourceHandle: "target", target: "low_hp_armor_ratio", targetHandle: "target" },
        { id: "lh_weight_in", source: "low_hp_get_priority_weight", sourceHandle: "weight", target: "low_hp_damage_bonus", targetHandle: "weight_in" },
        { id: "lh_hp", source: "low_hp_hp_ratio", sourceHandle: "hp_ratio", target: "low_hp_damage_bonus", targetHandle: "hp_ratio" },
        { id: "lh_shield", source: "low_hp_shield_ratio", sourceHandle: "shield_ratio", target: "low_hp_damage_bonus", targetHandle: "shield_ratio" },
        { id: "lh_armor", source: "low_hp_armor_ratio", sourceHandle: "armor_ratio", target: "low_hp_damage_bonus", targetHandle: "armor_ratio" },
        { id: "lh_priority", source: "low_hp_aggression", sourceHandle: "priority", target: "low_hp_add_to_queue", targetHandle: "priority_in" },
        { id: "lh_target_action", source: "low_hp_aggression", sourceHandle: "target", target: "low_hp_add_to_queue", targetHandle: "target" },
        { id: "lh_damage", source: "low_hp_damage_bonus", sourceHandle: "weight_out", target: "low_hp_add_to_queue", targetHandle: "weight" },
      ],
    },
  },
  {
    extensionId: "turret_player_screen",
    behaviorName: "Player Screen",
    compileSupported: true,
    contractName: "Turret Player Screen",
    expectedModuleName: "turret_player_screen",
    requiredNodeTypes: ["aggression", "getBehaviour", "getPriorityWeight", "behaviourBonus", "excludeNpc", "excludeSameTribe", "addToQueue"],
    fixture: {
      moduleName: "turret_player_screen",
      nodes: [
        { id: "player_screen_aggression", type: "aggression", position: { x: 0, y: 160 } },
        { id: "player_screen_get_behaviour", type: "getBehaviour", position: { x: 220, y: 20 } },
        { id: "player_screen_get_priority_weight", type: "getPriorityWeight", position: { x: 220, y: 180 } },
        { id: "player_screen_behaviour_bonus", type: "behaviourBonus", position: { x: 500, y: 80 } },
        { id: "player_screen_exclude_npc", type: "excludeNpc", position: { x: 500, y: 260 } },
        { id: "player_screen_add_to_queue", type: "addToQueue", position: { x: 780, y: 180 } },
      ],
      edges: [
        { id: "ps_target_behaviour", source: "player_screen_aggression", sourceHandle: "target", target: "player_screen_get_behaviour", targetHandle: "target" },
        { id: "ps_target_weight", source: "player_screen_aggression", sourceHandle: "target", target: "player_screen_get_priority_weight", targetHandle: "target" },
        { id: "ps_behaviour", source: "player_screen_get_behaviour", sourceHandle: "behaviour", target: "player_screen_behaviour_bonus", targetHandle: "behaviour" },
        { id: "ps_weight_in", source: "player_screen_get_priority_weight", sourceHandle: "weight", target: "player_screen_behaviour_bonus", targetHandle: "weight_in" },
        { id: "ps_target_exclude_npc", source: "player_screen_aggression", sourceHandle: "target", target: "player_screen_exclude_npc", targetHandle: "target" },
        { id: "ps_priority", source: "player_screen_aggression", sourceHandle: "priority", target: "player_screen_add_to_queue", targetHandle: "priority_in" },
        { id: "ps_target_action", source: "player_screen_aggression", sourceHandle: "target", target: "player_screen_add_to_queue", targetHandle: "target" },
        { id: "ps_weight", source: "player_screen_behaviour_bonus", sourceHandle: "weight_out", target: "player_screen_add_to_queue", targetHandle: "weight" },
        { id: "ps_predicate", source: "player_screen_exclude_npc", sourceHandle: "include", target: "player_screen_add_to_queue", targetHandle: "predicate" },
      ],
    },
  },
  {
    extensionId: "turret_round_robin",
    behaviorName: "Round Robin",
    compileSupported: false,
    requiredNodeTypes: ["aggression", "roundRobinConfig", "historyPenalty", "addToQueue"],
    blockedBy: "Round-robin history depends on a shared config source that the current validator treats as disconnected from the trigger path.",
  },
  {
    extensionId: "turret_size_priority",
    behaviorName: "Size Priority",
    compileSupported: true,
    contractName: "Turret Size Priority",
    expectedModuleName: "turret_size_priority",
    requiredNodeTypes: ["aggression", "getGroupId", "getPriorityWeight", "sizeTierBonus", "addToQueue"],
    fixture: {
      moduleName: "turret_size_priority",
      nodes: [
        { id: "size_priority_aggression", type: "aggression", position: { x: 0, y: 160 } },
        { id: "size_priority_get_group_id", type: "getGroupId", position: { x: 220, y: 40 } },
        { id: "size_priority_get_priority_weight", type: "getPriorityWeight", position: { x: 220, y: 220 } },
        { id: "size_priority_size_tier_bonus", type: "sizeTierBonus", position: { x: 500, y: 140 } },
        { id: "size_priority_add_to_queue", type: "addToQueue", position: { x: 760, y: 160 } },
      ],
      edges: [
        { id: "sp_target_group", source: "size_priority_aggression", sourceHandle: "target", target: "size_priority_get_group_id", targetHandle: "target" },
        { id: "sp_target_weight", source: "size_priority_aggression", sourceHandle: "target", target: "size_priority_get_priority_weight", targetHandle: "target" },
        { id: "sp_group", source: "size_priority_get_group_id", sourceHandle: "group_id", target: "size_priority_size_tier_bonus", targetHandle: "group_id" },
        { id: "sp_weight", source: "size_priority_get_priority_weight", sourceHandle: "weight", target: "size_priority_size_tier_bonus", targetHandle: "weight_in" },
        { id: "sp_priority", source: "size_priority_aggression", sourceHandle: "priority", target: "size_priority_add_to_queue", targetHandle: "priority_in" },
        { id: "sp_target_action", source: "size_priority_aggression", sourceHandle: "target", target: "size_priority_add_to_queue", targetHandle: "target" },
        { id: "sp_weight_action", source: "size_priority_size_tier_bonus", sourceHandle: "weight_out", target: "size_priority_add_to_queue", targetHandle: "weight" },
      ],
    },
  },
  {
    extensionId: "turret_threat_ledger",
    behaviorName: "Threat Ledger",
    compileSupported: false,
    requiredNodeTypes: ["aggression", "getTribe", "threatLedgerConfig", "threatBonus", "addToQueue"],
    blockedBy: "Threat-ledger flows need a shared config source, which is still disconnected from the generated event-trigger path under current validation rules.",
  },
  {
    extensionId: "turret_type_blocklist",
    behaviorName: "Type Blocklist",
    compileSupported: false,
    requiredNodeTypes: ["aggression", "typeBlocklistConfig", "getItemListFromConfig", "isInList", "addToQueue"],
    blockedBy: "Type-blocklist coverage still lacks a target type_id accessor and a boolean combiner to merge the list check with the standard exclusion gates.",
  },
] as const satisfies readonly SmartTurretExtensionFixture[];

export function isCompilableSmartTurretExtension(
  extension: SmartTurretExtensionFixture,
): extension is CompilableSmartTurretExtension {
  return extension.compileSupported;
}

const compileableExtensions: CompilableSmartTurretExtension[] = [];

for (const extension of smartTurretExtensionFixtures) {
  if (isCompilableSmartTurretExtension(extension)) {
    compileableExtensions.push(extension);
  }
}

export const compileableSmartTurretExtensions: readonly CompilableSmartTurretExtension[] = compileableExtensions;