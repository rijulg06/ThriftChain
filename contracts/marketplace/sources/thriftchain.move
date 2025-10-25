module thriftchain::thriftchain {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use sui::table::{Self, Table};

    // ===== STRUCTS =====

    /// Main item struct representing a thrift item for sale
    public struct ThriftItem has key, store {
        id: UID,
        title: String,
        description: String,
        price: u64, // Price in MIST (1 SUI = 1,000,000,000 MIST)
        category: String,
        tags: vector<String>,
        walrus_image_ids: vector<String>, // Blob IDs from Walrus storage
        seller: address,
        created_at: u64, // Unix timestamp
        status: u8, // 0: Active, 1: Sold, 2: Cancelled
        condition: String, // e.g., "Excellent", "Good", "Fair"
        brand: String,
        size: String,
        color: String,
        material: String,
    }

    /// Capability for managing items (only marketplace admin can create items)
    public struct ItemCap has key {
        id: UID,
    }

    /// Offer struct for item negotiations
    public struct Offer has key, store {
        id: UID,
        item_id: ID,
        buyer: address,
        seller: address,
        amount: u64,
        message: String,
        status: u8, // 0: Pending, 1: Countered, 2: Accepted, 3: Rejected, 4: Cancelled
        expires_at: u64, // Unix timestamp
        is_counter: bool, // true if this is a counter offer
        created_at: u64,
    }

    /// Escrow struct for secure transactions
    public struct Escrow has key, store {
        id: UID,
        buyer: address,
        seller: address,
        item_id: ID,
        amount: u64,
        status: u8, // 0: Active, 1: Completed, 2: Disputed, 3: Refunded
        created_at: u64,
        completed_at: u64,
    }

    /// Global state for the marketplace
    public struct Marketplace has key {
        id: UID,
        items: Table<ID, ThriftItem>,
        offers: Table<ID, Offer>,
        escrows: Table<ID, Escrow>,
        item_counter: u64,
        offer_counter: u64,
        escrow_counter: u64,
    }

    // ===== EVENTS =====

    /// Emitted when a new item is created
    public struct ItemCreated has copy, drop {
        item_id: ID,
        seller: address,
        title: String,
        price: u64,
        category: String,
        created_at: u64,
    }

    /// Emitted when an item's price is updated
    public struct ItemPriceUpdated has copy, drop {
        item_id: ID,
        old_price: u64,
        new_price: u64,
        updated_at: u64,
    }

    /// Emitted when an item is cancelled
    public struct ItemCancelled has copy, drop {
        item_id: ID,
        seller: address,
        cancelled_at: u64,
    }

    /// Emitted when an item is marked as sold
    public struct ItemMarkedAsSold has copy, drop {
        item_id: ID,
        seller: address,
        sold_at: u64,
    }

    /// Emitted when a new offer is created
    public struct OfferCreated has copy, drop {
        offer_id: ID,
        item_id: ID,
        buyer: address,
        seller: address,
        amount: u64,
        message: String,
        created_at: u64,
    }

    /// Emitted when an offer is countered
    public struct OfferCountered has copy, drop {
        offer_id: ID,
        item_id: ID,
        buyer: address,
        seller: address,
        counter_amount: u64,
        counter_message: String,
        countered_at: u64,
    }

    /// Emitted when an offer is cancelled
    public struct OfferCancelled has copy, drop {
        offer_id: ID,
        item_id: ID,
        buyer: address,
        cancelled_at: u64,
    }

    /// Emitted when an offer is rejected
    public struct OfferRejected has copy, drop {
        offer_id: ID,
        item_id: ID,
        buyer: address,
        seller: address,
        rejected_at: u64,
    }

    /// Emitted when an offer is accepted and escrow is created
    public struct OfferAccepted has copy, drop {
        escrow_id: ID,
        offer_id: ID,
        item_id: ID,
        buyer: address,
        seller: address,
        amount: u64,
        accepted_at: u64,
    }

    /// Emitted when an item is sold (escrow completed)
    public struct ItemSold has copy, drop {
        escrow_id: ID,
        item_id: ID,
        buyer: address,
        seller: address,
        amount: u64,
        sold_at: u64,
    }

    /// Emitted when an escrow is disputed
    public struct EscrowDisputed has copy, drop {
        escrow_id: ID,
        item_id: ID,
        buyer: address,
        seller: address,
        disputed_at: u64,
    }

    /// Emitted when an escrow is refunded
    public struct EscrowRefunded has copy, drop {
        escrow_id: ID,
        item_id: ID,
        buyer: address,
        seller: address,
        amount: u64,
        refunded_at: u64,
    }

    // ===== INITIALIZATION =====

    /// Initialize the marketplace module
    fun init(ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            items: table::new(ctx),
            offers: table::new(ctx),
            escrows: table::new(ctx),
            item_counter: 0,
            offer_counter: 0,
            escrow_counter: 0,
        };

        // Create and transfer the marketplace object
        transfer::share_object(marketplace);

        // Create and transfer the ItemCap to the deployer
        let item_cap = ItemCap {
            id: object::new(ctx),
        };
        transfer::transfer(item_cap, tx_context::sender(ctx));
    }

    // ===== ITEM CREATION =====

    /// Create a new thrift item (requires ItemCap)
    public entry fun create_item(
        marketplace: &mut Marketplace,
        cap: &ItemCap,
        title: String,
        description: String,
        price: u64,
        category: String,
        tags: vector<String>,
        walrus_image_ids: vector<String>,
        condition: String,
        brand: String,
        size: String,
        color: String,
        material: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Validate inputs
        assert!(price > 0, 0); // Price must be positive
        assert!(string::length(&title) > 0, 1); // Title cannot be empty
        assert!(string::length(&description) > 0, 2); // Description cannot be empty

        // Get current timestamp
        let current_time = clock::timestamp_ms(clock);

        // Create the item
        let item = ThriftItem {
            id: object::new(ctx),
            title,
            description,
            price,
            category,
            tags,
            walrus_image_ids,
            seller: tx_context::sender(ctx),
            created_at: current_time,
            status: 0, // Active
            condition,
            brand,
            size,
            color,
            material,
        };

        // Add to marketplace
        let item_id = object::id(&item);
        table::add(&mut marketplace.items, item_id, item);
        marketplace.item_counter = marketplace.item_counter + 1;

        // Emit event
        event::emit(ItemCreated {
            item_id,
            seller: tx_context::sender(ctx),
            title,
            price,
            category,
            created_at: current_time,
        });
    }

    // ===== ITEM MANAGEMENT =====

    /// Update the price of an item (only seller can do this)
    public entry fun update_item_price(
        item: &mut ThriftItem,
        new_price: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Only seller can update price
        assert!(item.seller == tx_context::sender(ctx), 3);
        // Item must be active
        assert!(item.status == 0, 4);
        // New price must be positive
        assert!(new_price > 0, 5);

        let old_price = item.price;
        item.price = new_price;

        // Emit event
        event::emit(ItemPriceUpdated {
            item_id: object::id(item),
            old_price,
            new_price,
            updated_at: clock::timestamp_ms(clock),
        });
    }

    /// Cancel an item listing (only seller can do this)
    public entry fun cancel_item(
        item: &mut ThriftItem,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Only seller can cancel
        assert!(item.seller == tx_context::sender(ctx), 6);
        // Item must be active
        assert!(item.status == 0, 7);

        item.status = 2; // Cancelled

        // Emit event
        event::emit(ItemCancelled {
            item_id: object::id(item),
            seller: item.seller,
            cancelled_at: clock::timestamp_ms(clock),
        });
    }

    /// Mark an item as sold (called by escrow system)
    public entry fun mark_as_sold(
        item: &mut ThriftItem,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Item must be active
        assert!(item.status == 0, 8);

        item.status = 1; // Sold

        // Emit event
        event::emit(ItemMarkedAsSold {
            item_id: object::id(item),
            seller: item.seller,
            sold_at: clock::timestamp_ms(clock),
        });
    }

    // ===== OFFER SYSTEM =====

    /// Create a new offer for an item
    public entry fun create_offer(
        marketplace: &mut Marketplace,
        item: &ThriftItem,
        amount: u64,
        message: String,
        expires_in_hours: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        let seller = item.seller;
        
        // Validate inputs
        assert!(amount > 0, 9); // Amount must be positive
        assert!(buyer != seller, 10); // Cannot make offer on own item
        assert!(item.status == 0, 11); // Item must be active
        assert!(expires_in_hours > 0, 12); // Must have expiration
        assert!(expires_in_hours <= 168, 13); // Max 7 days

        let current_time = clock::timestamp_ms(clock);
        let expires_at = current_time + (expires_in_hours * 3600 * 1000); // Convert hours to milliseconds

        // Create the offer
        let offer = Offer {
            id: object::new(ctx),
            item_id: object::id(item),
            buyer,
            seller,
            amount,
            message,
            status: 0, // Pending
            expires_at,
            is_counter: false,
            created_at: current_time,
        };

        // Add to marketplace
        let offer_id = object::id(&offer);
        table::add(&mut marketplace.offers, offer_id, offer);
        marketplace.offer_counter = marketplace.offer_counter + 1;

        // Emit event
        event::emit(OfferCreated {
            offer_id,
            item_id: object::id(item),
            buyer,
            seller,
            amount,
            message,
            created_at: current_time,
        });
    }

    /// Counter an offer with a new price (seller side)
    public entry fun counter_offer(
        marketplace: &mut Marketplace,
        offer: &mut Offer,
        counter_amount: u64,
        counter_message: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let seller = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(offer.seller == seller, 14); // Only seller can counter
        assert!(offer.status == 0, 15); // Offer must be pending
        assert!(counter_amount > 0, 16); // Counter amount must be positive
        assert!(counter_amount != offer.amount, 17); // Counter must be different amount
        assert!(clock::timestamp_ms(clock) < offer.expires_at, 18); // Offer must not be expired

        let current_time = clock::timestamp_ms(clock);

        // Update offer with counter details
        offer.amount = counter_amount;
        offer.message = counter_message;
        offer.status = 1; // Countered
        offer.is_counter = true;

        // Emit event
        event::emit(OfferCountered {
            offer_id: object::id(offer),
            item_id: offer.item_id,
            buyer: offer.buyer,
            seller: offer.seller,
            counter_amount,
            counter_message,
            countered_at: current_time,
        });
    }

    /// Accept a counter offer (buyer side)
    public entry fun accept_counter_offer(
        offer: &mut Offer,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(offer.buyer == buyer, 19); // Only buyer can accept counter
        assert!(offer.status == 1, 20); // Offer must be countered
        assert!(offer.is_counter, 21); // Must be a counter offer
        assert!(clock::timestamp_ms(clock) < offer.expires_at, 22); // Offer must not be expired

        // Mark offer as accepted
        offer.status = 2; // Accepted

        // Note: The actual escrow creation and fund transfer will be handled
        // by the accept_offer function in the escrow system
    }

    /// Cancel an offer (buyer side)
    public entry fun cancel_offer(
        offer: &mut Offer,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(offer.buyer == buyer, 23); // Only buyer can cancel
        assert!(offer.status == 0 || offer.status == 1, 24); // Offer must be pending or countered
        assert!(clock::timestamp_ms(clock) < offer.expires_at, 25); // Offer must not be expired

        let current_time = clock::timestamp_ms(clock);

        // Mark offer as cancelled
        offer.status = 4; // Cancelled

        // Emit event
        event::emit(OfferCancelled {
            offer_id: object::id(offer),
            item_id: offer.item_id,
            buyer: offer.buyer,
            cancelled_at: current_time,
        });
    }

    /// Reject an offer (seller side)
    public entry fun reject_offer(
        offer: &mut Offer,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let seller = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(offer.seller == seller, 26); // Only seller can reject
        assert!(offer.status == 0, 27); // Offer must be pending
        assert!(clock::timestamp_ms(clock) < offer.expires_at, 28); // Offer must not be expired

        let current_time = clock::timestamp_ms(clock);

        // Mark offer as rejected
        offer.status = 3; // Rejected

        // Emit event
        event::emit(OfferRejected {
            offer_id: object::id(offer),
            item_id: offer.item_id,
            buyer: offer.buyer,
            seller: offer.seller,
            rejected_at: current_time,
        });
    }

    // ===== ESCROW SYSTEM =====

    /// Accept an offer and create escrow (seller side)
    public entry fun accept_offer(
        marketplace: &mut Marketplace,
        offer: &mut Offer,
        item: &mut ThriftItem,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let seller = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(offer.seller == seller, 29); // Only seller can accept
        assert!(offer.status == 0 || offer.status == 1, 30); // Offer must be pending or countered
        assert!(item.status == 0, 31); // Item must be active
        assert!(clock::timestamp_ms(clock) < offer.expires_at, 32); // Offer must not be expired

        let current_time = clock::timestamp_ms(clock);

        // Create escrow
        let escrow = Escrow {
            id: object::new(ctx),
            buyer: offer.buyer,
            seller: offer.seller,
            item_id: offer.item_id,
            amount: offer.amount,
            status: 0, // Active
            created_at: current_time,
            completed_at: 0,
        };

        // Add to marketplace
        let escrow_id = object::id(&escrow);
        table::add(&mut marketplace.escrows, escrow_id, escrow);
        marketplace.escrow_counter = marketplace.escrow_counter + 1;

        // Mark offer as accepted
        offer.status = 2; // Accepted

        // Emit events
        event::emit(OfferAccepted {
            escrow_id,
            offer_id: object::id(offer),
            item_id: offer.item_id,
            buyer: offer.buyer,
            seller: offer.seller,
            amount: offer.amount,
            accepted_at: current_time,
        });
    }

    /// Confirm delivery and complete escrow (buyer side)
    public entry fun confirm_delivery(
        marketplace: &mut Marketplace,
        escrow: &mut Escrow,
        item: &mut ThriftItem,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(escrow.buyer == buyer, 33); // Only buyer can confirm
        assert!(escrow.status == 0, 34); // Escrow must be active
        assert!(item.status == 0, 35); // Item must be active

        let current_time = clock::timestamp_ms(clock);

        // Mark escrow as completed
        escrow.status = 1; // Completed
        escrow.completed_at = current_time;

        // Mark item as sold
        item.status = 1; // Sold

        // Emit events
        event::emit(ItemSold {
            escrow_id: object::id(escrow),
            item_id: escrow.item_id,
            buyer: escrow.buyer,
            seller: escrow.seller,
            amount: escrow.amount,
            sold_at: current_time,
        });

        // Note: In a real implementation, this would also transfer the item NFT
        // and handle the SUI payment. For this MVP, we're focusing on the
        // state management and event emission.
    }

    /// Dispute an escrow (buyer side)
    public entry fun dispute_escrow(
        escrow: &mut Escrow,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(escrow.buyer == buyer, 36); // Only buyer can dispute
        assert!(escrow.status == 0, 37); // Escrow must be active

        let current_time = clock::timestamp_ms(clock);

        // Mark escrow as disputed
        escrow.status = 2; // Disputed

        // Emit event
        event::emit(EscrowDisputed {
            escrow_id: object::id(escrow),
            item_id: escrow.item_id,
            buyer: escrow.buyer,
            seller: escrow.seller,
            disputed_at: current_time,
        });
    }

    /// Refund an escrow (seller or admin side)
    public entry fun refund_escrow(
        escrow: &mut Escrow,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let caller = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(escrow.seller == caller, 38); // Only seller can refund (or admin in future)
        assert!(escrow.status == 2, 39); // Escrow must be disputed

        let current_time = clock::timestamp_ms(clock);

        // Mark escrow as refunded
        escrow.status = 3; // Refunded
        escrow.completed_at = current_time;

        // Emit event
        event::emit(EscrowRefunded {
            escrow_id: object::id(escrow),
            item_id: escrow.item_id,
            buyer: escrow.buyer,
            seller: escrow.seller,
            amount: escrow.amount,
            refunded_at: current_time,
        });
    }

     // ===== VIEW FUNCTIONS =====

    /// Get item details
    public fun get_item_details(item: &ThriftItem): (String, String, u64, String, address, u8) {
        (
            item.title,
            item.description,
            item.price,
            item.category,
            item.seller,
            item.status
        )
    }

    /// Get item images
    public fun get_item_images(item: &ThriftItem): vector<String> {
        item.walrus_image_ids
    }

    /// Get item metadata
    public fun get_item_metadata(item: &ThriftItem): (String, String, String, String, String, vector<String>) {
        (
            item.condition,
            item.brand,
            item.size,
            item.color,
            item.material,
            item.tags
        )
    }

    /// Check if item is active
    public fun is_active(item: &ThriftItem): bool {
        item.status == 0
    }

    /// Check if item is sold
    public fun is_sold(item: &ThriftItem): bool {
        item.status == 1
    }

    /// Check if item is cancelled
    public fun is_cancelled(item: &ThriftItem): bool {
        item.status == 2
    }

    // ===== TESTING FUNCTIONS =====

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext): Marketplace {
        let marketplace = Marketplace {
            id: object::new(ctx),
            items: table::new(ctx),
            offers: table::new(ctx),
            escrows: table::new(ctx),
            item_counter: 0,
            offer_counter: 0,
            escrow_counter: 0,
        };
        marketplace
    }

    // ===== EVENT GETTERS FOR TESTING =====

    #[test_only]
    public fun get_offer_created_buyer(event: &OfferCreated): address {
        event.buyer
    }

    #[test_only]
    public fun get_offer_created_amount(event: &OfferCreated): u64 {
        event.amount
    }

    #[test_only]
    public fun get_offer_countered_amount(event: &OfferCountered): u64 {
        event.counter_amount
    }

    #[test_only]
    public fun get_offer_countered_seller(event: &OfferCountered): address {
        event.seller
    }

    #[test_only]
    public fun get_offer_cancelled_buyer(event: &OfferCancelled): address {
        event.buyer
    }

    #[test_only]
    public fun get_offer_rejected_seller(event: &OfferRejected): address {
        event.seller
    }

    #[test_only]
    public fun get_offer_rejected_buyer(event: &OfferRejected): address {
        event.buyer
    }

    #[test_only]
    public fun get_offer_accepted_escrow_id(event: &OfferAccepted): ID {
        event.escrow_id
    }

    #[test_only]
    public fun get_offer_accepted_amount(event: &OfferAccepted): u64 {
        event.amount
    }

    #[test_only]
    public fun get_item_sold_escrow_id(event: &ItemSold): ID {
        event.escrow_id
    }

    #[test_only]
    public fun get_item_sold_amount(event: &ItemSold): u64 {
        event.amount
    }

    #[test_only]
    public fun get_escrow_disputed_escrow_id(event: &EscrowDisputed): ID {
        event.escrow_id
    }

    #[test_only]
    public fun get_escrow_refunded_escrow_id(event: &EscrowRefunded): ID {
        event.escrow_id
    }

    #[test_only]
    public fun get_escrow_refunded_amount(event: &EscrowRefunded): u64 {
        event.amount
    }
}
