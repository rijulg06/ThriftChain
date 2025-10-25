-- ThriftChain AI Search Layer Schema
--
-- CRITICAL ARCHITECTURE PRINCIPLE:
-- Supabase stores ONLY embeddings for AI search. Nothing else.
-- ALL marketplace data (items, offers, transactions) lives on Sui blockchain.
-- This is NOT a cache. This is ONLY for vector similarity search.
--
-- Run this in Supabase SQL Editor after creating your project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";  -- For pgvector support

-- ============================================
-- ITEM SEARCH INDEX (AI-POWERED SEARCH ONLY)
-- ============================================
-- Purpose: Store vector embeddings to enable semantic search
-- Returns: Sui object IDs (frontend fetches full data from blockchain)

CREATE TABLE IF NOT EXISTS item_search_index (
    -- Primary key: Reference to on-chain ThriftItem NFT
    sui_object_id TEXT PRIMARY KEY,

    -- Vector embeddings for different search strategies
    title_embedding VECTOR(768),         -- Text-only: item title
    description_embedding VECTOR(768),   -- Text-only: item description
    image_embedding VECTOR(768),         -- Image-only: visual features
    combined_embedding VECTOR(768),      -- Multimodal: text + images (MOST POWERFUL)

    -- Metadata
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector similarity search indexes (for fast nearest-neighbor queries)
-- Using IVFFlat for good balance of speed and accuracy

CREATE INDEX idx_title_embedding ON item_search_index
    USING ivfflat (title_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_description_embedding ON item_search_index
    USING ivfflat (description_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_image_embedding ON item_search_index
    USING ivfflat (image_embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_combined_embedding ON item_search_index
    USING ivfflat (combined_embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================
-- USER AI PREFERENCES (RECOMMENDATION ENGINE)
-- ============================================
-- Purpose: Store learned user taste profiles for personalized recommendations
-- Privacy: This is the ONLY user data not on blockchain

CREATE TABLE IF NOT EXISTS user_ai_preferences (
    wallet_address TEXT PRIMARY KEY,

    -- User taste profile (learned from viewing/liking items)
    preference_embedding VECTOR(768),     -- Aggregated preference vector

    -- Interaction tracking (for collaborative filtering)
    viewed_item_ids TEXT[] DEFAULT '{}',      -- Array of sui_object_ids
    liked_item_ids TEXT[] DEFAULT '{}',       -- Array of sui_object_ids

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for finding users with similar tastes
CREATE INDEX idx_preference_embedding ON user_ai_preferences
    USING ivfflat (preference_embedding vector_cosine_ops)
    WITH (lists = 100);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences
    BEFORE UPDATE ON user_ai_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SEARCH CACHE (OPTIONAL - PERFORMANCE)
-- ============================================
-- Purpose: Cache frequently searched queries (expires after 1 hour)

CREATE TABLE IF NOT EXISTS search_cache (
    query_hash TEXT PRIMARY KEY,              -- Hash of search query
    query_embedding VECTOR(768),              -- Original query vector
    result_object_ids TEXT[] DEFAULT '{}',    -- Array of matching sui_object_ids
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX idx_search_cache_expires ON search_cache(expires_at);

-- Auto-cleanup expired cache (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM search_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEARCH FUNCTIONS
-- ============================================

/**
 * Semantic search by query embedding
 * Returns: Array of sui_object_ids sorted by similarity
 * Frontend will then fetch full item data from Sui blockchain
 */
CREATE OR REPLACE FUNCTION search_items_by_embedding(
    query_embedding VECTOR(768),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INT DEFAULT 20,
    use_combined BOOLEAN DEFAULT TRUE  -- If true, use combined_embedding; else use title_embedding
)
RETURNS TABLE (
    sui_object_id TEXT,
    similarity_score FLOAT
) AS $$
BEGIN
    IF use_combined THEN
        RETURN QUERY
        SELECT
            i.sui_object_id,
            1 - (i.combined_embedding <=> query_embedding) AS similarity_score
        FROM item_search_index i
        WHERE 1 - (i.combined_embedding <=> query_embedding) > similarity_threshold
        ORDER BY i.combined_embedding <=> query_embedding
        LIMIT max_results;
    ELSE
        RETURN QUERY
        SELECT
            i.sui_object_id,
            1 - (i.title_embedding <=> query_embedding) AS similarity_score
        FROM item_search_index i
        WHERE 1 - (i.title_embedding <=> query_embedding) > similarity_threshold
        ORDER BY i.title_embedding <=> query_embedding
        LIMIT max_results;
    END IF;
END;
$$ LANGUAGE plpgsql;

/**
 * Visual search by image embedding
 * Returns: Items with visually similar images
 */
CREATE OR REPLACE FUNCTION search_items_by_image(
    query_image_embedding VECTOR(768),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INT DEFAULT 20
)
RETURNS TABLE (
    sui_object_id TEXT,
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.sui_object_id,
        1 - (i.image_embedding <=> query_image_embedding) AS similarity_score
    FROM item_search_index i
    WHERE 1 - (i.image_embedding <=> query_image_embedding) > similarity_threshold
    ORDER BY i.image_embedding <=> query_image_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

/**
 * Get personalized recommendations for a user
 * Returns: sui_object_ids that match user's learned preferences
 */
CREATE OR REPLACE FUNCTION get_user_recommendations(
    user_wallet TEXT,
    max_results INT DEFAULT 10
)
RETURNS TABLE (
    sui_object_id TEXT,
    similarity_score FLOAT
) AS $$
DECLARE
    user_pref_vec VECTOR(768);
BEGIN
    -- Get user's preference vector
    SELECT preference_embedding INTO user_pref_vec
    FROM user_ai_preferences
    WHERE wallet_address = user_wallet;

    -- If user has no preferences yet, return empty (frontend can show trending items from blockchain)
    IF user_pref_vec IS NULL THEN
        RETURN;
    END IF;

    -- Return items similar to user preferences (excluding already viewed)
    RETURN QUERY
    SELECT
        i.sui_object_id,
        1 - (i.combined_embedding <=> user_pref_vec) AS similarity_score
    FROM item_search_index i
    WHERE
        -- Exclude items user already viewed
        i.sui_object_id != ALL(
            SELECT viewed_item_ids FROM user_ai_preferences WHERE wallet_address = user_wallet
        )
    ORDER BY i.combined_embedding <=> user_pref_vec
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE item_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Item search index: Public read (anyone can search)
CREATE POLICY "Anyone can search items"
    ON item_search_index FOR SELECT
    USING (true);

-- Only backend service can index items
CREATE POLICY "Only service role can index items"
    ON item_search_index FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- User preferences: Users own their data
CREATE POLICY "Users can view own preferences"
    ON user_ai_preferences FOR SELECT
    USING (auth.jwt() ->> 'wallet_address' = wallet_address);

CREATE POLICY "Users can update own preferences"
    ON user_ai_preferences FOR ALL
    USING (auth.jwt() ->> 'wallet_address' = wallet_address);

-- Search cache: Public read/write (it's just a cache)
CREATE POLICY "Anyone can use search cache"
    ON search_cache FOR ALL
    USING (true);

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Example 1: Semantic text search
-- SELECT * FROM search_items_by_embedding(
--     '[0.1, 0.2, ..., 0.768]'::VECTOR(768),  -- Query embedding from "vintage leather jacket"
--     0.7,                                      -- 70% similarity threshold
--     20,                                       -- Return top 20 matches
--     TRUE                                      -- Use combined (multimodal) embedding
-- );
-- Returns: [sui_object_id_1, sui_object_id_2, ...]
-- Then: Frontend fetches full item data from Sui blockchain

-- Example 2: Visual search (upload image, find similar items)
-- SELECT * FROM search_items_by_image(
--     '[0.1, 0.2, ..., 0.768]'::VECTOR(768),  -- Image embedding
--     0.75,                                     -- 75% similarity threshold
--     10                                        -- Return top 10
-- );

-- Example 3: Get personalized recommendations
-- SELECT * FROM get_user_recommendations(
--     '0x1234...5678',  -- User's wallet address
--     15                -- Return 15 recommendations
-- );

-- Example 4: Track user interaction (when user views an item)
-- INSERT INTO user_ai_preferences (wallet_address, viewed_item_ids)
-- VALUES ('0x1234...5678', ARRAY['0xabc...123'])
-- ON CONFLICT (wallet_address)
-- DO UPDATE SET
--     viewed_item_ids = array_append(user_ai_preferences.viewed_item_ids, '0xabc...123'),
--     updated_at = NOW();

-- ============================================
-- MAINTENANCE NOTES
-- ============================================

-- VECTOR DIMENSIONS:
-- - Currently using 768 dimensions (Google Gemini embeddings)
-- - If switching to OpenAI, change to 1536 dimensions
-- - Update CREATE TABLE and all VECTOR(768) references

-- PERFORMANCE:
-- - Run VACUUM ANALYZE periodically for ivfflat indexes
-- - Consider HNSW indexes for better performance at scale:
--   CREATE INDEX USING hnsw (embedding vector_cosine_ops);

-- SYNC STRATEGY:
-- - Backend listens to Sui blockchain events (ItemCreated)
-- - Generates embeddings and inserts into item_search_index
-- - Periodic re-indexing to catch missed events (check indexed_at)

-- REMEMBER:
-- Supabase is NOT the source of truth!
-- Always fetch full item data from Sui blockchain for display.
-- This database only accelerates search queries.
