import type { NodeDefinition } from "../types/nodes";

export const nodeDefinitions: readonly NodeDefinition[] = [
  {
    type: "aggression",
    label: "Aggression",
    description: "Trigger combat automations when hostile intent is detected.",
    color: "var(--brand-orange)",
  },
  {
    type: "proximity",
    label: "Proximity",
    description: "Respond when ships, stations, or anomalies enter range.",
    color: "var(--socket-entity)",
  },
  {
    type: "getTribe",
    label: "Get Tribe",
    description: "Resolve the pilot's tribe and branch automation by identity.",
    color: "var(--socket-value)",
  },
  {
    type: "isAggressor",
    label: "Is Aggressor",
    description: "Check if a target is actively attacking the turret's base.",
    color: "var(--socket-vector)",
  },
  {
    type: "setPriority",
    label: "Set Priority",
    description: "Set or adjust a target's priority weight in the return list.",
    color: "var(--socket-signal)",
  },
] as const;