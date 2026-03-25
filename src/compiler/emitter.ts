import { createGenerationContext, getGenerator } from "./generators";
import { createGeneratedContractArtifact, socketBindingKey } from "./generators/shared";
import { emitReferenceContractTemplate } from "./referenceTemplates";
import { createWorldShimSourceFiles } from "./worldShim";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { getPackageReferenceBundle } from "../data/packageReferences";
import type { AnnotatedLine, ArtifactManifest, DeploymentTargetId, EmitterOutput, GeneratedSourceFile, IRGraph, SourceMapEntry } from "./types";
const MOVE_IDENTIFIER_PATTERN = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
const MOVE_IDENTIFIER_STOP_WORDS = new Set([
  "BCS",
  "Character",
  "OnlineReceipt",
  "TargetCandidateArg",
  "Turret",
  "TurretAuth",
  "TargetCandidateArg",
  "ReturnTargetPriorityList",
  "bool",
  "builder_extensions",
  "bcs",
  "character",
  "copy",
  "drop",
  "else",
  "false",
  "fun",
  "has",
  "if",
  "in_game_id",
  "let",
  "module",
  "mut",
  "object",
  "package",
  "public",
  "std",
  "store",
  "true",
  "u32",
  "u64",
  "u8",
  "use",
  "vector",
  "world",
  "world_turret",
]);

function createMoveToml(moduleName: string): string {
  return [
    "[package]",
    `name = "${moduleName}"`,
    'edition = "2024.beta"',
    "",
    "[addresses]",
    'builder_extensions = "0x0"',
    'world = "0x0"',
    "",
    "[dependencies]",
    'world = { local = "deps/world" }',
    "",
  ].join("\n");
}

function createArtifactSourceFiles(moduleName: string, moveSource: string): readonly GeneratedSourceFile[] {
  return [
    { path: `sources/${moduleName}.move`, content: moveSource },
    ...createWorldShimSourceFiles(),
  ];
}

/**
 * Prepare a deployment manifest for a specific target without mutating compiled source state.
 */
export function prepareArtifactManifestForTarget(
  moduleName: string,
  targetId: DeploymentTargetId,
  existingDependencies: readonly string[] = [],
): ArtifactManifest {
  const target = getDeploymentTarget(targetId);
  const dependencies = target.requiresPublishedPackageRefs
    ? (() => {
        const bundle = getPackageReferenceBundle(targetId as Exclude<DeploymentTargetId, "local">);
        return [...existingDependencies, bundle.worldPackageId];
      })()
    : [...existingDependencies];

  return {
    moveToml: createMoveToml(moduleName),
    dependencies: [...new Set(dependencies)],
  };
}

function pushLine(lines: string[], sourceMap: SourceMapEntry[], code: string, nodeId: string | null): void {
  const shouldAnnotate = nodeId !== null && code.trim() !== "";
  lines.push(shouldAnnotate ? `${code} // @ff-node:${nodeId}` : code);
  if (nodeId !== null) {
    sourceMap.push({
      line: lines.length,
      astNodeId: nodeId,
      reactFlowNodeId: nodeId,
    });
  }
}

function collectMoveIdentifiers(code: string): readonly string[] {
  const matches = code.match(MOVE_IDENTIFIER_PATTERN) ?? [];
  return matches.filter((identifier) => !MOVE_IDENTIFIER_STOP_WORDS.has(identifier));
}

function pruneUnusedAnnotatedLines(
  annotatedLines: readonly AnnotatedLine[],
  requiredBindings: readonly string[],
): readonly AnnotatedLine[] {
  const keepLine = annotatedLines.map(() => true);
  const usedBindings = new Set(requiredBindings);

  for (let index = annotatedLines.length - 1; index >= 0; index -= 1) {
    const line = annotatedLines[index];
    const trimmed = line.code.trim();

    if (trimmed.startsWith("//")) {
      continue;
    }

    const bindingMatch = trimmed.match(/^let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (bindingMatch === null) {
      for (const identifier of collectMoveIdentifiers(trimmed)) {
        usedBindings.add(identifier);
      }
      continue;
    }

    const binding = bindingMatch[1];
    if (!usedBindings.has(binding)) {
      keepLine[index] = false;
      continue;
    }

    const assignmentIndex = trimmed.indexOf("=");
    if (assignmentIndex >= 0) {
      for (const identifier of collectMoveIdentifiers(trimmed.slice(assignmentIndex + 1))) {
        usedBindings.add(identifier);
      }
    }
    usedBindings.delete(binding);
  }

  return annotatedLines.filter((line, index) => {
    if (!keepLine[index]) {
      return false;
    }

    if (!line.code.trim().startsWith("//")) {
      return true;
    }

    for (let nextIndex = index + 1; nextIndex < annotatedLines.length; nextIndex += 1) {
      if (!keepLine[nextIndex]) {
        continue;
      }

      const nextLine = annotatedLines[nextIndex];
      if (nextLine.nodeId !== line.nodeId) {
        return false;
      }

      if (!nextLine.code.trim().startsWith("//")) {
        return true;
      }
    }

    return false;
  });
}

function createGenericPreamble(lines: string[], sourceMap: SourceMapEntry[]): void {
  pushLine(lines, sourceMap, "    use std::vector;", null);
  pushLine(lines, sourceMap, "    use sui::{bcs, object};", null);
  pushLine(lines, sourceMap, "    use world::{", null);
  pushLine(lines, sourceMap, "        character::{Self, Character},", null);
  pushLine(lines, sourceMap, "        in_game_id,", null);
  pushLine(lines, sourceMap, "        turret::{OnlineReceipt, ReturnTargetPriorityList, Turret},", null);
  pushLine(lines, sourceMap, "    };", null);
  pushLine(lines, sourceMap, "    use world::turret as world_turret;", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    const BEHAVIOUR_STOPPED_ATTACK: u8 = 3;", null);
  pushLine(lines, sourceMap, "    const BEHAVIOUR_ENTERED: u8 = 1;", null);
  pushLine(lines, sourceMap, "    const BEHAVIOUR_STARTED_ATTACK: u8 = 2;", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    const STARTED_ATTACK_BONUS: u64 = 10_000;", null);
  pushLine(lines, sourceMap, "    const ENTERED_BONUS: u64 = 1_000;", null);
  pushLine(lines, sourceMap, "    const AGGRESSOR_BONUS: u64 = 5_000;", null);
  pushLine(lines, sourceMap, "    const PLAYER_TARGET_BONUS: u64 = 1_000;", null);
  pushLine(lines, sourceMap, "    const SHIELD_BREAK_BONUS_MULTIPLIER: u64 = 20;", null);
  pushLine(lines, sourceMap, "    const ARMOR_BREAK_BONUS_MULTIPLIER: u64 = 10;", null);
  pushLine(lines, sourceMap, "    const HULL_BREAK_BONUS_MULTIPLIER: u64 = 5;", null);
  pushLine(lines, sourceMap, "    const TIER_WEIGHT: u64 = 3_000;", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    const GROUP_CORVETTE: u64 = 31;", null);
  pushLine(lines, sourceMap, "    const GROUP_FRIGATE: u64 = 237;", null);
  pushLine(lines, sourceMap, "    const GROUP_DESTROYER: u64 = 25;", null);
  pushLine(lines, sourceMap, "    const GROUP_CRUISER: u64 = 420;", null);
  pushLine(lines, sourceMap, "    const GROUP_BATTLECRUISER: u64 = 26;", null);
  pushLine(lines, sourceMap, "    const GROUP_BATTLESHIP: u64 = 419;", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    public struct TargetCandidateArg has copy, drop, store {", null);
  pushLine(lines, sourceMap, "        item_id: u64,", null);
  pushLine(lines, sourceMap, "        type_id: u64,", null);
  pushLine(lines, sourceMap, "        group_id: u64,", null);
  pushLine(lines, sourceMap, "        character_id: u32,", null);
  pushLine(lines, sourceMap, "        character_tribe: u32,", null);
  pushLine(lines, sourceMap, "        hp_ratio: u64,", null);
  pushLine(lines, sourceMap, "        shield_ratio: u64,", null);
  pushLine(lines, sourceMap, "        armor_ratio: u64,", null);
  pushLine(lines, sourceMap, "        is_aggressor: bool,", null);
  pushLine(lines, sourceMap, "        priority_weight: u64,", null);
  pushLine(lines, sourceMap, "        behaviour_change: u8,", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    public struct TurretAuth has drop {}", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    fun tier_for_group(group_id: u64): u64 {", null);
  pushLine(lines, sourceMap, "        if (group_id == GROUP_BATTLESHIP) { 6 }", null);
  pushLine(lines, sourceMap, "        else if (group_id == GROUP_BATTLECRUISER) { 5 }", null);
  pushLine(lines, sourceMap, "        else if (group_id == GROUP_CRUISER) { 4 }", null);
  pushLine(lines, sourceMap, "        else if (group_id == GROUP_DESTROYER) { 3 }", null);
  pushLine(lines, sourceMap, "        else if (group_id == GROUP_FRIGATE) { 2 }", null);
  pushLine(lines, sourceMap, "        else if (group_id == GROUP_CORVETTE) { 1 }", null);
  pushLine(lines, sourceMap, "        else { 1 }", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
}

function resolveActionResultBindings(graph: IRGraph, bindings: ReadonlyMap<string, string>): {
  readonly includeBinding: string;
  readonly weightBinding: string;
} {
  const actionNodes = graph.executionOrder
    .map((nodeId) => graph.nodes.get(nodeId))
    .filter((node): node is NonNullable<typeof node> => node !== undefined && node.type === "addToQueue");

  const actionNode = actionNodes.at(-1);
  if (actionNode === undefined) {
    return {
      includeBinding: "true",
      weightBinding: "candidate.priority_weight",
    };
  }

  return {
    includeBinding: bindings.get(socketBindingKey(actionNode.id, "include_result")) ?? "true",
    weightBinding: bindings.get(socketBindingKey(actionNode.id, "priority_out")) ?? "candidate.priority_weight",
  };
}

function emitBcsUnpackerFunctions(lines: string[], sourceMap: SourceMapEntry[]): void {
  pushLine(lines, sourceMap, "    fun unpack_candidate_list(candidate_list_bytes: vector<u8>): vector<TargetCandidateArg> {", null);
  pushLine(lines, sourceMap, "        if (vector::length(&candidate_list_bytes) == 0) {", null);
  pushLine(lines, sourceMap, "            return vector::empty()", null);
  pushLine(lines, sourceMap, "        };", null);
  pushLine(lines, sourceMap, "        let mut bcs_data = bcs::new(candidate_list_bytes);", null);
  pushLine(lines, sourceMap, "        bcs_data.peel_vec!(|candidate_bcs| peel_target_candidate_from_bcs(candidate_bcs))", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    fun peel_target_candidate_from_bcs(bcs_data: &mut bcs::BCS): TargetCandidateArg {", null);
  pushLine(lines, sourceMap, "        let item_id = bcs_data.peel_u64();", null);
  pushLine(lines, sourceMap, "        let type_id = bcs_data.peel_u64();", null);
  pushLine(lines, sourceMap, "        let group_id = bcs_data.peel_u64();", null);
  pushLine(lines, sourceMap, "        let character_id = bcs_data.peel_u32();", null);
  pushLine(lines, sourceMap, "        let character_tribe = bcs_data.peel_u32();", null);
  pushLine(lines, sourceMap, "        let hp_ratio = bcs_data.peel_u64();", null);
  pushLine(lines, sourceMap, "        let shield_ratio = bcs_data.peel_u64();", null);
  pushLine(lines, sourceMap, "        let armor_ratio = bcs_data.peel_u64();", null);
  pushLine(lines, sourceMap, "        let is_aggressor = bcs_data.peel_bool();", null);
  pushLine(lines, sourceMap, "        let priority_weight = bcs_data.peel_u64();", null);
  pushLine(lines, sourceMap, "        let behaviour_change = bcs_data.peel_u8();", null);
  pushLine(lines, sourceMap, "        TargetCandidateArg {", null);
  pushLine(lines, sourceMap, "            item_id,", null);
  pushLine(lines, sourceMap, "            type_id,", null);
  pushLine(lines, sourceMap, "            group_id,", null);
  pushLine(lines, sourceMap, "            character_id,", null);
  pushLine(lines, sourceMap, "            character_tribe,", null);
  pushLine(lines, sourceMap, "            hp_ratio,", null);
  pushLine(lines, sourceMap, "            shield_ratio,", null);
  pushLine(lines, sourceMap, "            armor_ratio,", null);
  pushLine(lines, sourceMap, "            is_aggressor,", null);
  pushLine(lines, sourceMap, "            priority_weight,", null);
  pushLine(lines, sourceMap, "            behaviour_change,", null);
  pushLine(lines, sourceMap, "        }", null);
  pushLine(lines, sourceMap, "    }", null);
}

function emitGenericSynthesizedContract(graph: IRGraph, annotatedLines: readonly AnnotatedLine[], bindings: ReadonlyMap<string, string>): {
  readonly code: string;
  readonly sourceMap: readonly SourceMapEntry[];
} {
  const lines: string[] = [];
  const sourceMap: SourceMapEntry[] = [];
  const actionResultBindings = resolveActionResultBindings(graph, bindings);
  const requiredBindings = collectMoveIdentifiers(`${actionResultBindings.weightBinding} ${actionResultBindings.includeBinding}`);
  const prunedLines = pruneUnusedAnnotatedLines(annotatedLines, requiredBindings);

  pushLine(lines, sourceMap, `module builder_extensions::${graph.moduleName} {`, null);
  createGenericPreamble(lines, sourceMap);
  pushLine(lines, sourceMap, "    public fun get_target_priority_list(", null);
  pushLine(lines, sourceMap, "        turret: &Turret,", null);
  pushLine(lines, sourceMap, "        owner_character: &Character,", null);
  pushLine(lines, sourceMap, "        target_candidate_list: vector<u8>,", null);
  pushLine(lines, sourceMap, "        receipt: OnlineReceipt,", null);
  pushLine(lines, sourceMap, "    ): vector<u8> {", null);
  pushLine(lines, sourceMap, "        assert!(receipt.turret_id() == object::id(turret), 0);", null);
  pushLine(lines, sourceMap, "        let owner_character_id = in_game_id::item_id(&character::key(owner_character)) as u32;", null);
  pushLine(lines, sourceMap, "        let return_list = build_priority_list_for_owner(", null);
  pushLine(lines, sourceMap, "            owner_character_id,", null);
  pushLine(lines, sourceMap, "            character::tribe(owner_character),", null);
  pushLine(lines, sourceMap, "            target_candidate_list,", null);
  pushLine(lines, sourceMap, "        );", null);
  pushLine(lines, sourceMap, "        world_turret::destroy_online_receipt(receipt, TurretAuth {});", null);
  pushLine(lines, sourceMap, "        bcs::to_bytes(&return_list)", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    public(package) fun build_priority_list_for_owner(", null);
  pushLine(lines, sourceMap, "        owner_character_id: u32,", null);
  pushLine(lines, sourceMap, "        owner_tribe: u32,", null);
  pushLine(lines, sourceMap, "        target_candidate_list: vector<u8>,", null);
  pushLine(lines, sourceMap, "    ): vector<ReturnTargetPriorityList> {", null);
  pushLine(lines, sourceMap, "        let candidates = unpack_candidate_list(target_candidate_list);", null);
  pushLine(lines, sourceMap, "        let mut return_list = vector::empty<ReturnTargetPriorityList>();", null);
  pushLine(lines, sourceMap, "        let candidate_count = vector::length(&candidates);", null);
  pushLine(lines, sourceMap, "        let mut index = 0u64;", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "        while (index < candidate_count) {", null);
  pushLine(lines, sourceMap, "            let candidate = vector::borrow(&candidates, index);", null);
  pushLine(lines, sourceMap, "            let (weight, include) = score_candidate(owner_character_id, owner_tribe, candidate);", null);
  pushLine(lines, sourceMap, "            if (include) {", null);
  pushLine(lines, sourceMap, "                vector::push_back(&mut return_list, world_turret::new_return_target_priority_list(candidate.item_id, weight));", null);
  pushLine(lines, sourceMap, "            };", null);
  pushLine(lines, sourceMap, "            index = index + 1;", null);
  pushLine(lines, sourceMap, "        };", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "        return_list", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    fun score_candidate(", null);
  pushLine(lines, sourceMap, "        owner_character_id: u32,", null);
  pushLine(lines, sourceMap, "        owner_tribe: u32,", null);
  pushLine(lines, sourceMap, "        candidate: &TargetCandidateArg,", null);
  pushLine(lines, sourceMap, "    ): (u64, bool) {", null);

  for (const annotatedLine of prunedLines) {
    pushLine(lines, sourceMap, `${"    ".repeat(annotatedLine.indent)}${annotatedLine.code}`, annotatedLine.nodeId);
  }

  pushLine(lines, sourceMap, `        (${actionResultBindings.weightBinding}, ${actionResultBindings.includeBinding})`, null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  emitBcsUnpackerFunctions(lines, sourceMap);
  pushLine(lines, sourceMap, "}", null);

  return {
    code: lines.join("\n"),
    sourceMap,
  };
}

/**
 * Emit deterministic Move source and source map output from the validated IR graph.
 */
export function emitMove(graph: IRGraph): EmitterOutput {
  const referenceTemplate = emitReferenceContractTemplate(graph);
  if (referenceTemplate !== null) {
    const moveToml = createMoveToml(graph.moduleName);
    const sourceFiles = createArtifactSourceFiles(graph.moduleName, referenceTemplate.code);
    return {
      code: referenceTemplate.code,
      moveToml,
      sourceMap: referenceTemplate.sourceMap,
      artifact: createGeneratedContractArtifact({
        moduleName: graph.moduleName,
        requestedModuleName: graph.requestedModuleName,
        moveToml,
        moveSource: referenceTemplate.code,
        sourceMap: referenceTemplate.sourceMap,
        sourceFiles,
      }),
    };
  }

  const context = {
    ...createGenerationContext(graph.moduleName),
    graph,
  };
  const annotatedLines: AnnotatedLine[] = [];

  for (const nodeId of graph.executionOrder) {
    const node = graph.nodes.get(nodeId);
    if (node === undefined) {
      continue;
    }

    const generator = getGenerator(node.type);
    if (generator === undefined) {
      continue;
    }

    annotatedLines.push(...generator.emit(node, context));
  }
  const synthesized = emitGenericSynthesizedContract(graph, annotatedLines, context.bindings);
  const moveToml = createMoveToml(graph.moduleName);
  const sourceFiles = createArtifactSourceFiles(graph.moduleName, synthesized.code);

  return {
    code: synthesized.code,
    moveToml,
    sourceMap: synthesized.sourceMap,
    artifact: createGeneratedContractArtifact({
      moduleName: graph.moduleName,
      requestedModuleName: graph.requestedModuleName,
      moveToml,
      moveSource: synthesized.code,
      sourceMap: synthesized.sourceMap,
      sourceFiles,
    }),
  };
}