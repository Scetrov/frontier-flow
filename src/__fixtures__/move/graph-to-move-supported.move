module builder_extensions::graph_to_move_supported {
    use std::vector;
    use sui::{bcs, object};
    use world::{
        character::{Self, Character},
        in_game_id,
        turret::{OnlineReceipt, ReturnTargetPriorityList, Turret},
    };
    use world::turret as world_turret;

    const BEHAVIOUR_STOPPED_ATTACK: u8 = 3;
    const BEHAVIOUR_ENTERED: u8 = 1;
    const BEHAVIOUR_STARTED_ATTACK: u8 = 2;

    const STARTED_ATTACK_BONUS: u64 = 10_000;
    const ENTERED_BONUS: u64 = 1_000;
    const AGGRESSOR_BONUS: u64 = 5_000;
    const PLAYER_TARGET_BONUS: u64 = 1_000;
    const SHIELD_BREAK_BONUS_MULTIPLIER: u64 = 20;
    const ARMOR_BREAK_BONUS_MULTIPLIER: u64 = 10;
    const HULL_BREAK_BONUS_MULTIPLIER: u64 = 5;
    const TIER_WEIGHT: u64 = 3_000;

    const GROUP_SHUTTLE: u64 = 31;
    const GROUP_CORVETTE: u64 = 237;
    const GROUP_FRIGATE: u64 = 25;
    const GROUP_DESTROYER: u64 = 420;
    const GROUP_CRUISER: u64 = 26;
    const GROUP_COMBAT_BATTLECRUISER: u64 = 419;

    public struct TargetCandidateArg has copy, drop, store {
        item_id: u64,
        type_id: u64,
        group_id: u64,
        character_id: u32,
        character_tribe: u32,
        hp_ratio: u64,
        shield_ratio: u64,
        armor_ratio: u64,
        is_aggressor: bool,
        priority_weight: u64,
        behaviour_change: u8,
    }

    public struct TurretAuth has drop {}

    fun tier_for_group(group_id: u64): u64 {
        if (group_id == GROUP_COMBAT_BATTLECRUISER) { 6 }
        else if (group_id == GROUP_CRUISER) { 5 }
        else if (group_id == GROUP_DESTROYER) { 4 }
        else if (group_id == GROUP_FRIGATE) { 3 }
        else if (group_id == GROUP_CORVETTE) { 2 }
        else if (group_id == GROUP_SHUTTLE) { 1 }
        else { 1 }
    }

    public fun get_target_priority_list(
        turret: &Turret,
        owner_character: &Character,
        target_candidate_list: vector<u8>,
        receipt: OnlineReceipt,
    ): vector<u8> {
        assert!(receipt.turret_id() == object::id(turret), 0);
        let owner_character_id = in_game_id::item_id(&character::key(owner_character)) as u32;
        let return_list = build_priority_list_for_owner(
            owner_character_id,
            character::tribe(owner_character),
            target_candidate_list,
        );
        world_turret::destroy_online_receipt(receipt, TurretAuth {});
        bcs::to_bytes(&return_list)
    }

    public(package) fun build_priority_list_for_owner(
        owner_character_id: u32,
        owner_tribe: u32,
        target_candidate_list: vector<u8>,
    ): vector<ReturnTargetPriorityList> {
        let candidates = unpack_candidate_list(target_candidate_list);
        let mut return_list = vector::empty<ReturnTargetPriorityList>();
        let candidate_count = vector::length(&candidates);
        let mut index = 0u64;

        while (index < candidate_count) {
            let candidate = vector::borrow(&candidates, index);
            let (weight, include) = score_candidate(owner_character_id, owner_tribe, candidate);
            if (include) {
                vector::push_back(&mut return_list, world_turret::new_return_target_priority_list(candidate.item_id, weight));
            };
            index = index + 1;
        };

        return_list
    }

    fun score_candidate(
        owner_character_id: u32,
        owner_tribe: u32,
        candidate: &TargetCandidateArg,
    ): (u64, bool) {
        // event trigger aggression
        // bind the current target candidate into the scoring pipeline
        let aggression_supported_aggression_priority: u64 = candidate.priority_weight;
        // action addToQueue
        // append candidate to the outgoing priority queue
        let addtoqueue_supported_add_to_queue_include_result: bool = true;
        let addtoqueue_supported_add_to_queue_priority_out: u64 = aggression_supported_aggression_priority;
        (addtoqueue_supported_add_to_queue_priority_out, addtoqueue_supported_add_to_queue_include_result)
    }

    fun unpack_candidate_list(candidate_list_bytes: vector<u8>): vector<TargetCandidateArg> {
        if (vector::length(&candidate_list_bytes) == 0) {
            return vector::empty()
        };
        let mut bcs_data = bcs::new(candidate_list_bytes);
        bcs_data.peel_vec!(|candidate_bcs| peel_target_candidate_from_bcs(candidate_bcs))
    }

    fun peel_target_candidate_from_bcs(bcs_data: &mut bcs::BCS): TargetCandidateArg {
        let item_id = bcs_data.peel_u64();
        let type_id = bcs_data.peel_u64();
        let group_id = bcs_data.peel_u64();
        let character_id = bcs_data.peel_u32();
        let character_tribe = bcs_data.peel_u32();
        let hp_ratio = bcs_data.peel_u64();
        let shield_ratio = bcs_data.peel_u64();
        let armor_ratio = bcs_data.peel_u64();
        let is_aggressor = bcs_data.peel_bool();
        let priority_weight = bcs_data.peel_u64();
        let behaviour_change = bcs_data.peel_u8();
        TargetCandidateArg {
            item_id,
            type_id,
            group_id,
            character_id,
            character_tribe,
            hp_ratio,
            shield_ratio,
            armor_ratio,
            is_aggressor,
            priority_weight,
            behaviour_change,
        }
    }
}