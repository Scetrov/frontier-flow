import type { TurretSimulationSession } from "../types/turretSimulation";
import { getSharedExtensionKey, type SharedExtension } from "./sharedExtensionStorage";

/** Whether the selected contract came from somebody else rather than this wallet. */
export function isSharedContract(deploymentKey: string | null, extensions: readonly SharedExtension[]): boolean {
  return deploymentKey !== null && extensions.some((extension) => getSharedExtensionKey(extension) === deploymentKey);
}

/**
 * Whether the selected contract has been exercised in this simulation session.
 *
 * Simulation calls the extension's `get_target_priority_list` directly rather
 * than through a turret's authorized extension, so a contract can be run
 * against a candidate before it is authorized. A result belonging to a
 * different contract says nothing about this one.
 */
export function isContractSimulated(
  deploymentKey: string | null,
  session: Pick<TurretSimulationSession, "deploymentKey" | "latestResult">,
): boolean {
  return deploymentKey !== null && session.deploymentKey === deploymentKey && session.latestResult !== null;
}
