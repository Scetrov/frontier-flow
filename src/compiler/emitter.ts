import { createGenerationContext, getGenerator } from "./generators";
import { createGeneratedContractArtifact, socketBindingKey } from "./generators/shared";
import { emitReferenceContractTemplate } from "./referenceTemplates";
import { getDeploymentTarget } from "../data/deploymentTargets";
import { getPackageReferenceBundle } from "../data/packageReferences";
import type { AnnotatedLine, ArtifactManifest, DeploymentTargetId, EmitterOutput, IRGraph, SourceMapEntry } from "./types";

function createMoveToml(moduleName: string): string {
  return [
    "[package]",
    `name = "${moduleName}"`,
    'edition = "2024.beta"',
    "",
    "[addresses]",
    'builder_extensions = "0x0"',
    "",
  ].join("\n");
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
        return [...existingDependencies, bundle.worldPackageId, bundle.objectRegistryId, bundle.serverAddressRegistryId];
      })()
    : [...existingDependencies];

  return {
    moveToml: createMoveToml(moduleName),
    dependencies,
  };
}

function pushLine(lines: string[], sourceMap: SourceMapEntry[], code: string, nodeId: string | null): void {
  lines.push(code);
  if (nodeId !== null) {
    sourceMap.push({
      line: lines.length,
      astNodeId: nodeId,
      reactFlowNodeId: nodeId,
    });
  }
}

function createGenericPreamble(lines: string[], sourceMap: SourceMapEntry[]): void {
  pushLine(lines, sourceMap, "    use std::vector;", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    const BEHAVIOUR_STOPPED_ATTACK: u64 = 0;", null);
  pushLine(lines, sourceMap, "    const BEHAVIOUR_ENTERED: u64 = 1;", null);
  pushLine(lines, sourceMap, "    const BEHAVIOUR_STARTED_ATTACK: u64 = 2;", null);
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
  pushLine(lines, sourceMap, "        character_id: u64,", null);
  pushLine(lines, sourceMap, "        character_tribe: u64,", null);
  pushLine(lines, sourceMap, "        behaviour_change: u64,", null);
  pushLine(lines, sourceMap, "        is_aggressor: bool,", null);
  pushLine(lines, sourceMap, "        priority_weight: u64,", null);
  pushLine(lines, sourceMap, "        shield_ratio: u64,", null);
  pushLine(lines, sourceMap, "        armor_ratio: u64,", null);
  pushLine(lines, sourceMap, "        hp_ratio: u64,", null);
  pushLine(lines, sourceMap, "        group_id: u64,", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    public struct ReturnTargetPriorityList has copy, drop, store {", null);
  pushLine(lines, sourceMap, "        item_id: u64,", null);
  pushLine(lines, sourceMap, "        weight: u64,", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    fun new_return_target_priority_list(item_id: u64, weight: u64): ReturnTargetPriorityList {", null);
  pushLine(lines, sourceMap, "        ReturnTargetPriorityList { item_id, weight }", null);
  pushLine(lines, sourceMap, "    }", null);
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

function emitGenericSynthesizedContract(graph: IRGraph, annotatedLines: readonly AnnotatedLine[], bindings: ReadonlyMap<string, string>): {
  readonly code: string;
  readonly sourceMap: readonly SourceMapEntry[];
} {
  const lines: string[] = [];
  const sourceMap: SourceMapEntry[] = [];
  const actionResultBindings = resolveActionResultBindings(graph, bindings);

  pushLine(lines, sourceMap, `module builder_extensions::${graph.moduleName} {`, null);
  createGenericPreamble(lines, sourceMap);
  pushLine(lines, sourceMap, "    public fun execute(", null);
  pushLine(lines, sourceMap, "        owner_character_id: u64,", null);
  pushLine(lines, sourceMap, "        owner_tribe: u64,", null);
  pushLine(lines, sourceMap, "        candidates: vector<TargetCandidateArg>,", null);
  pushLine(lines, sourceMap, "    ): vector<ReturnTargetPriorityList> {", null);
  pushLine(lines, sourceMap, "        build_priority_list_for_owner(owner_character_id, owner_tribe, candidates)", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    public fun build_priority_list_for_owner(", null);
  pushLine(lines, sourceMap, "        owner_character_id: u64,", null);
  pushLine(lines, sourceMap, "        owner_tribe: u64,", null);
  pushLine(lines, sourceMap, "        candidates: vector<TargetCandidateArg>,", null);
  pushLine(lines, sourceMap, "    ): vector<ReturnTargetPriorityList> {", null);
  pushLine(lines, sourceMap, "        let mut return_list = vector::empty<ReturnTargetPriorityList>();", null);
  pushLine(lines, sourceMap, "        let candidate_count = vector::length(&candidates);", null);
  pushLine(lines, sourceMap, "        let mut index = 0;", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "        while (index < candidate_count) {", null);
  pushLine(lines, sourceMap, "            let candidate = vector::borrow(&candidates, index);", null);
  pushLine(lines, sourceMap, "            let (weight, include) = score_candidate(owner_character_id, owner_tribe, candidate);", null);
  pushLine(lines, sourceMap, "            if (include) {", null);
  pushLine(lines, sourceMap, "                vector::push_back(&mut return_list, new_return_target_priority_list(candidate.item_id, weight));", null);
  pushLine(lines, sourceMap, "            };", null);
  pushLine(lines, sourceMap, "            index = index + 1;", null);
  pushLine(lines, sourceMap, "        };", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "        return_list", null);
  pushLine(lines, sourceMap, "    }", null);
  pushLine(lines, sourceMap, "", null);
  pushLine(lines, sourceMap, "    fun score_candidate(", null);
  pushLine(lines, sourceMap, "        owner_character_id: u64,", null);
  pushLine(lines, sourceMap, "        owner_tribe: u64,", null);
  pushLine(lines, sourceMap, "        candidate: &TargetCandidateArg,", null);
  pushLine(lines, sourceMap, "    ): (u64, bool) {", null);

  for (const annotatedLine of annotatedLines) {
    pushLine(lines, sourceMap, `${"    ".repeat(annotatedLine.indent)}${annotatedLine.code}`, annotatedLine.nodeId);
  }

  pushLine(lines, sourceMap, `        (${actionResultBindings.weightBinding}, ${actionResultBindings.includeBinding})`, null);
  pushLine(lines, sourceMap, "    }", null);
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
    }),
  };
}