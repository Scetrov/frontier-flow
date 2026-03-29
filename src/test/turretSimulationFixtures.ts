import type { StoredDeploymentState, TurretInfo } from "../types/authorization";
import {
  createClosedTurretSimulationSession,
  createEmptySimulationInputDraft,
  type SimulationCandidateDraft,
  type TurretSimulationSession,
} from "../types/turretSimulation";

export const simulationDeploymentState: StoredDeploymentState = {
  version: 1,
  packageId: "0xfeedface",
  moduleName: "starter_contract",
  targetId: "testnet:stillness",
  transactionDigest: "0xd1g357",
  deployedAt: "2026-03-23T00:00:00.000Z",
  contractName: "Starter Contract",
};

export const simulationTurret: TurretInfo = {
  objectId: "0x111",
  displayName: "Perimeter Lancer",
  currentExtension: null,
};

/**
 * Build a simulation candidate draft for focused unit and component tests.
 */
export function createSimulationCandidateDraft(
  overrides: Partial<SimulationCandidateDraft> = {},
): SimulationCandidateDraft {
  return {
    itemId: "",
    typeId: "",
    groupId: "",
    characterId: null,
    characterTribe: null,
    hpRatio: "100",
    shieldRatio: "100",
    armorRatio: "100",
    isAggressor: false,
    priorityWeight: "0",
    behaviourChange: 1,
    ...overrides,
  };
}

/**
 * Build a modal session snapshot for simulation tests.
 */
export function createSimulationSession(
  overrides: Partial<TurretSimulationSession> = {},
): TurretSimulationSession {
  return {
    ...createClosedTurretSimulationSession(),
    status: "editing",
    deploymentKey: "testnet:stillness:0xfeedface:starter_contract",
    deploymentState: simulationDeploymentState,
    draft: createEmptySimulationInputDraft(1),
    fieldErrors: {},
    isHydratingOwnerCharacter: false,
    latestError: null,
    latestResult: null,
    openedAt: 1,
    openedExtensionTypeName: null,
    ownerCharacterErrorMessage: null,
    ownerCharacterId: null,
    staleMessage: null,
    suggestionState: {
      activeField: null,
      errorMessage: null,
      isLoading: false,
      query: "",
      suggestions: [],
    },
    turret: simulationTurret,
    turretObjectId: simulationTurret.objectId,
    turretTitle: simulationTurret.displayName,
    ...overrides,
  };
}