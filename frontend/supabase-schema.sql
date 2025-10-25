-- ThriftChain Minimal Database Schema (AI Search Layer ONLY)
--
-- ARCHITECTURE PRINCIPLE:
-- Supabase is used ONLY for AI-powered search and recommendations.
-- ALL marketplace data (items, offers, transactions) lives on Sui blockchain.
-- This schema contains only vector embeddings and search indexes.
--
-- Run this in Supabase SQL Editor after creating your project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For pgvector support

-- ============================================
-- ITEM SEARCH INDEX (AI-POWERED SEARCH)
-- ============================================
-- This table indexes on-chain items for semantic search
-- It's a READ-OPTIMIZED CACHE that syncs from Sui blockchain

CREATE TABLE IF NOT EXISTS item_search_index (
    -- Primary key is the Sui object ID (source of truth on blockchain)
    sui_object_id TEXT PRIMARY KEY,

    -- Vector embeddings for semantic search
    title_embedding VECTOR(1536),         -- OpenAI embedding dimension
    description_embedding VECTOR(1536),   -- For semantic similarity
    combined_embedding VECTOR(1536),      -- Title + description + tags

    -- Cached fields for fast filtering (synced from blockchain)
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    price_mist BIGINT,                    -- Price in MIST (smallest SUI unit)
    seller_address TEXT,
    status TEXT DEFAULT 'active',         -- active, sold, cancelled

    -- Walrus image references (stored on-chain, cached here)
    walrus_blob_ids TEXT[] DEFAULT '{}',

    -- Metadata for search optimization
    search_rank FLOAT DEFAULT 0.0,        -- Calculated ranking score
    view_count INTEGER DEFAULT 0,         -- Cached from on-chain events

    -- Sync tracking
    last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blockchain_created_at TIMESTAMP WITH TIME ZONE,

    -- Indexes for fast lookups
    CONSTRAINT valid_status CHECK (status IN ('active', 'sold', 'cancelled'))
);

-- Indexes for vector similarity search
CREATE INDEX idx_title_embedding ON item_search_index
    USING ivfflat (title_embedding vector_cosine_ops);

CREATE INDEX idx_description_embedding ON item_search_index
    USING ivfflat (description_embedding vector_cosine_ops);

CREATE INDEX idx_combined_embedding ON item_search_index
    USING ivfflat (combined_embedding vector_cosine_ops);

-- Indexes for filtering
CREATE INDEX idx_item_category ON item_search_index(category);
CREATE INDEX idx_item_status ON item_search_index(status);
CREATE INDEX idx_item_tags ON item_search_index USING GIN(tags);
CREATE INDEX idx_item_price ON item_search_index(price_mist);
CREATE INDEX idx_item_seller ON item_search_index(seller_address);

-- ============================================
-- USER AI PREFERENCES (RECOMMENDATION ENGINE)
-- ============================================
-- Stores user taste profiles for personalized recommendations
-- This is the ONLY user data not on blockchain (privacy preference)

CREATE TABLE IF NOT EXISTS user_ai_preferences (
    wallet_address TEXT PRIMARY KEY,

    -- User taste profile (learned from interactions)
    preference_vector VECTOR(1536),       -- Aggregated preference embedding

    -- Interaction history for collaborative filtering
    viewed_items JSONB DEFAULT '[]'::jsonb,           -- Array of {sui_object_id, timestamp, duration}
    liked_items TEXT[] DEFAULT '{}',                  -- Array of sui_object_ids
    disliked_items TEXT[] DEFAULT '{}',               -- Array of sui_object_ids
    purchased_items TEXT[] DEFAULT '{}',              -- Array of sui_object_ids

    -- Category preferences (learned)
    preferred_categories JSONB DEFAULT '{}'::jsonb,   -- {category: weight}
    preferred_price_range JSONB DEFAULT '{}'::jsonb,  -- {min: number, max: number}

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_interaction_at TIMESTAMP WITH TIME ZONE
);

-- Index for preference vector similarity
CREATE INDEX idx_preference_vector ON user_ai_preferences
    USING ivfflat (preference_vector vector_cosine_ops);

-- ============================================
-- SEARCH CACHE (OPTIONAL - PERFORMANCE)
-- ============================================
-- Temporary cache for frequently searched queries
-- Expires after 1 hour to ensure freshness

CREATE TABLE IF NOT EXISTS search_cache (
    query_hash TEXT PRIMARY KEY,          -- Hash of search query
    query_text TEXT NOT NULL,
    sui_object_ids TEXT[] DEFAULT '{}',   -- Array of matching object IDs
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Index for cleanup of expired cache
CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);

-- ============================================
-- FUNCTIONS FOR VECTOR SEARCH
-- ============================================

-- Function to search items by semantic similarity
CREATE OR REPLACE FUNCTION search_items_by_embedding(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 20,
    filter_category TEXT DEFAULT NULL,
    filter_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
    sui_object_id TEXT,
    title TEXT,
    description TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.sui_object_id,
        i.title,
        i.description,
        1 - (i.combined_embedding <=> query_embedding) AS similarity
    FROM item_search_index i
    WHERE
        (filter_category IS NULL OR i.category = filter_category)
        AND i.status = filter_status
        AND 1 - (i.combined_embedding <=> query_embedding) > match_threshold
    ORDER BY i.combined_embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get recommendations for a user
CREATE OR REPLACE FUNCTION get_user_recommendations(
    user_wallet TEXT,
    recommendation_count INT DEFAULT 10
)
RETURNS TABLE (
    sui_object_id TEXT,
    title TEXT,
    similarity FLOAT
) AS $$
DECLARE
    user_pref_vector VECTOR(1536);
BEGIN
    -- Get user's preference vector
    SELECT preference_vector INTO user_pref_vector
    FROM user_ai_preferences
    WHERE wallet_address = user_wallet;

    -- If user has no preferences yet, return trending items
    IF user_pref_vector IS NULL THEN
        RETURN QUERY
        SELECT
            i.sui_object_id,
            i.title,
            0.0 AS similarity
        FROM item_search_index i
        WHERE i.status = 'active'
        ORDER BY i.view_count DESC, i.last_indexed_at DESC
        LIMIT recommendation_count;
    ELSE
        -- Return items similar to user preferences
        RETURN QUERY
        SELECT
            i.sui_object_id,
            i.title,
            1 - (i.combined_embedding <=> user_pref_vector) AS similarity
        FROM item_search_index i
        WHERE
            i.status = 'active'
            -- Exclude items user already interacted with
            AND i.sui_object_id NOT IN (
                SELECT unnest(viewed_items::text[]) FROM user_ai_preferences WHERE wallet_address = user_wallet
            )
        ORDER BY i.combined_embedding <=> user_pref_vector
        LIMIT recommendation_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_ai_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-cleanup expired search cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM search_cache WHERE expires_at < NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE item_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Item search index: Public read access (it's a search index)
CREATE POLICY "Item search index is viewable by everyone"
    ON item_search_index FOR SELECT USING (true);

-- Only backend services can insert/update search index
CREATE POLICY "Only service role can modify search index"
    ON item_search_index FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- User preferences: Users can only see/modify their own
CREATE POLICY "Users can view their own preferences"
    ON user_ai_preferences FOR SELECT
    USING (auth.jwt() ->> 'wallet_address' = wallet_address);

CREATE POLICY "Users can update their own preferences"
    ON user_ai_preferences FOR UPDATE
    USING (auth.jwt() ->> 'wallet_address' = wallet_address);

CREATE POLICY "Users can insert their own preferences"
    ON user_ai_preferences FOR INSERT
    WITH CHECK (auth.jwt() ->> 'wallet_address' = wallet_address);

-- Search cache: Public read access
CREATE POLICY "Search cache is viewable by everyone"
    ON search_cache FOR SELECT USING (true);

CREATE POLICY "Anyone can insert to search cache"
    ON search_cache FOR INSERT WITH CHECK (true);

-- ============================================
-- NOTES FOR DEVELOPERS
-- ============================================
--
-- IMPORTANT REMINDERS:
--
-- 1. SOURCE OF TRUTH: Sui blockchain stores all marketplace data
--    - This database is a CACHE for search performance only
--    - Always verify data by reading from Sui when displaying details
--
-- 2. INDEXING FLOW:
--    - User mints item NFT on Sui → Event emitted
--    - Backend listens to events → Generates embeddings
--    - Inserts into item_search_index for searchability
--
-- 3. SEARCH FLOW:
--    - User searches → Generate query embedding
--    - Query item_search_index → Get sui_object_ids
--    - Fetch full item data from Sui blockchain
--
-- 4. VECTOR DIMENSIONS:
--    - Using 1536 dimensions (OpenAI text-embedding-ada-002)
--    - Change this if using different embedding model
--
-- 5. PERFORMANCE:
--    - IVFFlat indexes require periodic VACUUM and ANALYZE
--    - Consider HNSW indexes for better performance at scale
--
-- 6. SYNC STRATEGY:
--    - Periodically resync from blockchain to catch any missed events
--    - Check last_indexed_at to find stale entries
--
-- ============================================
-- SAMPLE USAGE EXAMPLES
-- ============================================

-- Example 1: Search for items semantically
-- SELECT * FROM search_items_by_embedding(
--     '[0.1, 0.2, ...]'::vector,  -- Query embedding
--     0.7,                          -- Similarity threshold
--     20,                           -- Max results
--     'fashion',                    -- Category filter
--     'active'                      -- Status filter
-- );

-- Example 2: Get recommendations for user
-- SELECT * FROM get_user_recommendations(
--     '0x1234...5678',  -- Wallet address
--     10                -- Number of recommendations
-- );

-- Example 3: Update user interaction
-- INSERT INTO user_ai_preferences (wallet_address, viewed_items)
-- VALUES ('0x1234...5678', '[{"sui_object_id": "0xabc", "timestamp": "2024-01-01"}]'::jsonb)
-- ON CONFLICT (wallet_address)
-- DO UPDATE SET
--     viewed_items = user_ai_preferences.viewed_items || EXCLUDED.viewed_items,
--     last_interaction_at = NOW();
