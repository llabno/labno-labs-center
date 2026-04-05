-- Add dispatched_at timestamp to wishlist for agent dispatch tracking
ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE;
