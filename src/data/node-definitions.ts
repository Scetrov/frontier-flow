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
    type: "inventoryCheck",
    label: "Inventory Check",
    description: "Inspect cargo and equipment states before action execution.",
    color: "var(--socket-vector)",
  },
  {
    type: "signalRelay",
    label: "Signal Relay",
    description: "Forward fleet events and state transitions to downstream nodes.",
    color: "var(--socket-signal)",
  },
] as const;