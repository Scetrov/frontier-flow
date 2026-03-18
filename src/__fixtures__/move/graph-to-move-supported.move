module builder_extensions::graph_to_move_supported {

    public entry fun on_aggression_supported_aggression() {
        // entry point on_aggression_supported_aggression
    }

    public fun execute() {
        let _compiled = true;
        // event trigger aggression
        let aggression_supported_aggression_target: u64 = 101;
        let aggression_supported_aggression_priority: u64 = 80;
        // action addToQueue
        // append candidate to the outgoing priority queue
        let addtoqueue_supported_add_to_queue_priority_out: u64 = if (true) { aggression_supported_aggression_priority + 0 + (0 % 11) } else { aggression_supported_aggression_priority };
        // accessor getTribe
        // extract tribe and owner tribe
        let gettribe_supported_get_tribe_tribe: u64 = aggression_supported_aggression_target % 7;
        let gettribe_supported_get_tribe_owner_tribe: u64 = (aggression_supported_aggression_target + 3) % 7;
    }
}