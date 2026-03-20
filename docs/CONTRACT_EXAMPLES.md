# Contract Examples

This document consolidates the example turret contracts in this repository so FrontierFlow can treat them as seed strategies.

All examples follow the same deployment model:

- template-compatible public entrypoint shape
- hard-coded compile-time configuration in Move source
- no owner-managed runtime configuration objects
- behavior derived entirely from the current target candidate list

## How To Use This Catalog

For FrontierFlow, each seed should be treated as:

1. a stable targeting pattern
2. a set of compile-time knobs that can be rewritten during generation
3. a reference implementation with tests that describe expected behavior

If FrontierFlow generates a variant, it should preserve the public targeting entrypoint and update the matching tests whenever generation changes the scoring constants or lookup tables.

## Example Matrix

| Contract                  | Core idea                                             | Best used for                           | Primary generation inputs                               |
| ------------------------- | ----------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| `turret_aggressor_first`  | prioritize current aggressors, then damaged hostiles  | default defensive seed                  | behavior bonuses, damage multipliers                    |
| `turret_group_specialist` | reward specific `group_id` values                     | anti-class or doctrine-specific turrets | group table, per-group bonuses                          |
| `turret_last_stand`       | switch into emergency raid mode at a threshold        | escalation behavior                     | threshold, normal-mode bonuses, raid-mode bonuses       |
| `turret_low_hp_finisher`  | favor targets already close to death                  | focus-fire finisher variants            | damage multiplier, behavior bonuses                     |
| `turret_player_screen`    | ignore NPCs and focus on player pilots                | PVP-biased defenses                     | NPC rule, player bonus, behavior bonuses                |
| `turret_round_robin`      | deterministic modulo sharding instead of real history | multi-turret fire spreading             | bucket count, preferred slots, lane bonus and penalty   |
| `turret_size_priority`    | prefer larger hull classes by `group_id`              | class-based doctrine                    | group-to-tier table, tier weight                        |
| `turret_threat_ledger`    | simulate threat memory from current tribal pressure   | current-call threat heuristics          | tracked tribes, tribe base bonuses, per-aggressor bonus |
| `turret_type_blocklist`   | reject specific `type_id` values outright             | deny-list policies                      | blocked type ids, behavior bonuses                      |

## Contract Details

### `turret_aggressor_first`

Summary:
Aggressive baseline strategy that rewards live aggression first and then adds damage-based bonuses, weighted most heavily toward shield damage.

Selection behavior:

- excludes owner
- excludes stopped-attack candidates
- excludes same-tribe non-aggressors
- adds bonuses for `STARTED_ATTACK`, `ENTERED`, and `is_aggressor`
- adds damage bonuses from shield, armor, and hull percentage loss

Current hard-coded values:

- `STARTED_ATTACK_BONUS = 20_000`
- `AGGRESSOR_BONUS = 5_000`
- `ENTERED_BONUS = 2_000`
- shield multiplier `20`
- armor multiplier `10`
- hull multiplier `5`

Annotated Move excerpt:

```move
const STARTED_ATTACK_BONUS: u64 = 20_000;
const AGGRESSOR_BONUS: u64 = 5_000;
const ENTERED_BONUS: u64 = 2_000;
const SHIELD_BREAK_BONUS_MULTIPLIER: u64 = 20;
const ARMOR_BREAK_BONUS_MULTIPLIER: u64 = 10;
const HULL_BREAK_BONUS_MULTIPLIER: u64 = 5;

fun score_candidate(
  owner_character_id: u32,
  owner_tribe: u32,
  candidate: &TargetCandidateArg,
): (u64, bool) {
  // Drop the owner and any target that has already disengaged.
  if (candidate.character_id == owner_character_id
    || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {
    return (0, false)
  };

  // Same-tribe ships are ignored unless they are active aggressors.
  if (!(candidate.is_aggressor || candidate.character_tribe != owner_tribe)) {
    return (0, false)
  };

  let mut weight = candidate.priority_weight;

  // Behaviour bonuses reward fresh aggression first.
  if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {
    weight = weight + STARTED_ATTACK_BONUS;
  } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {
    weight = weight + ENTERED_BONUS;
  };
  if (candidate.is_aggressor) {
    weight = weight + AGGRESSOR_BONUS;
  };

  // Damage pushes wounded targets higher, with shield loss weighted most heavily.
  weight = weight + ((100 - candidate.shield_ratio) * SHIELD_BREAK_BONUS_MULTIPLIER);
  weight = weight + ((100 - candidate.armor_ratio) * ARMOR_BREAK_BONUS_MULTIPLIER);
  weight = weight + ((100 - candidate.hp_ratio) * HULL_BREAK_BONUS_MULTIPLIER);
  (weight, true)
}
```

Best FrontierFlow customizations:

- tune behavior bonuses per deployment
- rewrite damage multipliers for different weapon doctrine
- optionally change same-tribe aggressor handling

### `turret_group_specialist`

Summary:
Adds a hard-coded specialization table on top of normal hostility scoring.

Selection behavior:

- same eligibility rules as the baseline hostile filter
- adds per-group bonuses from a fixed lookup table
- current seed prefers frigates and destroyers

Current hard-coded values:

- `configured_group_ids = [25, 420]`
- `configured_group_bonuses = [12_000, 8_000]`
- `STARTED_ATTACK_BONUS = 10_000`
- `AGGRESSOR_BONUS = 5_000`
- `ENTERED_BONUS = 1_000`

Annotated Move excerpt:

```move
fun configured_group_ids(): vector<u64> {
  // FrontierFlow can rewrite this table at generation time.
  vector[GROUP_FRIGATE, GROUP_DESTROYER]
}

fun configured_group_bonuses(): vector<u64> {
  vector[12_000u64, 8_000u64]
}

fun score_candidate(
  owner_character_id: u32,
  owner_tribe: u32,
  configured_group_ids: &vector<u64>,
  configured_group_bonuses: &vector<u64>,
  candidate: &TargetCandidateArg,
): (u64, bool) {
  // The base hostility filter stays the same as the simpler seeds.
  if (candidate.character_id == owner_character_id
    || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {
    return (0, false)
  };
  if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {
    return (0, false)
  };

  let mut weight = candidate.priority_weight;
  if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {
    weight = weight + STARTED_ATTACK_BONUS;
  } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {
    weight = weight + ENTERED_BONUS;
  };
  if (candidate.is_aggressor) {
    weight = weight + AGGRESSOR_BONUS;
  };

  // This lookup is the specialization layer unique to this seed.
  weight = weight + lookup_group_bonus(
    configured_group_ids,
    configured_group_bonuses,
    candidate.group_id,
  );
  (weight, true)
}
```

Best FrontierFlow customizations:

- replace the group table with deployment-specific hull priorities
- vary the specialization strength without changing public contract structure

### `turret_last_stand`

Summary:
Mode-switching strategy that becomes much more permissive and lethal when enough aggressors are present.

Selection behavior:

- below threshold: normal hostility filter with modest bonuses
- at or above threshold: owner and stopped-attack exclusions only
- raid mode adds large attack bonuses and a heavy combined-damage bonus

Current hard-coded values:

- `RAID_THRESHOLD = 3`
- normal mode `10_000 / 5_000 / 1_000`
- raid mode `30_000 / 20_000 / 500`
- `RAID_DAMAGE_MULTIPLIER = 150`

Annotated Move excerpt:

```move
const RAID_THRESHOLD: u64 = 3;

public(package) fun build_priority_list_for_owner(
  owner_character_id: u32,
  owner_tribe: u32,
  target_candidate_list: vector<u8>,
): vector<ReturnTargetPriorityList> {
  let candidates = unpack_candidate_list(target_candidate_list);
  // The whole mode switch is derived from the live candidate list.
  let is_raid = count_aggressors(&candidates) >= RAID_THRESHOLD;
  let mut return_list = vector::empty();
  let mut index = 0u64;

  while (index < vector::length(&candidates)) {
    let candidate = vector::borrow(&candidates, index);
    let (weight, include) = if (is_raid) {
      score_raid(owner_character_id, candidate)
    } else {
      score_normal(owner_character_id, owner_tribe, candidate)
    };
    if (include) {
      vector::push_back(
        &mut return_list,
        world_turret::new_return_target_priority_list(candidate.item_id, weight),
      );
    };
    index = index + 1;
  };
  return_list
}

fun score_raid(owner_character_id: u32, candidate: &TargetCandidateArg): (u64, bool) {
  // Raid mode relaxes tribe filtering but still excludes owner and disengaged targets.
  if (candidate.character_id == owner_character_id
    || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {
    return (0, false)
  };

  let mut weight = candidate.priority_weight;
  let total_remaining = candidate.hp_ratio + candidate.shield_ratio + candidate.armor_ratio;
  let damage_taken = if (total_remaining <= 300) { 300 - total_remaining } else { 0 };

  // Raid mode heavily rewards active attackers and already-wounded targets.
  if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {
    weight = weight + RAID_STARTED_ATTACK_BONUS;
  } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {
    weight = weight + RAID_ENTERED_BONUS;
  };
  if (candidate.is_aggressor) {
    weight = weight + RAID_AGGRESSOR_BONUS;
  };
  weight = weight + (damage_taken * RAID_DAMAGE_MULTIPLIER);
  (weight, true)
}
```

Best FrontierFlow customizations:

- different escalation thresholds
- alternate raid-mode inclusion rules
- stronger or weaker focus-fire damage weighting

### `turret_low_hp_finisher`

Summary:
Kill-secure strategy that converts low combined HP, shield, and armor ratios into a strong score bonus.

Selection behavior:

- same hostile eligibility rules as the baseline seeds
- damage bonus is `max(0, 300 - (hp + shield + armor)) * 100`

Current hard-coded values:

- `STARTED_ATTACK_BONUS = 8_000`
- `AGGRESSOR_BONUS = 4_000`
- `ENTERED_BONUS = 1_500`
- `EHP_DAMAGE_MULTIPLIER = 100`

Annotated Move excerpt:

```move
const STARTED_ATTACK_BONUS: u64 = 8_000;
const AGGRESSOR_BONUS: u64 = 4_000;
const ENTERED_BONUS: u64 = 1_500;
const EHP_DAMAGE_MULTIPLIER: u64 = 100;

fun score_candidate(
  owner_character_id: u32,
  owner_tribe: u32,
  candidate: &TargetCandidateArg,
): (u64, bool) {
  // Same base exclusions as the hostile-only seeds.
  if (candidate.character_id == owner_character_id
    || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {
    return (0, false)
  };
  if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {
    return (0, false)
  };

  let mut weight = candidate.priority_weight;
  let remaining_total = candidate.hp_ratio + candidate.shield_ratio + candidate.armor_ratio;
  // Lower combined ratios mean the target is closer to dying.
  let damage_total = if (remaining_total <= 300) { 300 - remaining_total } else { 0 };

  if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {
    weight = weight + STARTED_ATTACK_BONUS;
  } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {
    weight = weight + ENTERED_BONUS;
  };
  if (candidate.is_aggressor) {
    weight = weight + AGGRESSOR_BONUS;
  };

  // This is the finisher bias: damage converts directly into more weight.
  weight = weight + (damage_total * EHP_DAMAGE_MULTIPLIER);
  (weight, true)
}
```

Best FrontierFlow customizations:

- heavier or lighter finisher bias
- alternate weighting for shield, armor, and hull

### `turret_player_screen`

Summary:
PVP-focused filter that ignores NPCs and adds a flat player-targeting bonus.

Selection behavior:

- excludes `character_id == 0`
- excludes owner
- excludes stopped-attack candidates
- excludes same-tribe non-aggressors
- applies a flat player bonus before normal behavior bonuses

Current hard-coded values:

- NPC rule: `character_id == 0`
- `PLAYER_TARGET_BONUS = 1_000`
- `STARTED_ATTACK_BONUS = 15_000`
- `AGGRESSOR_BONUS = 6_000`
- `ENTERED_BONUS = 3_000`

Annotated Move excerpt:

```move
const PLAYER_TARGET_BONUS: u64 = 1_000;

fun score_candidate(
  owner_character_id: u32,
  owner_tribe: u32,
  candidate: &TargetCandidateArg,
): (u64, bool) {
  let character_id = candidate.character_id;
  let is_owner = character_id == owner_character_id;
  let is_npc = character_id == 0;

  // NPCs are filtered before any weighting happens.
  if (is_npc || is_owner || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {
    return (0, false)
  };
  if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {
    return (0, false)
  };

  // Every valid player gets a flat bonus before the normal behaviour scoring.
  let mut weight = candidate.priority_weight + PLAYER_TARGET_BONUS;
  if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {
    weight = weight + STARTED_ATTACK_BONUS;
  } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {
    weight = weight + ENTERED_BONUS;
  };
  if (candidate.is_aggressor) {
    weight = weight + AGGRESSOR_BONUS;
  };
  (weight, true)
}
```

Best FrontierFlow customizations:

- alternate NPC detection rules
- stronger or weaker player bias
- pilot- or tribe-specific follow-on variants

### `turret_round_robin`

Summary:
Stateless approximation of round-robin targeting using deterministic modulo buckets.

Selection behavior:

- normal hostile eligibility rules
- computes `target_slot = item_id % ROTATION_BUCKET_COUNT`
- rewards preferred slots and penalizes non-preferred slots
- clamps non-preferred results to a minimum included weight instead of excluding them

Current hard-coded values:

- `ROTATION_BUCKET_COUNT = 3`
- `preferred_slots = [0]`
- `PREFERRED_SLOT_BONUS = 2_000`
- `NON_PREFERRED_SLOT_PENALTY = 3_000`
- `MIN_INCLUDED_WEIGHT = 1`

Annotated Move excerpt:

```move
fun preferred_slots(): vector<u64> {
  // FrontierFlow can generate sibling variants by rewriting this list.
  vector[0u64]
}

fun score_candidate(
  owner_character_id: u32,
  owner_tribe: u32,
  preferred_slots: &vector<u64>,
  candidate: &TargetCandidateArg,
): (u64, bool) {
  if (candidate.character_id == owner_character_id
    || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {
    return (0, false)
  };
  if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {
    return (0, false)
  };

  let mut weight = candidate.priority_weight;
  let target_slot = candidate.item_id % ROTATION_BUCKET_COUNT;

  // Normal hostility scoring still runs before the lane adjustment.
  if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {
    weight = weight + STARTED_ATTACK_BONUS;
  } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {
    weight = weight + ENTERED_BONUS;
  };
  if (candidate.is_aggressor) {
    weight = weight + AGGRESSOR_BONUS;
  };

  // Preferred modulo slots get a bonus; the rest are penalized but not removed.
  if (vector::contains(preferred_slots, &target_slot)) {
    weight = weight + PREFERRED_SLOT_BONUS;
  } else {
    weight = if (weight > NON_PREFERRED_SLOT_PENALTY) {
      weight - NON_PREFERRED_SLOT_PENALTY
    } else {
      MIN_INCLUDED_WEIGHT
    };
  };
  (weight, true)
}
```

Best FrontierFlow customizations:

- emit several variants with different preferred slots
- change penalty behavior from clamp to exclusion or reduced floor
- adjust bucket count to match battery size

### `turret_size_priority`

Summary:
Hull-size scoring strategy that maps `group_id` into a tier and adds `tier * TIER_WEIGHT`.

Selection behavior:

- normal hostile eligibility rules
- size tier determines an additive hull-class bonus
- active aggression can still outrank size alone

Current hard-coded values:

- tier map:
  - `31 -> 1`
  - `237 -> 2`
  - `25 -> 3`
  - `420 -> 4`
  - `26 -> 5`
  - `419 -> 6`
- `TIER_WEIGHT = 3_000`
- `STARTED_ATTACK_BONUS = 10_000`
- `AGGRESSOR_BONUS = 4_000`
- `ENTERED_BONUS = 1_000`

Annotated Move excerpt:

```move
const TIER_WEIGHT: u64 = 3_000;

fun score_candidate(
  owner_character_id: u32,
  owner_tribe: u32,
  candidate: &TargetCandidateArg,
): (u64, bool) {
  if (candidate.character_id == owner_character_id
    || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {
    return (0, false)
  };
  if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {
    return (0, false)
  };

  let mut weight = candidate.priority_weight;
  let tier = tier_for_group(candidate.group_id);

  if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {
    weight = weight + STARTED_ATTACK_BONUS;
  } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {
    weight = weight + ENTERED_BONUS;
  };
  if (candidate.is_aggressor) {
    weight = weight + AGGRESSOR_BONUS;
  };

  // Hull class contributes a fixed additive bonus through the tier ladder.
  weight = weight + (tier * TIER_WEIGHT);
  (weight, true)
}

fun tier_for_group(group_id: u64): u64 {
  // Unknown groups fall back to tier 1 instead of being excluded.
  if (group_id == GROUP_BATTLECRUISER) { 6 }
  else if (group_id == GROUP_CRUISER) { 5 }
  else if (group_id == GROUP_DESTROYER) { 4 }
  else if (group_id == GROUP_FRIGATE) { 3 }
  else if (group_id == GROUP_CORVETTE) { 2 }
  else { 1 }
}
```

Best FrontierFlow customizations:

- change the tier mapping to match deployment doctrine
- expand the mapping to additional ship classes
- adjust how strongly size competes with aggression

### `turret_threat_ledger`

Summary:
Simulates a threat ledger by giving tracked tribes extra weight derived from current-call aggressor pressure.

Selection behavior:

- normal hostile eligibility rules
- tracked tribes get `base_bonus + aggressor_count_for_tribe * THREAT_PER_ACTIVE_AGGRESSOR`
- untracked tribes get no extra threat bonus

Current hard-coded values:

- `tracked_tribe_ids = [200, 300]`
- `tracked_tribe_base_bonuses = [2_000, 1_000]`
- `THREAT_PER_ACTIVE_AGGRESSOR = 1_500`
- `STARTED_ATTACK_BONUS = 10_000`
- `AGGRESSOR_BONUS = 4_000`
- `ENTERED_BONUS = 1_000`

Annotated Move excerpt:

```move
fun tracked_tribe_ids(): vector<u32> {
  vector[TRACKED_TRIBE_A, TRACKED_TRIBE_B]
}

fun tracked_tribe_base_bonuses(): vector<u64> {
  vector[2_000u64, 1_000u64]
}

fun lookup_tracked_tribe_bonus(
  tracked_tribe_ids: &vector<u32>,
  tracked_tribe_base_bonuses: &vector<u64>,
  candidates: &vector<TargetCandidateArg>,
  tribe_id: u32,
): u64 {
  let mut index = 0u64;
  while (index < vector::length(tracked_tribe_ids)) {
    if (*vector::borrow(tracked_tribe_ids, index) == tribe_id) {
      let base_bonus = *vector::borrow(tracked_tribe_base_bonuses, index);
      let aggressor_count = count_tribe_aggressors(candidates, tribe_id);

      // This is the stateless "ledger": current pressure stands in for stored threat.
      return base_bonus + (aggressor_count * THREAT_PER_ACTIVE_AGGRESSOR)
    };
    index = index + 1;
  };
  0
}

fun score_candidate(...): (u64, bool) {
  // Normal hostility scoring happens first.
  // Then the tracked tribe bonus is layered on top.
  weight = weight + lookup_tracked_tribe_bonus(
    tracked_tribe_ids,
    tracked_tribe_base_bonuses,
    candidates,
    candidate.character_tribe,
  );
  (weight, true)
}
```

Best FrontierFlow customizations:

- change tracked tribes and their baseline hostility
- tune pressure amplification per active aggressor
- use several deployment presets for different regions or enemy sets

### `turret_type_blocklist`

Summary:
Policy seed that rejects exact `type_id` matches before any scoring happens.

Selection behavior:

- normal hostile eligibility rules
- any candidate with a blocked `type_id` is excluded
- all remaining candidates use ordinary behavior bonuses

Current hard-coded values:

- `blocked_type_ids = [31, 237]`
- `STARTED_ATTACK_BONUS = 10_000`
- `AGGRESSOR_BONUS = 5_000`
- `ENTERED_BONUS = 1_000`

Annotated Move excerpt:

```move
fun blocked_type_ids(): vector<u64> {
  // The blocklist is isolated in one helper for easy generation-time replacement.
  vector[BLOCKED_TYPE_ID_A, BLOCKED_TYPE_ID_B]
}

fun score_candidate(
  owner_character_id: u32,
  owner_tribe: u32,
  blocked_type_ids: &vector<u64>,
  candidate: &TargetCandidateArg,
): (u64, bool) {
  if (candidate.character_id == owner_character_id
    || candidate.behaviour_change == BEHAVIOUR_STOPPED_ATTACK) {
    return (0, false)
  };
  if (candidate.character_tribe == owner_tribe && !candidate.is_aggressor) {
    return (0, false)
  };

  // Exact type-id matches are removed before any scoring happens.
  if (vector::contains(blocked_type_ids, &candidate.type_id)) {
    return (0, false)
  };

  let mut weight = candidate.priority_weight;
  if (candidate.behaviour_change == BEHAVIOUR_STARTED_ATTACK) {
    weight = weight + STARTED_ATTACK_BONUS;
  } else if (candidate.behaviour_change == BEHAVIOUR_ENTERED) {
    weight = weight + ENTERED_BONUS;
  };
  if (candidate.is_aggressor) {
    weight = weight + AGGRESSOR_BONUS;
  };
  (weight, true)
}
```

Best FrontierFlow customizations:

- deployment-specific deny lists
- optional allow-list or penalty-list variants derived from the same seed shape

## Recommended FrontierFlow Inputs

Across all examples, the most reusable generation inputs are:

- behavior bonuses for `ENTERED`, `STARTED_ATTACK`, and `is_aggressor`
- fixed lookup tables such as group ids, tribe ids, blocked type ids, and size tiers
- damage multipliers and threshold values
- inclusion and exclusion rules for same-tribe or NPC candidates

## Validation Guidance

After FrontierFlow generates a variant from one of these seeds:

1. update the compile-time constants or helper tables in `sources/turret.move`
2. update any test fixtures whose expected weights depend on those values
3. run `sui move build`
4. run `sui move test`

The local helper mentioned in the repository instructions could not be validated from this shell because `efctl` is not installed here.
