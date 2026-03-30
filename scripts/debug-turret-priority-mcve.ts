import { bcs } from "@mysten/sui/bcs";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";

import { getDeploymentTarget } from "../src/data/deploymentTargets";
import { getPackageReferenceBundle } from "../src/data/packageReferences";

type ScriptTargetId = "testnet:stillness" | "testnet:utopia" | "local";
type ScenarioId = "owner" | "same-tribe" | "hostile" | "aggressor" | "stopped-attack" | "all";
type BehaviourChangeReason = "unspecified" | "entered" | "started-attack" | "stopped-attack";

interface ScriptOptions {
  readonly targetId: ScriptTargetId;
  readonly rpcUrlOverride: string | null;
  readonly worldPackageIdOverride: string | null;
  readonly extensionPackageId: string;
  readonly moduleName: string;
  readonly turretId: string;
  readonly ownerCharacterId: string;
  readonly sender: string;
  readonly scenario: ScenarioId;
  readonly candidateCharacterId: number | null;
  readonly candidateTribe: number | null;
  readonly candidatePriorityWeight: number;
  readonly candidateGroupId: number;
  readonly candidateItemId: number;
  readonly candidateTypeId: number;
  readonly candidateHpRatio: number;
  readonly candidateShieldRatio: number;
  readonly candidateArmorRatio: number;
  readonly candidateIsAggressor: boolean | null;
  readonly candidateBehaviour: BehaviourChangeReason | null;
}

interface TargetCandidateArg {
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

interface ReturnTargetPriorityList {
  readonly target_item_id: string;
  readonly priority_weight: string;
}

interface Scenario {
  readonly id: Exclude<ScenarioId, "all">;
  readonly label: string;
  readonly candidate: TargetCandidateArg;
}

const DEFAULT_SENDER = "0x1111111111111111111111111111111111111111111111111111111111111111";
const DEFAULT_PRIORITY_WEIGHT = 100;
const DEFAULT_GROUP_ID = 25;
const DEFAULT_ITEM_ID = 900001;
const DEFAULT_TYPE_ID = 900002;
const DEFAULT_HP_RATIO = 100;
const DEFAULT_SHIELD_RATIO = 100;
const DEFAULT_ARMOR_RATIO = 100;
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

function printHelp(): void {
  console.log([
    "Usage: bun run debug:turret-priority-mcve --target <testnet:stillness|testnet:utopia|local> --package <0x...> --module <name> --turret <0x...> --owner-character <0x...> [options]",
    "",
    "This dev-inspects the same runtime call path the world uses:",
    "  1. world::turret::verify_online(&Turret)",
    "  2. <package>::<module>::get_target_priority_list(&Turret, &Character, vector<u8>, OnlineReceipt)",
    "",
    "Required:",
    "  --package <0x...>          Published extension package id",
    "  --module <name>            Extension module name",
    "  --turret <0x...>           Turret object id",
    "  --owner-character <0x...>  Owner Character object id",
    "",
    "Optional:",
    "  --target <id>              Deployment target (default: testnet:utopia)",
    "  --rpc-url <url>            Override target RPC URL",
    "  --world-package-id <0x...> Override world package id",
    "  --sender <0x...>           Dev-inspect sender address",
    "  --scenario <id>            owner | same-tribe | hostile | aggressor | stopped-attack | all",
    "  --candidate-character-id   Custom candidate character id (use with --scenario all disabled)",
    "  --candidate-tribe          Custom candidate tribe id",
    "  --candidate-priority       Candidate base priority weight",
    "  --candidate-group-id       Candidate group id",
    "  --candidate-item-id        Candidate item id",
    "  --candidate-type-id        Candidate type id",
    "  --candidate-hp             Candidate hp ratio (0-100)",
    "  --candidate-shield         Candidate shield ratio (0-100)",
    "  --candidate-armor          Candidate armor ratio (0-100)",
    "  --candidate-is-aggressor   true | false",
    "  --candidate-behaviour      unspecified | entered | started-attack | stopped-attack",
    "",
    "Examples:",
    "  bun run debug:turret-priority-mcve --package 0xabc --module foot_gun --turret 0x123 --owner-character 0x456",
    "  bun run debug:turret-priority-mcve --package 0xabc --module foot_gun --turret 0x123 --owner-character 0x456 --scenario hostile",
    "  bun run debug:turret-priority-mcve --package 0xabc --module foot_gun --turret 0x123 --owner-character 0x456 --scenario hostile --candidate-character-id 9001 --candidate-tribe 77",
  ].join("\n"));
}

function parseBoolean(value: string | null): boolean | null {
  if (value === null) {
    return null;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Expected boolean 'true' or 'false', received '${value}'.`);
}

function parseNumber(value: string | null, flagName: string): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${flagName} must be a non-negative integer.`);
  }

  return parsed;
}

function parseBehaviour(value: string | null): BehaviourChangeReason | null {
  if (value === null) {
    return null;
  }

  if (value === "unspecified" || value === "entered" || value === "started-attack" || value === "stopped-attack") {
    return value;
  }

  throw new Error(`Unsupported behaviour '${value}'.`);
}

function parseScenario(value: string | null): ScenarioId {
  if (value === null) {
    return "all";
  }

  if (value === "owner" || value === "same-tribe" || value === "hostile" || value === "aggressor" || value === "stopped-attack" || value === "all") {
    return value;
  }

  throw new Error(`Unsupported scenario '${value}'.`);
}

function getArgValue(argv: readonly string[], flagName: string): string | null {
  const index = argv.indexOf(flagName);
  if (index < 0) {
    return null;
  }

  return argv[index + 1] ?? null;
}

function requireArg(value: string | null, flagName: string): string {
  if (value === null || value.trim() === "") {
    throw new Error(`Missing required ${flagName} argument.`);
  }

  return value;
}

function parseTargetId(value: string | null): ScriptTargetId {
  if (value === null || value === "testnet:utopia") {
    return "testnet:utopia";
  }

  if (value === "testnet:stillness" || value === "local") {
    return value;
  }

  throw new Error(`Unsupported target '${value}'.`);
}

function parseArgs(argv: readonly string[]): ScriptOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  return {
    targetId: parseTargetId(getArgValue(argv, "--target")),
    rpcUrlOverride: getArgValue(argv, "--rpc-url"),
    worldPackageIdOverride: getArgValue(argv, "--world-package-id"),
    extensionPackageId: requireArg(getArgValue(argv, "--package"), "--package"),
    moduleName: requireArg(getArgValue(argv, "--module"), "--module"),
    turretId: requireArg(getArgValue(argv, "--turret"), "--turret"),
    ownerCharacterId: requireArg(getArgValue(argv, "--owner-character"), "--owner-character"),
    sender: getArgValue(argv, "--sender") ?? DEFAULT_SENDER,
    scenario: parseScenario(getArgValue(argv, "--scenario")),
    candidateCharacterId: parseNumber(getArgValue(argv, "--candidate-character-id"), "--candidate-character-id"),
    candidateTribe: parseNumber(getArgValue(argv, "--candidate-tribe"), "--candidate-tribe"),
    candidatePriorityWeight: parseNumber(getArgValue(argv, "--candidate-priority"), "--candidate-priority") ?? DEFAULT_PRIORITY_WEIGHT,
    candidateGroupId: parseNumber(getArgValue(argv, "--candidate-group-id"), "--candidate-group-id") ?? DEFAULT_GROUP_ID,
    candidateItemId: parseNumber(getArgValue(argv, "--candidate-item-id"), "--candidate-item-id") ?? DEFAULT_ITEM_ID,
    candidateTypeId: parseNumber(getArgValue(argv, "--candidate-type-id"), "--candidate-type-id") ?? DEFAULT_TYPE_ID,
    candidateHpRatio: parseNumber(getArgValue(argv, "--candidate-hp"), "--candidate-hp") ?? DEFAULT_HP_RATIO,
    candidateShieldRatio: parseNumber(getArgValue(argv, "--candidate-shield"), "--candidate-shield") ?? DEFAULT_SHIELD_RATIO,
    candidateArmorRatio: parseNumber(getArgValue(argv, "--candidate-armor"), "--candidate-armor") ?? DEFAULT_ARMOR_RATIO,
    candidateIsAggressor: parseBoolean(getArgValue(argv, "--candidate-is-aggressor")),
    candidateBehaviour: parseBehaviour(getArgValue(argv, "--candidate-behaviour")),
  };
}

function behaviourToU8(value: BehaviourChangeReason): number {
  if (value === "unspecified") {
    return 0;
  }
  if (value === "entered") {
    return 1;
  }
  if (value === "started-attack") {
    return 2;
  }
  return 3;
}

function toU64String(value: number): string {
  return String(BigInt(value));
}

function createCandidate(input: {
  readonly itemId: number;
  readonly typeId: number;
  readonly groupId: number;
  readonly characterId: number;
  readonly tribe: number;
  readonly hpRatio: number;
  readonly shieldRatio: number;
  readonly armorRatio: number;
  readonly isAggressor: boolean;
  readonly priorityWeight: number;
  readonly behaviour: BehaviourChangeReason;
}): TargetCandidateArg {
  return {
    item_id: toU64String(input.itemId),
    type_id: toU64String(input.typeId),
    group_id: toU64String(input.groupId),
    character_id: input.characterId,
    character_tribe: input.tribe,
    hp_ratio: toU64String(input.hpRatio),
    shield_ratio: toU64String(input.shieldRatio),
    armor_ratio: toU64String(input.armorRatio),
    is_aggressor: input.isAggressor,
    priority_weight: toU64String(input.priorityWeight),
    behaviour_change: behaviourToU8(input.behaviour),
  };
}

function createBuiltInScenarios(options: ScriptOptions): readonly Scenario[] {
  const ownerCharacterNumericId = Number.parseInt(options.ownerCharacterId.slice(-8), 16) >>> 0;
  const ownerTribe = 101;
  const hostileTribe = ownerTribe + 1;
  const sameTribeCharacter = ownerCharacterNumericId + 77;
  const hostileCharacter = ownerCharacterNumericId + 88;

  return [
    {
      id: "owner",
      label: "owner candidate",
      candidate: createCandidate({
        itemId: options.candidateItemId,
        typeId: options.candidateTypeId,
        groupId: options.candidateGroupId,
        characterId: ownerCharacterNumericId,
        tribe: ownerTribe,
        hpRatio: options.candidateHpRatio,
        shieldRatio: options.candidateShieldRatio,
        armorRatio: options.candidateArmorRatio,
        isAggressor: false,
        priorityWeight: options.candidatePriorityWeight,
        behaviour: "entered",
      }),
    },
    {
      id: "same-tribe",
      label: "same tribe non-aggressor",
      candidate: createCandidate({
        itemId: options.candidateItemId + 1,
        typeId: options.candidateTypeId,
        groupId: options.candidateGroupId,
        characterId: sameTribeCharacter,
        tribe: ownerTribe,
        hpRatio: options.candidateHpRatio,
        shieldRatio: options.candidateShieldRatio,
        armorRatio: options.candidateArmorRatio,
        isAggressor: false,
        priorityWeight: options.candidatePriorityWeight,
        behaviour: "entered",
      }),
    },
    {
      id: "hostile",
      label: "other tribe entered range",
      candidate: createCandidate({
        itemId: options.candidateItemId + 2,
        typeId: options.candidateTypeId,
        groupId: options.candidateGroupId,
        characterId: hostileCharacter,
        tribe: hostileTribe,
        hpRatio: options.candidateHpRatio,
        shieldRatio: options.candidateShieldRatio,
        armorRatio: options.candidateArmorRatio,
        isAggressor: false,
        priorityWeight: options.candidatePriorityWeight,
        behaviour: "entered",
      }),
    },
    {
      id: "aggressor",
      label: "other tribe started attack",
      candidate: createCandidate({
        itemId: options.candidateItemId + 3,
        typeId: options.candidateTypeId,
        groupId: options.candidateGroupId,
        characterId: hostileCharacter + 1,
        tribe: hostileTribe,
        hpRatio: options.candidateHpRatio,
        shieldRatio: options.candidateShieldRatio,
        armorRatio: options.candidateArmorRatio,
        isAggressor: true,
        priorityWeight: options.candidatePriorityWeight,
        behaviour: "started-attack",
      }),
    },
    {
      id: "stopped-attack",
      label: "other tribe stopped attack",
      candidate: createCandidate({
        itemId: options.candidateItemId + 4,
        typeId: options.candidateTypeId,
        groupId: options.candidateGroupId,
        characterId: hostileCharacter + 2,
        tribe: hostileTribe,
        hpRatio: options.candidateHpRatio,
        shieldRatio: options.candidateShieldRatio,
        armorRatio: options.candidateArmorRatio,
        isAggressor: false,
        priorityWeight: options.candidatePriorityWeight,
        behaviour: "stopped-attack",
      }),
    },
  ];
}

function createCustomScenario(options: ScriptOptions): Scenario {
  if (options.candidateCharacterId === null || options.candidateTribe === null) {
    throw new Error("Custom scenarios require both --candidate-character-id and --candidate-tribe.");
  }

  return {
    id: "hostile",
    label: "custom candidate",
    candidate: createCandidate({
      itemId: options.candidateItemId,
      typeId: options.candidateTypeId,
      groupId: options.candidateGroupId,
      characterId: options.candidateCharacterId,
      tribe: options.candidateTribe,
      hpRatio: options.candidateHpRatio,
      shieldRatio: options.candidateShieldRatio,
      armorRatio: options.candidateArmorRatio,
      isAggressor: options.candidateIsAggressor ?? false,
      priorityWeight: options.candidatePriorityWeight,
      behaviour: options.candidateBehaviour ?? "entered",
    }),
  };
}

function resolveScenarios(options: ScriptOptions): readonly Scenario[] {
  const builtInScenarios = createBuiltInScenarios(options);
  const customRequested = options.candidateCharacterId !== null || options.candidateTribe !== null;

  if (customRequested) {
    return [createCustomScenario(options)];
  }

  if (options.scenario === "all") {
    return builtInScenarios;
  }

  const scenario = builtInScenarios.find((candidate) => candidate.id === options.scenario);
  if (scenario === undefined) {
    throw new Error(`Unable to resolve scenario '${options.scenario}'.`);
  }

  return [scenario];
}

function encodeCandidates(candidates: readonly TargetCandidateArg[]): Uint8Array {
  return bcs.vector(TARGET_CANDIDATE_BCS).serialize(candidates).toBytes();
}

function decodeReturnList(bytes: Uint8Array): readonly ReturnTargetPriorityList[] {
  return bcs.vector(RETURN_TARGET_PRIORITY_LIST_BCS).parse(bytes) as readonly ReturnTargetPriorityList[];
}

function decodeReturnedMoveBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bcs.vector(bcs.U8).parse(bytes) as number[]);
}

function formatCandidate(candidate: TargetCandidateArg): string {
  return JSON.stringify({
    itemId: candidate.item_id,
    typeId: candidate.type_id,
    groupId: candidate.group_id,
    characterId: candidate.character_id,
    tribe: candidate.character_tribe,
    isAggressor: candidate.is_aggressor,
    priorityWeight: candidate.priority_weight,
    behaviour: candidate.behaviour_change,
  });
}

function formatReturnList(entries: readonly ReturnTargetPriorityList[]): string {
  if (entries.length === 0) {
    return "[]";
  }

  return JSON.stringify(entries.map((entry) => ({
    targetItemId: entry.target_item_id,
    priorityWeight: entry.priority_weight,
  })));
}

async function inspectScenario(input: {
  readonly client: SuiJsonRpcClient;
  readonly sender: string;
  readonly worldPackageId: string;
  readonly extensionPackageId: string;
  readonly moduleName: string;
  readonly turretId: string;
  readonly ownerCharacterId: string;
  readonly scenario: Scenario;
}): Promise<void> {
  const tx = new Transaction();
  const candidateBytes = encodeCandidates([input.scenario.candidate]);
  const receipt = tx.moveCall({
    target: `${input.worldPackageId}::turret::verify_online`,
    arguments: [tx.object(input.turretId)],
  });

  tx.moveCall({
    target: `${input.extensionPackageId}::${input.moduleName}::get_target_priority_list`,
    arguments: [
      tx.object(input.turretId),
      tx.object(input.ownerCharacterId),
      tx.pure.vector("u8", Array.from(candidateBytes)),
      receipt,
    ],
  });

  const result = await input.client.devInspectTransactionBlock({
    sender: input.sender,
    transactionBlock: tx,
  });

  console.log(`\n=== ${input.scenario.label} ===`);
  console.log(`candidate: ${formatCandidate(input.scenario.candidate)}`);

  if (result.error !== null && result.error !== undefined) {
    console.log(`error: ${result.error}`);
    return;
  }

  const execution = result.results?.at(-1);
  const rawBytes = execution?.returnValues?.[0]?.[0];
  const rawType = execution?.returnValues?.[0]?.[1];

  if (rawBytes === undefined) {
    console.log("error: no return value produced by dev inspect");
    return;
  }

  if (rawType !== "vector<u8>") {
    console.log(`error: unexpected return type ${rawType ?? "unknown"}`);
    return;
  }

  const returnedBytes = decodeReturnedMoveBytes(Uint8Array.from(rawBytes));
  const decoded = decodeReturnList(returnedBytes);
  console.log(`return list: ${formatReturnList(decoded)}`);
}

async function main(): Promise<void> {
  const options = parseArgs(Bun.argv.slice(2));
  const target = getDeploymentTarget(options.targetId);
  const referenceBundle = getPackageReferenceBundle(options.targetId);
  const worldPackageId = options.worldPackageIdOverride ?? referenceBundle.worldPackageId;
  const rpcUrl = options.rpcUrlOverride ?? target.rpcUrl;
  const scenarios = resolveScenarios(options);
  const client = new SuiJsonRpcClient({ url: rpcUrl });

  console.log("=== Turret Priority MCVE ===");
  console.log(`target: ${options.targetId}`);
  console.log(`rpc url: ${rpcUrl}`);
  console.log(`world package id: ${worldPackageId}`);
  console.log(`extension package id: ${options.extensionPackageId}`);
  console.log(`module: ${options.moduleName}`);
  console.log(`turret: ${options.turretId}`);
  console.log(`owner character: ${options.ownerCharacterId}`);
  console.log(`sender: ${options.sender}`);
  console.log(`scenario count: ${String(scenarios.length)}`);

  for (const scenario of scenarios) {
    await inspectScenario({
      client,
      sender: options.sender,
      worldPackageId,
      extensionPackageId: options.extensionPackageId,
      moduleName: options.moduleName,
      turretId: options.turretId,
      ownerCharacterId: options.ownerCharacterId,
      scenario,
    });
  }
}

await main();