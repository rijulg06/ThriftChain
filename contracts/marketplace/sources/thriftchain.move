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

    /// Global state for the marketplace
    public struct Marketplace has key {
        id: UID,
        items: Table<ID, ThriftItem>,
        item_counter: u64,
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

    // ===== INITIALIZATION =====

    /// Initialize the marketplace module
    fun init(ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            items: table::new(ctx),
            item_counter: 0,
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
}
