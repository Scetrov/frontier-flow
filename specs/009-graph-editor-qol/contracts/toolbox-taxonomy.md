# Toolbox Taxonomy Contract

## Purpose

Defines the top-level accordion taxonomy that the toolbox must expose after the QoL reorganization.

## Top-Level Categories

The toolbox must expose exactly these top-level categories:

1. `Event Trigger`
2. `Static Data`
3. `Data Extractor`
4. `Logic`
5. `Action`

## Taxonomy Rules

- The accordion interaction model remains unchanged.
- `Event Trigger`, `Logic`, and `Action` remain top-level categories.
- The previous `Data Accessor` top-level category is removed from the visible UI.
- All nodes previously grouped under `Data Accessor` are reassigned into either `Static Data` or `Data Extractor`.

## Required Category Mapping

### Static Data

- `listTribe`
- `listShip`
- `listCharacter`

### Data Extractor

- `getTribe`
- `hpRatio`
- `shieldRatio`
- `armorRatio`
- `getGroupId`
- `getBehaviour`
- `isAggressor`
- `getPriorityWeight`
- `behaviourBonus`
- `aggressorBonus`
- `damageBonus`
- `sizeTierBonus`

## Ordering Contract

- Data-related categories remain adjacent and appear between `Event Trigger` and `Logic` to preserve the current high-level scanning pattern.
- Category order must remain deterministic for tests and user muscle memory.
