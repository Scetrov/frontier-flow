module builder_extensions::starter_contract {
    use std::vector;

    const BEHAVIOUR_STOPPED_ATTACK: u64 = 0;
    const BEHAVIOUR_ENTERED: u64 = 1;
    const BEHAVIOUR_STARTED_ATTACK: u64 = 2;

    const STARTED_ATTACK_BONUS: u64 = 10_000;
    const ENTERED_BONUS: u64 = 1_000;
    const AGGRESSOR_BONUS: u64 = 5_000;
    const PLAYER_TARGET_BONUS: u64 = 1_000;
    const SHIELD_BREAK_BONUS_MULTIPLIER: u64 = 20;
    const ARMOR_BREAK_BONUS_MULTIPLIER: u64 = 10;
    const HULL_BREAK_BONUS_MULTIPLIER: u64 = 5;
    const TIER_WEIGHT: u64 = 3_000;

    const GROUP_CORVETTE: u64 = 31;
    const GROUP_FRIGATE: u64 = 237;
    const GROUP_DESTROYER: u64 = 25;
    const GROUP_CRUISER: u64 = 420;
    const GROUP_BATTLECRUISER: u64 = 26;
    const GROUP_BATTLESHIP: u64 = 419;

    public struct TargetCandidateArg has copy, drop, store {
        item_id: u64,
        character_id: u64,
        character_tribe: u64,
        behaviour_change: u64,
        is_aggressor: bool,
        priority_weight: u64,
        shield_ratio: u64,
        armor_ratio: u64,
        hp_ratio: u64,
        group_id: u64,
    }

    public struct ReturnTargetPriorityList has copy, drop, store {
        item_id: u64,
        weight: u64,
    }

    fun new_return_target_priority_list(item_id: u64, weight: u64): ReturnTargetPriorityList {
        ReturnTargetPriorityList { item_id, weight }
    }

    fun tier_for_group(group_id: u64): u64 {
        if (group_id == GROUP_BATTLESHIP) { 6 }
        else if (group_id == GROUP_BATTLECRUISER) { 5 }
        else if (group_id == GROUP_CRUISER) { 4 }
        else if (group_id == GROUP_DESTROYER) { 3 }
        else if (group_id == GROUP_FRIGATE) { 2 }
        else if (group_id == GROUP_CORVETTE) { 1 }
        else { 1 }
    }

    public fun execute(
        owner_character_id: u64,
        owner_tribe: u64,
        candidates: vector<TargetCandidateArg>,
    ): vector<ReturnTargetPriorityList> {
        build_priority_list_for_owner(owner_character_id, owner_tribe, candidates)
    }

    public fun build_priority_list_for_owner(
        owner_character_id: u64,
        owner_tribe: u64,
        candidates: vector<TargetCandidateArg>,
    ): vector<ReturnTargetPriorityList> {
        let mut return_list = vector::empty<ReturnTargetPriorityList>();
        let candidate_count = vector::length(&candidates);
        let mut index = 0;

        while (index < candidate_count) {
            let candidate = vector::borrow(&candidates, index);
            let (weight, include) = score_candidate(owner_character_id, owner_tribe, candidate);
            if (include) {
                vector::push_back(&mut return_list, new_return_target_priority_list(candidate.item_id, weight));
            };
            index = index + 1;
        };

        return_list
    }

    fun score_candidate(
        owner_character_id: u64,
        owner_tribe: u64,
        candidate: &TargetCandidateArg,
    ): (u64, bool) {
        // event trigger aggression
        // bind the current target candidate into the scoring pipeline
        let aggression_default_aggression_target: &TargetCandidateArg = candidate;
        // accessor getPriorityWeight
        // read base priority weight
        let getpriorityweight_default_get_priority_weight_weight: u64 = aggression_default_aggression_target.priority_weight;
        // accessor getTribe
        // extract tribe and owner tribe
        let gettribe_default_get_tribe_tribe: u64 = aggression_default_aggression_target.character_tribe;
        let gettribe_default_get_tribe_owner_tribe: u64 = owner_tribe;
        // accessor isAggressor
        // read aggressor flag
        let isaggressor_default_is_aggressor_is_aggressor: bool = aggression_default_aggression_target.is_aggressor;
        // logic gate isSameTribe
        // check whether the candidate tribe matches the owner tribe
        let issametribe_default_is_same_tribe_matches: bool = gettribe_default_get_tribe_tribe == gettribe_default_get_tribe_owner_tribe;
        // logic gate booleanNot
        // invert the incoming boolean signal
        let booleannot_default_not_same_tribe_result: bool = !issametribe_default_is_same_tribe_matches;
        // logic gate booleanOr
        // combine two booleans with logical or
        let booleanor_default_include_rule_result: bool = booleannot_default_not_same_tribe_result || isaggressor_default_is_aggressor_is_aggressor;
        // action addToQueue
        // append candidate to the outgoing priority queue
        let addtoqueue_default_add_to_queue_include_result: bool = booleanor_default_include_rule_result;
        let addtoqueue_default_add_to_queue_priority_out: u64 = getpriorityweight_default_get_priority_weight_weight;
        (addtoqueue_default_add_to_queue_priority_out, addtoqueue_default_add_to_queue_include_result)
    }
}