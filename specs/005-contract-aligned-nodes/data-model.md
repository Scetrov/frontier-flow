# Data Model: Contract-Aligned Nodes

**Feature**: 005-contract-aligned-nodes  
**Date**: 2026-03-17

## Entities

### NodeDefinition (existing — modified content)

The central entity. Each entry describes a visual node type that the sidebar renders and the canvas instantiates.

| Field         | Type                          | Constraints                      | Notes                                          |
| ------------- | ----------------------------- | -------------------------------- | ---------------------------------------------- |
| `type`        | `string`                      | Unique, stable, camelCase        | ReactFlow node type key; used in serialisation |
| `label`       | `string`                      | Non-empty, title case            | Sidebar & node header display text             |
| `description` | `string`                      | Non-empty                        | Sidebar tooltip & node body text               |
| `color`       | `string`                      | CSS variable reference           | Uses design system tokens                      |
| `category`    | `NodeCategory`                | One of 5 enum values             | Determines sidebar grouping                    |
| `sockets`     | `readonly SocketDefinition[]` | ≥1 entry, unique ids within node | Declares typed handles                         |

### SocketDefinition (existing — unchanged)

| Field       | Type              | Constraints                            | Notes                           |
| ----------- | ----------------- | -------------------------------------- | ------------------------------- |
| `id`        | `string`          | Unique within parent node, snake_case  | Handle identifier               |
| `type`      | `SocketType`      | Member of existing union               | Drives colour and compatibility |
| `position`  | `SocketPosition`  | `left` \| `right` \| `top` \| `bottom` | Handle anchor point             |
| `direction` | `SocketDirection` | `input` \| `output`                    | Source vs target handle         |
| `label`     | `string`          | Non-empty                              | Rendered beside handle          |

### NodeCategory (existing — unchanged)

Enum: `event-trigger` | `data-accessor` | `data-source` | `logic-gate` | `action`

### SocketType (existing — unchanged)

Union: `rider` | `tribe` | `standing` | `wallet` | `priority` | `target` | `boolean` | `list` | `number` | `string` | `any`

No new types needed for this feature.

## Complete Node Definition Table

29 nodes, ordered by category (event-trigger → data-accessor → logic-gate → data-source → action).

### Event Trigger Nodes

| #   | type         | label      | category      | color                 | sockets                                        |
| --- | ------------ | ---------- | ------------- | --------------------- | ---------------------------------------------- |
| 1   | `aggression` | Aggression | event-trigger | `var(--brand-orange)` | OUT `priority`(priority), OUT `target`(target) |
| 2   | `proximity`  | Proximity  | event-trigger | `var(--brand-orange)` | OUT `priority`(priority), OUT `target`(target) |

### Data Accessor Nodes

| #   | type                | label               | category      | color                  | sockets                                                            |
| --- | ------------------- | ------------------- | ------------- | ---------------------- | ------------------------------------------------------------------ |
| 3   | `getTribe`          | Get Tribe           | data-accessor | `var(--socket-entity)` | IN `target`(target) → OUT `tribe`(tribe), OUT `owner_tribe`(tribe) |
| 4   | `hpRatio`           | HP Ratio            | data-accessor | `var(--socket-value)`  | IN `target`(target) → OUT `hp_ratio`(number)                       |
| 5   | `shieldRatio`       | Shield Ratio        | data-accessor | `var(--socket-value)`  | IN `target`(target) → OUT `shield_ratio`(number)                   |
| 6   | `armorRatio`        | Armor Ratio         | data-accessor | `var(--socket-value)`  | IN `target`(target) → OUT `armor_ratio`(number)                    |
| 7   | `getGroupId`        | Get Group ID        | data-accessor | `var(--socket-value)`  | IN `target`(target) → OUT `group_id`(number)                       |
| 8   | `getBehaviour`      | Get Behaviour       | data-accessor | `var(--socket-value)`  | IN `target`(target) → OUT `behaviour`(number)                      |
| 9   | `isAggressor`       | Is Aggressor        | data-accessor | `var(--socket-signal)` | IN `target`(target) → OUT `is_aggressor`(boolean)                  |
| 10  | `getPriorityWeight` | Get Priority Weight | data-accessor | `var(--socket-value)`  | IN `target`(target) → OUT `weight`(number)                         |

### Scoring Modifier Nodes (sub-category of data-accessor)

| #   | type               | label              | category      | color                 | sockets                                                                                                                       |
| --- | ------------------ | ------------------ | ------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 11  | `behaviourBonus`   | Behaviour Bonus    | data-accessor | `var(--socket-value)` | IN `behaviour`(number), IN `weight_in`(number) → OUT `weight_out`(number)                                                     |
| 12  | `aggressorBonus`   | Aggressor Bonus    | data-accessor | `var(--socket-value)` | IN `is_aggressor`(boolean), IN `weight_in`(number) → OUT `weight_out`(number)                                                 |
| 13  | `damageBonus`      | Damage Bonus       | data-accessor | `var(--socket-value)` | IN `hp_ratio`(number), IN `shield_ratio`(number), IN `armor_ratio`(number), IN `weight_in`(number) → OUT `weight_out`(number) |
| 14  | `sizeTierBonus`    | Size Tier Bonus    | data-accessor | `var(--socket-value)` | IN `group_id`(number), IN `weight_in`(number) → OUT `weight_out`(number)                                                      |
| 15  | `groupBonusLookup` | Group Bonus Lookup | data-accessor | `var(--socket-value)` | IN `group_id`(number), IN `config`(list), IN `weight_in`(number) → OUT `weight_out`(number)                                   |
| 16  | `threatBonus`      | Threat Bonus       | data-accessor | `var(--socket-value)` | IN `tribe`(tribe), IN `config`(list), IN `weight_in`(number) → OUT `weight_out`(number)                                       |
| 17  | `historyPenalty`   | History Penalty    | data-accessor | `var(--socket-value)` | IN `target`(target), IN `config`(list), IN `weight_in`(number) → OUT `weight_out`(number)                                     |

### Logic Gate Nodes

| #   | type                   | label                  | category   | color                  | sockets                                                                                         |
| --- | ---------------------- | ---------------------- | ---------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| 18  | `excludeOwner`         | Exclude Owner          | logic-gate | `var(--socket-signal)` | IN `target`(target) → OUT `include`(boolean)                                                    |
| 19  | `excludeSameTribe`     | Exclude Same Tribe     | logic-gate | `var(--socket-signal)` | IN `tribe`(tribe), IN `owner_tribe`(tribe), IN `is_aggressor`(boolean) → OUT `include`(boolean) |
| 20  | `excludeStoppedAttack` | Exclude Stopped Attack | logic-gate | `var(--socket-signal)` | IN `behaviour`(number) → OUT `include`(boolean)                                                 |
| 21  | `excludeNpc`           | Exclude NPC            | logic-gate | `var(--socket-signal)` | IN `target`(target) → OUT `include`(boolean)                                                    |
| 22  | `isInList`             | Is In List             | logic-gate | `var(--socket-signal)` | IN `input_item`(any), IN `input_list`(list) → OUT `yes`(boolean), OUT `no`(boolean)             |
| 23  | `countAggressors`      | Count Aggressors       | logic-gate | `var(--socket-signal)` | IN `candidates`(list) → OUT `count`(number), OUT `is_raid`(boolean)                             |

### Data Source Nodes

| #   | type                  | label                 | category    | color                  | sockets                   |
| --- | --------------------- | --------------------- | ----------- | ---------------------- | ------------------------- |
| 24  | `groupBonusConfig`    | Group Bonus Config    | data-source | `var(--socket-vector)` | OUT `config`(list)        |
| 25  | `roundRobinConfig`    | Round Robin Config    | data-source | `var(--socket-vector)` | OUT `config`(list)        |
| 26  | `threatLedgerConfig`  | Threat Ledger Config  | data-source | `var(--socket-vector)` | OUT `config`(list)        |
| 27  | `typeBlocklistConfig` | Type Blocklist Config | data-source | `var(--socket-vector)` | OUT `blocked_types`(list) |
| 28  | `listOfTribe`         | List of Tribe         | data-source | `var(--socket-vector)` | OUT `items`(list)         |

### Action Nodes

| #   | type         | label        | category | color                  | sockets                                                                                                                      |
| --- | ------------ | ------------ | -------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 29  | `addToQueue` | Add to Queue | action   | `var(--socket-vector)` | IN `priority_in`(priority), IN `predicate`(boolean), IN `target`(target), IN `weight`(number) → OUT `priority_out`(priority) |

## Relationships

```text
EventTrigger ──target──→ DataAccessor ──field──→ ScoringModifier ──weight──→ AddToQueue
                │                                      ↑
                └──target──→ LogicGate ──include──→ AddToQueue (predicate)
                                                       ↑
DataSource ──config──→ ScoringModifier (config-dependent modifiers)
```

## State Transitions

No state machines. All entities are immutable static definitions. Runtime state is managed by React Flow's `useNodesState` / `useEdgesState` hooks — this feature does not change that.

## Validation Rules

- Node `type` must be unique across all definitions
- Socket `id` must be unique within its parent node
- Socket `type` must be a member of `SocketType`
- Socket `direction` must be `input` or `output`
- Socket `position` must be `left` (inputs) or `right` (outputs), except `input_list` on `isInList` which uses `top`
- Node `category` must be a member of `NodeCategory`
- Node `color` must reference an existing CSS custom property
