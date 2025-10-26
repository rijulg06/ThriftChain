-- ============================================
-- ThriftChain Supabase Schema (6 Columns Only)
-- ============================================
-- This table links Sui blockchain items with AI embeddings
-- for semantic search. Walrus blob IDs are stored on-chain.
--
-- Run this in Supabase SQL Editor to create/recreate the table

-- ============================================
-- DROP EXISTING (if recreating)
-- ============================================

DROP TABLE IF EXISTS item_search_index CASCADE;

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "vector";  -- For pgvector support

-- ============================================
-- CREATE TABLE (6 columns only)
-- ============================================

CREATE TABLE item_search_index (
    -- Primary key: Sui blockchain object ID
    sui_object_id TEXT PRIMARY KEY,

    -- AI embeddings for semantic search (OpenAI ada-002: 1536 dimensions)
    title_embedding VECTOR(1536),
    description_embedding VECTOR(1536),
    image_embedding VECTOR(1536),
    combined_embedding VECTOR(1536),

    -- Timestamp
    time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLE COMMENTS
-- ============================================

COMMENT ON TABLE item_search_index IS
'Links Sui blockchain items with AI embeddings for semantic search. Walrus blob IDs stored on-chain in smart contract.';

COMMENT ON COLUMN item_search_index.sui_object_id IS
'Sui blockchain object ID - use this to fetch full item details (including Walrus blob IDs) from blockchain via queries.ts';

COMMENT ON COLUMN item_search_index.title_embedding IS
'Vector embedding of item title for semantic search (generated via OpenAI API)';

COMMENT ON COLUMN item_search_index.description_embedding IS
'Vector embedding of item description for semantic search';

COMMENT ON COLUMN item_search_index.image_embedding IS
'Vector embedding of item images for visual similarity search';

COMMENT ON COLUMN item_search_index.combined_embedding IS
'Combined embedding of title + description + image for holistic search';

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Vector similarity search indexes (IVFFlat for fast approximate search)
CREATE INDEX idx_title_embedding ON item_search_index
    USING ivfflat (title_embedding vector_cosine_ops);

CREATE INDEX idx_description_embedding ON item_search_index
    USING ivfflat (description_embedding vector_cosine_ops);

CREATE INDEX idx_image_embedding ON item_search_index
    USING ivfflat (image_embedding vector_cosine_ops);

CREATE INDEX idx_combined_embedding ON item_search_index
    USING ivfflat (combined_embedding vector_cosine_ops);

-- Time-based index for sorting by recency
CREATE INDEX idx_time ON item_search_index(time DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE item_search_index ENABLE ROW LEVEL SECURITY;

-- Permissive policy: allow all operations for MVP
-- TODO: Tighten this in production (e.g., only allow updates from item owner)
CREATE POLICY "Allow all operations"
    ON item_search_index FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- HELPER FUNCTION: Semantic Search
-- ============================================

CREATE OR REPLACE FUNCTION search_items_by_embedding(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 20
)
RETURNS TABLE (
    sui_object_id TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.sui_object_id,
        1 - (i.combined_embedding <=> query_embedding) AS similarity
    FROM item_search_index i
    WHERE 1 - (i.combined_embedding <=> query_embedding) > match_threshold
    ORDER BY i.combined_embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✓ Schema created successfully!' as status;

SELECT 'Columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'item_search_index'
ORDER BY ordinal_position;

SELECT 'Total columns: 6' as info;
