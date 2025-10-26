# Testing Recommendations for ThriftChain

## Current Testing Approach Analysis

### What You're Currently Doing
You're using **Sui CLI + Shell Scripts** for integration testing:
- ✅ Working with real testnet deployments
- ✅ Testing actual blockchain transactions
- ✅ Testing end-to-end user workflows
- ✅ Capturing transaction results and parsing them

### Current Limitations
1. **Slow Test Execution**: Each test requires network calls to testnet
2. **No Isolation**: Tests are interdependent and cannot run in parallel
3. **Setup Complexity**: Requires deployment IDs, testnet access, and manual coordination
4. **Limited Test Scenarios**: Hard to test edge cases and error conditions
5. **No Test Data Mocking**: Must create real objects on-chain for each test
6. **Difficult to Test Multi-Party Interactions**: Coordinating actors is complex

---

## Recommended Approach: Hybrid Testing Strategy

### 1. **Move Unit Tests with test_scenario** (Primary)
**Best for**: Fast, isolated unit testing of contract logic

Move has a built-in testing framework called `test_scenario` that allows you to simulate blockchain state and transactions without deploying to a network.

#### Advantages:
- ✅ **Fast**: Runs in milliseconds, not seconds
- ✅ **Isolated**: Each test is independent
- ✅ **Deterministic**: Same inputs produce same results
- ✅ **Comprehensive**: Easy to test edge cases and errors
- ✅ **Mock Objects**: Can create test objects without going to network
- ✅ **Multi-party Testing**: Can simulate multiple actors in sequence

#### Example Structure:

```move
// sources/thriftchain_test.move
module thriftchain::thriftchain_test;

use thriftchain::thriftchain;
use sui::test_scenario::{Scenario, next_tx, ctx};
use sui::transfer;
use sui::clock::{Clock, timestamp_ms};
use std::string;

const ADMIN: address = @0xA;
const SELLER: address = @0xB;
const BUYER: address = @0xC;

#[test]
fun test_create_item_success() {
    let mut ts = test_scenario::begin(ADMIN);
    
    // Create marketplace
    ts.next_tx(ADMIN);
    let marketplace = thriftchain::create_marketplace(ctx(&mut ts));
    let item_cap = thriftchain::create_item_cap(ctx(&mut ts));
    
    // Create an item
    ts.next_tx(SELLER);
    let title = string::utf8(b"Test Item");
    let description = string::utf8(b"Test Description");
    let item = thriftchain::create_item(
        marketplace,
        item_cap,
        title,
        description,
        1000,  // price in MIST
        string::utf8(b"Electronics"),
        vector::empty<String>(),
        vector::empty<String>(),
        string::utf8(b"Excellent"),
        string::utf8(b"Brand"),
        string::utf8(b"Large"),
        string::utf8(b"Blue"),
        string::utf8(b"Cotton"),
        ctx(&mut ts)
    );
    
    // Assertions
    assert!(thriftchain::get_price(&item) == 1000, 0);
    assert!(thriftchain::get_seller(&item) == SELLER, 1);
    
    test_scenario::end(ts);
}

#[test]
#[expected_failure(abort_code = 0)] // Your error code for invalid price
fun test_create_item_invalid_price() {
    let mut ts = test_scenario::begin(ADMIN);
    
    ts.next_tx(ADMIN);
    let marketplace = thriftchain::create_marketplace(ctx(&mut ts));
    let item_cap = thriftchain::create_item_cap(ctx(&mut ts));
    
    ts.next_tx(SELLER);
    // This should fail with price = 0
    thriftchain::create_item(
        marketplace,
        item_cap,
        string::utf8(b"Test"),
        string::utf8(b"Test"),
        0,  // Invalid price
        string::utf8(b"Electronics"),
        vector::empty<String>(),
        vector::empty<String>(),
        string::utf8(b"Excellent"),
        string::utf8(b"Brand"),
        string::utf8(b"Large"),
        string::utf8(b"Blue"),
        string::utf8(b"Cotton"),
        ctx(&mut ts)
    );
    
    test_scenario::end(ts);
}

#[test]
fun test_offer_flow() {
    let mut ts = test_scenario::begin(ADMIN);
    
    // Setup: Create marketplace, item, and escrow
    ts.next_tx(ADMIN);
    let marketplace = thriftchain::create_marketplace(ctx(&mut ts));
    let item_cap = thriftchain::create_item_cap(ctx(&mut ts));
    
    ts.next_tx(SELLER);
    let item = thriftchain::create_item(/* ... */, ctx(&mut ts));
    let item_id = object::id(&item);
    
    // Buyer makes an offer
    ts.next_tx(BUYER);
    let payment = coin::mint_for_testing<SUI>(1000, ctx(&mut ts));
    let offer = thriftchain::create_offer(
        marketplace,
        item_id,
        coin::into_balance(payment),
        string::utf8(b"Interested in buying"),
        1680000000, // timestamp
        ctx(&mut ts)
    );
    
    // Assertions about the offer
    // ...
    
    test_scenario::end(ts);
}
```

#### Implementation Steps:

1. **Create `tests/` directory** in your Move package:
   ```bash
   mkdir -p contracts/marketplace/tests
   ```

2. **Create test file**: `contracts/marketplace/tests/thriftchain_tests.move`

3. **Run tests**:
   ```bash
   cd contracts/marketplace
   sui move test
   ```

### 2. **Test Helpers and Test-Only Functions**

Your contract already has some test-only functions. Expand on this:

```move
#[test_only]
public fun create_test_marketplace(ctx: &mut TxContext): Marketplace {
    // Helper to create a marketplace for testing
}

#[test_only]
public fun create_test_item(
    price: u64,
    seller: address,
    ctx: &mut TxContext
): ThriftItem {
    // Helper to create test items with common defaults
}

#[test_only]
public fun get_item_fields_for_testing(item: &ThriftItem): (String, u64, address) {
    // Expose internal fields for testing
}
```

### 3. **Integration Tests (Keep Your Shell Scripts)**

**Use for**: End-to-end validation and demo preparation

Keep your shell scripts for:
- ✅ Pre-deployment validation
- ✅ Demo preparation
- ✅ Cross-client compatibility testing
- ✅ Network-specific edge cases

**But simplify them** by:
1. Having most tests as Move unit tests
2. Using shell scripts only for true integration scenarios
3. Creating a test runner that executes all shell scripts in sequence

### 4. **Property-Based Testing** (Future Enhancement)

For complex state transitions, consider property-based testing to verify invariants hold across many scenarios.

---

## Questions to Ask the Move Team

Here are key questions to help you get the most out of Move testing:

### 1. **Testing Shared Objects**
> "How should I best test contracts that heavily use shared objects (like my Marketplace)? I'm using `test_scenario`, but I'm unclear on best practices for simulating multi-party interactions on shared objects over multiple transactions."

### 2. **Clock and Timestamp Mocking**
> "My contract uses `sui::clock` for timestamps. How do I mock or control time in `test_scenario` to test time-based logic like offer expiration?"

### 3. **Table Testing**
> "I use `sui::table` heavily for storing items/offers/escrows. Are there specific testing patterns for validating table operations, especially for testing lookups, deletions, and iteration?"

### 4. **Error Code Testing**
> "What's the recommended approach for testing that functions abort with the correct error codes? I see `#[expected_failure(abort_code = n)]` but I'm not sure how to match on custom error codes."

### 5. **Mock External Dependencies**
> "My contract interacts with other packages (walrus for blob storage). In tests, should I create minimal mock implementations, or is there a better pattern for testing with external dependencies?"

### 6. **Testing Events**
> "How do I verify that events are emitted with the correct data in `test_scenario`? Can I capture and assert on emitted events?"

### 7. **Testing Transaction Dependencies**
> "When testing multi-step flows (e.g., offer → accept → escrow → delivery), what's the best practice for passing object IDs between simulated transactions in test_scenario?"

### 8. **Gas Testing**
> "Should I be testing for gas consumption patterns in unit tests, or is that only relevant at integration level? How do I detect gas inefficiencies?"

### 9. **Upgrade Testing**
> "For contracts that support upgrades, what testing strategies should I use to verify upgrade safety? Are there specific patterns for testing storage migrations?"

### 10. **Performance Testing**
> "Beyond correctness, what tools does Move/Sui provide for identifying performance bottlenecks in contract code? Should I profile tests?"

---

## Recommended File Structure

```
contracts/marketplace/
├── Move.toml
├── sources/
│   └── thriftchain.move
├── tests/
│   ├── thriftchain_tests.move              # Main test file
│   ├── test_utils.move                     # Test helpers
│   ├── test_listing.move                   # Listing tests
│   ├── test_offers.move                    # Offer tests
│   └── test_escrow.move                    # Escrow tests
└── test/                                    # Integration tests (keep current)
    ├── cases/
    ├── simple_operations.sh
    └── ...
```

---

## Migration Path

1. **Phase 1: Add Unit Tests** (Week 1-2)
   - Create `tests/` directory
   - Write tests for critical paths (listing, offers, escrow)
   - Run `sui move test` after each change

2. **Phase 2: Improve Existing Tests** (Week 2-3)
   - Refactor test-only functions for better reusability
   - Add test helpers for common patterns
   - Increase test coverage to 80%+

3. **Phase 3: Simplify Integration Tests** (Week 3-4)
   - Keep only essential integration tests
   - Automate test script execution
   - Use integration tests for E2E validation

4. **Phase 4: Add Advanced Testing** (Ongoing)
   - Property-based testing for invariants
   - Gas profiling
   - Upgrade testing

---

## Resources

### Official Documentation
- **Move Book**: `docs/move-book/` in your workspace
- **Sui Examples**: `docs/sui/examples/trading/` has excellent test examples
- **Sui Docs**: `docs/sui/docs/` for framework documentation

### Key Files to Review
1. `docs/sui/examples/trading/contracts/escrow/sources/shared.move` - Comprehensive test examples
2. `docs/sui/examples/vesting/tests/` - Multiple test pattern examples
3. Your existing `thriftchain.move` already has test-only functions - use them!

---

## Conclusion

**Your current shell script approach is valid but should be supplemental to Move unit tests, not the primary testing method.**

**Priority Actions:**
1. ✅ Implement `test_scenario`-based unit tests
2. ✅ Target 80%+ coverage for core business logic
3. ✅ Keep integration tests for E2E validation
4. ✅ Reach out to Move team with the questions above

**Expected Benefits:**
- 10-100x faster test execution
- More comprehensive test coverage
- Easier debugging
- Faster development iteration
- Better code quality

---

*Generated: 2024*
