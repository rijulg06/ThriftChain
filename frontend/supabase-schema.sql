-- ThriftChain Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,  -- User preferences for AI recommendations
    reputation_score INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by wallet address
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- ============================================
-- ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nft_id TEXT,  -- Sui NFT object ID
    seller_wallet TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price BIGINT NOT NULL,  -- Price in smallest SUI unit (MIST)
    currency TEXT DEFAULT 'SUI' CHECK (currency IN ('SUI', 'USDC')),
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_for_trade BOOLEAN DEFAULT false,
    trade_preferences TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'pending')),
    
    -- Walrus storage references
    images JSONB DEFAULT '[]'::jsonb,  -- Array of WalrusBlob references
    
    -- Metadata
    views_count INTEGER DEFAULT 0,
    bids_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key to users
    FOREIGN KEY (seller_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Indexes for filtering and search
CREATE INDEX idx_items_seller ON items(seller_wallet);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_items_price ON items(price);
CREATE INDEX idx_items_tags ON items USING GIN(tags);  -- GIN index for array search

-- ============================================
-- OFFERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL,
    buyer_wallet TEXT NOT NULL,
    seller_wallet TEXT NOT NULL,
    amount BIGINT NOT NULL,
    currency TEXT DEFAULT 'SUI',
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (seller_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Indexes for offer queries
CREATE INDEX idx_offers_item ON offers(item_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_wallet);
CREATE INDEX idx_offers_seller ON offers(seller_wallet);
CREATE INDEX idx_offers_status ON offers(status);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL,
    buyer_wallet TEXT NOT NULL,
    seller_wallet TEXT NOT NULL,
    amount BIGINT NOT NULL,
    currency TEXT DEFAULT 'SUI',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed', 'completed', 'refunded')),
    
    -- Escrow information
    escrow_address TEXT,
    transaction_hash TEXT,  -- Sui transaction hash
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (seller_wallet) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Indexes for transaction queries
CREATE INDEX idx_transactions_item ON transactions(item_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_wallet);
CREATE INDEX idx_transactions_seller ON transactions(seller_wallet);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);

-- ============================================
-- OWNERSHIP HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ownership_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL,
    owner_wallet TEXT NOT NULL,
    transaction_id UUID,
    price BIGINT,  -- Price at which it was bought
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

-- Index for ownership history queries
CREATE INDEX idx_ownership_item ON ownership_history(item_id);
CREATE INDEX idx_ownership_owner ON ownership_history(owner_wallet);

-- ============================================
-- WALRUS BLOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS walrus_blobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blob_id TEXT UNIQUE NOT NULL,  -- Walrus blob identifier
    url TEXT NOT NULL,  -- Public access URL
    size INTEGER NOT NULL,  -- File size in bytes
    mime_type TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by TEXT,  -- Wallet address of uploader
    
    FOREIGN KEY (uploaded_by) REFERENCES users(wallet_address) ON DELETE SET NULL
);

-- Index for blob lookups
CREATE INDEX idx_walrus_blobs_id ON walrus_blobs(blob_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE walrus_blobs ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can read, only the owner can update
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.jwt() ->> 'wallet_address' = wallet_address);

-- Items: Anyone can read active items
CREATE POLICY "Items are viewable by everyone" ON items
    FOR SELECT USING (status = 'active');

CREATE POLICY "Sellers can insert their own items" ON items
    FOR INSERT WITH CHECK (auth.jwt() ->> 'wallet_address' = seller_wallet);

CREATE POLICY "Sellers can update their own items" ON items
    FOR UPDATE USING (auth.jwt() ->> 'wallet_address' = seller_wallet);

-- Offers: Can be viewed by buyer and seller
CREATE POLICY "Offers are viewable by participants" ON offers
    FOR SELECT USING (
        auth.jwt() ->> 'wallet_address' = buyer_wallet OR
        auth.jwt() ->> 'wallet_address' = seller_wallet
    );

CREATE POLICY "Anyone can create offers" ON offers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Offers can be updated by participants" ON offers
    FOR UPDATE USING (
        auth.jwt() ->> 'wallet_address' = buyer_wallet OR
        auth.jwt() ->> 'wallet_address' = seller_wallet
    );

-- Transactions: Can be viewed by buyer and seller
CREATE POLICY "Transactions are viewable by participants" ON transactions
    FOR SELECT USING (
        auth.jwt() ->> 'wallet_address' = buyer_wallet OR
        auth.jwt() ->> 'wallet_address' = seller_wallet
    );

CREATE POLICY "Anyone can create transactions" ON transactions
    FOR INSERT WITH CHECK (true);

-- Ownership history: Anyone can read
CREATE POLICY "Ownership history is viewable by everyone" ON ownership_history
    FOR SELECT USING (true);

-- Walrus blobs: Anyone can read
CREATE POLICY "Walrus blobs are viewable by everyone" ON walrus_blobs
    FOR SELECT USING (true);

CREATE POLICY "Anyone can upload blobs" ON walrus_blobs
    FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment item views
CREATE OR REPLACE FUNCTION increment_item_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items SET views_count = views_count + 1 WHERE id = NEW.item_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert a test user
-- INSERT INTO users (wallet_address, username, bio) 
-- VALUES ('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 'testuser', 'Test user for development');

-- ============================================
-- NOTES
-- ============================================
-- 1. All timestamps use TIMESTAMP WITH TIME ZONE for proper timezone handling
-- 2. Prices are stored in MIST (smallest SUI unit, like wei in Ethereum)
-- 3. Images are stored as JSONB arrays with Walrus blob references
-- 4. Tags are stored as PostgreSQL arrays for efficient searching
-- 5. RLS policies provide security at the database level
-- 6. Foreign keys ensure referential integrity
