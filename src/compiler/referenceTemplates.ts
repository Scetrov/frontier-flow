import type { IRGraph, SourceMapEntry } from "./types";

interface ReferenceTemplateOutput {
  readonly code: string;
  readonly sourceMap: readonly SourceMapEntry[];
}

type TemplateKind = "turret_aggressor_first" | "turret_low_hp_finisher" | "turret_player_screen" | "turret_size_priority";

interface TemplateBuilder {
  readonly graph: IRGraph;
  readonly lines: string[];
  readonly sourceMap: SourceMapEntry[];
  readonly nodeIdsByType: ReadonlyMap<string, string>;
}

function resolveTemplateKind(graph: IRGraph): TemplateKind | null {
  switch (graph.requestedModuleName) {
    case "turret_aggressor_first":
    case "turret_low_hp_finisher":
    case "turret_player_screen":
    case "turret_size_priority":
      return graph.requestedModuleName;
    default:
      return null;
  }
}

function createNodeIdsByType(graph: IRGraph): ReadonlyMap<string, string> {
  const nodeIdsByType = new Map<string, string>();

  for (const node of graph.nodes.values()) {
    if (!nodeIdsByType.has(node.type)) {
      nodeIdsByType.set(node.type, node.id);
    }
  }

  return nodeIdsByType;
}

function pushLine(builder: TemplateBuilder, code: string, nodeType?: string): void {
  builder.lines.push(code);

  if (nodeType === undefined) {
    return;
  }

  const reactFlowNodeId = builder.nodeIdsByType.get(nodeType);
  if (reactFlowNodeId === undefined) {
    return;
  }

  builder.sourceMap.push({
    line: builder.lines.length,
    astNodeId: reactFlowNodeId,
    reactFlowNodeId,
  });
}

function pushBlankLine(builder: TemplateBuilder): void {
  builder.lines.push("");
}

function emitCommonPreamble(builder: TemplateBuilder): void {
  pushLine(builder, `module builder_extensions::${builder.graph.moduleName} {`);
  pushLine(builder, "    use std::vector;");
  pushBlankLine(builder);
  pushLine(builder, "    const BEHAVIOUR_STOPPED_ATTACK: u64 = 0;");
  pushLine(builder, "    const BEHAVIOUR_ENTERED: u64 = 1;");
  pushLine(builder, "    const BEHAVIOUR_STARTED_ATTACK: u64 = 2;");
  pushBlankLine(builder);
  pushLine(builder, "    public struct TargetCandidateArg has copy, drop, store {");
  pushLine(builder, "        item_id: u64,");
  pushLine(builder, "        character_id: u64,");
  pushLine(builder, "        character_tribe: u64,");
  pushLine(builder, "        behaviour_change: u64,");
  pushLine(builder, "        is_aggressor: bool,");
  pushLine(builder, "        priority_weight: u64,");
  pushLine(builder, "        shield_ratio: u64,");
  pushLine(builder, "        armor_ratio: u64,");
  pushLine(builder, "        hp_ratio: u64,");
  pushLine(builder, "        group_id: u64,");
  pushLine(builder, "    }");
  pushBlankLine(builder);
  pushLine(builder, "    public struct ReturnTargetPriorityList has copy, drop, store {");
  pushLine(builder, "        item_id: u64,");
  pushLine(builder, "        weight: u64,");
  pushLine(builder, "    }");
  pushBlankLine(builder);
  pushLine(builder, "    fun new_return_target_priority_list(item_id: u64, weight: u64): ReturnTargetPriorityList {");
  pushLine(builder, "        ReturnTargetPriorityList { item_id, weight }");
  pushLine(builder, "    }");
  pushBlankLine(builder);
}

function emitCommonBuildLoop(builder: TemplateBuilder): void {
  pushLine(builder, "    public fun execute(");
  pushLine(builder, "        owner_character_id: u64,");
  pushLine(builder, "        owner_tribe: u64,");
  pushLine(builder, "        candidates: vector<TargetCandidateArg>,");
  pushLine(builder, "    ): vector<ReturnTargetPriorityList> {");
  pushLine(builder, "        build_priority_list_for_owner(owner_character_id, owner_tribe, candidates)");
  pushLine(builder, "    }");
  pushBlankLine(builder);
  pushLine(builder, "    public fun build_priority_list_for_owner(");
  pushLine(builder, "        owner_character_id: u64,");
  pushLine(builder, "        owner_tribe: u64,");
  pushLine(builder, "        candidates: vector<TargetCandidateArg>,");
  pushLine(builder, "    ): vector<ReturnTargetPriorityList> {");
  pushLine(builder, "        let mut return_list = vector::empty<ReturnTargetPriorityList>();", "addToQueue");
  pushLine(builder, "        let candidate_count = vector::length(&candidates);");
  pushLine(builder, "        let mut index = 0;", "aggression");
  pushLine(builder, "", undefined);
  pushLine(builder, "        while (index < candidate_count) {", "aggression");
  pushLine(builder, "            let candidate = vector::borrow(&candidates, index);", "aggression");
  pushLine(builder, "            let (weight, include) = score_candidate(owner_character_id, owner_tribe, candidate);", "addToQueue");
  pushLine(builder, "            if (include) {", "addToQueue");
  pushLine(builder, "                vector::push_back(&mut return_list, new_return_target_priority_list(candidate.item_id, weight));", "addToQueue");
  pushLine(builder, "            };", "addToQueue");
  pushLine(builder, "            index = index + 1;", "aggression");
  pushLine(builder, "        };", "aggression");
  pushLine(builder, "", undefined);
  pushLine(builder, "        return_list", "addToQueue");
  pushLine(builder, "    }");
  pushBlankLine(builder);
}

function emitAggressorFirstTemplate(builder: TemplateBuilder): void {
  emitCommonPreamble(builder);
  pushLine(builder, "    const STARTED_ATTACK_BONUS: u64 = 20_000;", "aggression");
  pushLine(builder, "    const AGGRESSOR_BONUS: u64 = 5_000;", "aggressorBonus");
  pushLine(builder, "    const ENTERED_BONUS: u64 = 2_000;", "aggression");
  pushLine(builder, "    const SHIELD_BREAK_BONUS_MULTIPLIER: u64 = 20;", "shieldRatio");
  pushLine(builder, "    const ARMOR_BREAK_BONUS_MULTIPLIER: u64 = 10;", "armorRatio");
  pushLine(builder, "    const HULL_BREAK_BONUS_MULTIPLIER: u64 = 5;", "hpRatio");
  pushBlankLine(builder);
  emitCommonBuildLoop(builder);
  pushLine(builder, "    fun score_candidate(");
  pushLine(builder, "        owner_character_id: u64,");
  pushLine(builder, "        owner_tribe: u64,");
  pushLine(builder, "        candidate: &TargetCandidateArg,");
  pushLine(builder, "    ): (u64, bool) {");
  pushLine(builder, "        if (candidate.character_id == owner_character_id || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {", "aggression");
  pushLine(builder, "            return (0, false)", "aggression");
  pushLine(builder, "        };", "aggression");
  pushBlankLine(builder);
  pushLine(builder, "        if (!(candidate.is_aggressor || candidate.character_tribe != owner_tribe)) {", "isAggressor");
  pushLine(builder, "            return (0, false)", "isAggressor");
  pushLine(builder, "        };", "isAggressor");
  pushBlankLine(builder);
  pushLine(builder, "        let mut weight = candidate.priority_weight;", "getPriorityWeight");
  pushLine(builder, "", undefined);
  pushLine(builder, "        if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {", "aggression");
  pushLine(builder, "            weight = weight + STARTED_ATTACK_BONUS;", "aggression");
  pushLine(builder, "        } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {", "aggression");
  pushLine(builder, "            weight = weight + ENTERED_BONUS;", "aggression");
  pushLine(builder, "        };", "aggression");
  pushLine(builder, "        if (candidate.is_aggressor) {", "aggressorBonus");
  pushLine(builder, "            weight = weight + AGGRESSOR_BONUS;", "aggressorBonus");
  pushLine(builder, "        };", "aggressorBonus");
  pushBlankLine(builder);
  pushLine(builder, "        weight = weight + ((100 - candidate.shield_ratio) * SHIELD_BREAK_BONUS_MULTIPLIER);", "shieldRatio");
  pushLine(builder, "        weight = weight + ((100 - candidate.armor_ratio) * ARMOR_BREAK_BONUS_MULTIPLIER);", "armorRatio");
  pushLine(builder, "        weight = weight + ((100 - candidate.hp_ratio) * HULL_BREAK_BONUS_MULTIPLIER);", "hpRatio");
  pushLine(builder, "        (weight, true)", "damageBonus");
  pushLine(builder, "    }");
  pushLine(builder, "}");
}

function emitLowHpFinisherTemplate(builder: TemplateBuilder): void {
  emitCommonPreamble(builder);
  pushLine(builder, "    const STARTED_ATTACK_BONUS: u64 = 8_000;", "aggression");
  pushLine(builder, "    const AGGRESSOR_BONUS: u64 = 4_000;", "aggression");
  pushLine(builder, "    const ENTERED_BONUS: u64 = 1_500;", "aggression");
  pushLine(builder, "    const EHP_DAMAGE_MULTIPLIER: u64 = 100;", "damageBonus");
  pushBlankLine(builder);
  emitCommonBuildLoop(builder);
  pushLine(builder, "    fun score_candidate(");
  pushLine(builder, "        owner_character_id: u64,");
  pushLine(builder, "        owner_tribe: u64,");
  pushLine(builder, "        candidate: &TargetCandidateArg,");
  pushLine(builder, "    ): (u64, bool) {");
  pushLine(builder, "        if (candidate.character_id == owner_character_id || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {", "aggression");
  pushLine(builder, "            return (0, false)", "aggression");
  pushLine(builder, "        };", "aggression");
  pushLine(builder, "        if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {", "aggression");
  pushLine(builder, "            return (0, false)", "aggression");
  pushLine(builder, "        };", "aggression");
  pushBlankLine(builder);
  pushLine(builder, "        let mut weight = candidate.priority_weight;", "getPriorityWeight");
  pushLine(builder, "        let remaining_total = candidate.hp_ratio + candidate.shield_ratio + candidate.armor_ratio;", "damageBonus");
  pushLine(builder, "        let damage_total = if (remaining_total <= 300) { 300 - remaining_total } else { 0 };", "damageBonus");
  pushBlankLine(builder);
  pushLine(builder, "        if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {", "aggression");
  pushLine(builder, "            weight = weight + STARTED_ATTACK_BONUS;", "aggression");
  pushLine(builder, "        } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {", "aggression");
  pushLine(builder, "            weight = weight + ENTERED_BONUS;", "aggression");
  pushLine(builder, "        };", "aggression");
  pushLine(builder, "        if (candidate.is_aggressor) {", "aggression");
  pushLine(builder, "            weight = weight + AGGRESSOR_BONUS;", "aggression");
  pushLine(builder, "        };", "aggression");
  pushBlankLine(builder);
  pushLine(builder, "        weight = weight + (damage_total * EHP_DAMAGE_MULTIPLIER);", "damageBonus");
  pushLine(builder, "        (weight, true)", "addToQueue");
  pushLine(builder, "    }");
  pushLine(builder, "}");
}

function emitPlayerScreenTemplate(builder: TemplateBuilder): void {
  emitCommonPreamble(builder);
  pushLine(builder, "    const PLAYER_TARGET_BONUS: u64 = 1_000;", "excludeNpc");
  pushLine(builder, "    const STARTED_ATTACK_BONUS: u64 = 15_000;", "behaviourBonus");
  pushLine(builder, "    const AGGRESSOR_BONUS: u64 = 6_000;", "behaviourBonus");
  pushLine(builder, "    const ENTERED_BONUS: u64 = 3_000;", "behaviourBonus");
  pushBlankLine(builder);
  emitCommonBuildLoop(builder);
  pushLine(builder, "    fun score_candidate(");
  pushLine(builder, "        owner_character_id: u64,");
  pushLine(builder, "        owner_tribe: u64,");
  pushLine(builder, "        candidate: &TargetCandidateArg,");
  pushLine(builder, "    ): (u64, bool) {");
  pushLine(builder, "        let character_id = candidate.character_id;", "excludeNpc");
  pushLine(builder, "        let is_owner = character_id == owner_character_id;", "excludeNpc");
  pushLine(builder, "        let is_npc = character_id == 0;", "excludeNpc");
  pushBlankLine(builder);
  pushLine(builder, "        if (is_npc || is_owner || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {", "excludeNpc");
  pushLine(builder, "            return (0, false)", "excludeNpc");
  pushLine(builder, "        };", "excludeNpc");
  pushLine(builder, "        if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {", "aggression");
  pushLine(builder, "            return (0, false)", "aggression");
  pushLine(builder, "        };", "aggression");
  pushBlankLine(builder);
  pushLine(builder, "        let mut weight = candidate.priority_weight + PLAYER_TARGET_BONUS;", "getPriorityWeight");
  pushLine(builder, "        if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {", "behaviourBonus");
  pushLine(builder, "            weight = weight + STARTED_ATTACK_BONUS;", "behaviourBonus");
  pushLine(builder, "        } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {", "behaviourBonus");
  pushLine(builder, "            weight = weight + ENTERED_BONUS;", "behaviourBonus");
  pushLine(builder, "        };", "behaviourBonus");
  pushLine(builder, "        if (candidate.is_aggressor) {", "behaviourBonus");
  pushLine(builder, "            weight = weight + AGGRESSOR_BONUS;", "behaviourBonus");
  pushLine(builder, "        };", "behaviourBonus");
  pushLine(builder, "        (weight, true)", "addToQueue");
  pushLine(builder, "    }");
  pushLine(builder, "}");
}

function emitSizePriorityTemplate(builder: TemplateBuilder): void {
  emitCommonPreamble(builder);
  pushLine(builder, "    const GROUP_CORVETTE: u64 = 31;", "getGroupId");
  pushLine(builder, "    const GROUP_FRIGATE: u64 = 237;", "getGroupId");
  pushLine(builder, "    const GROUP_DESTROYER: u64 = 25;", "getGroupId");
  pushLine(builder, "    const GROUP_CRUISER: u64 = 420;", "getGroupId");
  pushLine(builder, "    const GROUP_BATTLECRUISER: u64 = 26;", "getGroupId");
  pushLine(builder, "    const GROUP_BATTLESHIP: u64 = 419;", "getGroupId");
  pushLine(builder, "    const TIER_WEIGHT: u64 = 3_000;", "sizeTierBonus");
  pushLine(builder, "    const STARTED_ATTACK_BONUS: u64 = 10_000;", "aggression");
  pushLine(builder, "    const AGGRESSOR_BONUS: u64 = 4_000;", "aggression");
  pushLine(builder, "    const ENTERED_BONUS: u64 = 1_000;", "aggression");
  pushBlankLine(builder);
  emitCommonBuildLoop(builder);
  pushLine(builder, "    fun score_candidate(");
  pushLine(builder, "        owner_character_id: u64,");
  pushLine(builder, "        owner_tribe: u64,");
  pushLine(builder, "        candidate: &TargetCandidateArg,");
  pushLine(builder, "    ): (u64, bool) {");
  pushLine(builder, "        if (candidate.character_id == owner_character_id || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {", "aggression");
  pushLine(builder, "            return (0, false)", "aggression");
  pushLine(builder, "        };", "aggression");
  pushLine(builder, "        if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {", "aggression");
  pushLine(builder, "            return (0, false)", "aggression");
  pushLine(builder, "        };", "aggression");
  pushBlankLine(builder);
  pushLine(builder, "        let mut weight = candidate.priority_weight;", "getPriorityWeight");
  pushLine(builder, "        let tier = tier_for_group(candidate.group_id);", "sizeTierBonus");
  pushBlankLine(builder);
  pushLine(builder, "        if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {", "aggression");
  pushLine(builder, "            weight = weight + STARTED_ATTACK_BONUS;", "aggression");
  pushLine(builder, "        } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {", "aggression");
  pushLine(builder, "            weight = weight + ENTERED_BONUS;", "aggression");
  pushLine(builder, "        };", "aggression");
  pushLine(builder, "        if (candidate.is_aggressor) {", "aggression");
  pushLine(builder, "            weight = weight + AGGRESSOR_BONUS;", "aggression");
  pushLine(builder, "        };", "aggression");
  pushBlankLine(builder);
  pushLine(builder, "        weight = weight + (tier * TIER_WEIGHT);", "sizeTierBonus");
  pushLine(builder, "        (weight, true)", "addToQueue");
  pushLine(builder, "    }");
  pushBlankLine(builder);
  pushLine(builder, "    fun tier_for_group(group_id: u64): u64 {");
  pushLine(builder, "        if (group_id == GROUP_BATTLESHIP) { 6 }", "getGroupId");
  pushLine(builder, "        else if (group_id == GROUP_BATTLECRUISER) { 5 }", "getGroupId");
  pushLine(builder, "        else if (group_id == GROUP_CRUISER) { 4 }", "getGroupId");
  pushLine(builder, "        else if (group_id == GROUP_DESTROYER) { 3 }", "getGroupId");
  pushLine(builder, "        else if (group_id == GROUP_FRIGATE) { 2 }", "getGroupId");
  pushLine(builder, "        else if (group_id == GROUP_CORVETTE) { 1 }", "getGroupId");
  pushLine(builder, "        else { 1 }", "getGroupId");
  pushLine(builder, "    }");
  pushLine(builder, "}");
}

export function emitReferenceContractTemplate(graph: IRGraph): ReferenceTemplateOutput | null {
  const kind = resolveTemplateKind(graph);
  if (kind === null) {
    return null;
  }

  const builder: TemplateBuilder = {
    graph,
    lines: [],
    sourceMap: [],
    nodeIdsByType: createNodeIdsByType(graph),
  };

  switch (kind) {
    case "turret_aggressor_first":
      emitAggressorFirstTemplate(builder);
      break;
    case "turret_low_hp_finisher":
      emitLowHpFinisherTemplate(builder);
      break;
    case "turret_player_screen":
      emitPlayerScreenTemplate(builder);
      break;
    case "turret_size_priority":
      emitSizePriorityTemplate(builder);
      break;
  }

  return {
    code: builder.lines.join("\n"),
    sourceMap: builder.sourceMap,
  };
}