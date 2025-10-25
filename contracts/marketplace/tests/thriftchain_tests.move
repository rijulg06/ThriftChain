// Copyright (c) ThriftChain Team
// SPDX-License-Identifier: MIT

#[test_only]
module thriftchain::thriftchain_tests {
    use std::string;
    use sui::test_scenario;
    use sui::clock;

    const TEST_ADDR: address = @0x1;

    #[test]
    fun test_basic_functionality() {
        let mut scenario = test_scenario::begin(TEST_ADDR);
        let ctx = scenario.ctx();
        
        // Test that we can create a basic string
        let test_string = string::utf8(b"Test Item");
        assert!(string::length(&test_string) > 0, 0);
        
        // Test clock functionality
        let mut clock = clock::create_for_testing(ctx);
        clock::set_for_testing(&mut clock, 1000);
        assert!(clock::timestamp_ms(&clock) == 1000, 1);
        
        // Cleanup
        clock::destroy_for_testing(clock);
        scenario.end();
    }

    #[test]
    fun test_string_operations() {
        let mut scenario = test_scenario::begin(TEST_ADDR);
        
        // Test string creation and operations
        let title = string::utf8(b"Vintage Jacket");
        let description = string::utf8(b"A beautiful vintage leather jacket");
        
        assert!(string::length(&title) > 0, 3);
        assert!(string::length(&description) > 0, 4);
        
        scenario.end();
    }

    #[test]
    fun test_clock_operations() {
        let mut scenario = test_scenario::begin(TEST_ADDR);
        let ctx = scenario.ctx();
        
        // Test clock creation and manipulation
        let mut clock = clock::create_for_testing(ctx);
        
        // Set initial time
        clock::set_for_testing(&mut clock, 1000);
        assert!(clock::timestamp_ms(&clock) == 1000, 5);
        
        // Increment time
        clock::increment_for_testing(&mut clock, 500);
        assert!(clock::timestamp_ms(&clock) == 1500, 6);
        
        // Cleanup
        clock::destroy_for_testing(clock);
        scenario.end();
    }
}
