module builder_extensions::graph_to_move_scoring {

    public entry fun on_aggression_a_scoring_aggression() {
        // entry point on_aggression_a_scoring_aggression
    }

    public fun execute() {
        let _compiled = true;
        // event trigger aggression
        let aggression_a_scoring_aggression_target: u64 = 101;
        let aggression_a_scoring_aggression_priority: u64 = 80;
        // accessor getPriorityWeight
        // read base priority weight
        let getpriorityweight_b_scoring_get_priority_weight_weight: u64 = 10 + (aggression_a_scoring_aggression_target % 90);
        // accessor isAggressor
        // read aggressor flag
        let isaggressor_c_scoring_is_aggressor_is_aggressor: bool = aggression_a_scoring_aggression_target % 2 == 0;
        // scoring modifier aggressorBonus
        // mutate running candidate weight
        let aggressorbonus_d_scoring_aggressor_bonus_weight_out: u64 = if (isaggressor_c_scoring_is_aggressor_is_aggressor) { getpriorityweight_b_scoring_get_priority_weight_weight + 25 } else { getpriorityweight_b_scoring_get_priority_weight_weight };
        // action addToQueue
        // append candidate to the outgoing priority queue
        let addtoqueue_e_scoring_add_to_queue_priority_out: u64 = if (true) { aggression_a_scoring_aggression_priority + aggressorbonus_d_scoring_aggressor_bonus_weight_out + (aggression_a_scoring_aggression_target % 11) } else { aggression_a_scoring_aggression_priority };
    }
}