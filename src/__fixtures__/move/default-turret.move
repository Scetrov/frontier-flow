module builder_extensions::starter_contract {

    public entry fun on_aggression_default_aggression() {
        // entry point on_aggression_default_aggression
    }

    public fun execute() {
        let _compiled = true;
        // event trigger aggression
        let aggression_default_aggression_target: u64 = 101;
        let aggression_default_aggression_priority: u64 = 80;
        // accessor getPriorityWeight
        // read base priority weight
        let getpriorityweight_default_get_priority_weight_weight: u64 = 10 + (aggression_default_aggression_target % 90);
        // accessor getTribe
        // extract tribe and owner tribe
        let gettribe_default_get_tribe_tribe: u64 = aggression_default_aggression_target % 7;
        let gettribe_default_get_tribe_owner_tribe: u64 = (aggression_default_aggression_target + 3) % 7;
        // accessor isAggressor
        // read aggressor flag
        let isaggressor_default_is_aggressor_is_aggressor: bool = aggression_default_aggression_target % 2 == 0;
        // logic gate excludeSameTribe
        // exclude same-tribe non-aggressors
        let excludesametribe_default_exclude_same_tribe_include: bool = gettribe_default_get_tribe_tribe != gettribe_default_get_tribe_owner_tribe || isaggressor_default_is_aggressor_is_aggressor;
        // action addToQueue
        // append candidate to the outgoing priority queue
        let addtoqueue_default_add_to_queue_priority_out: u64 = if (excludesametribe_default_exclude_same_tribe_include) { aggression_default_aggression_priority + getpriorityweight_default_get_priority_weight_weight + (aggression_default_aggression_target % 11) } else { aggression_default_aggression_priority };
    }
}