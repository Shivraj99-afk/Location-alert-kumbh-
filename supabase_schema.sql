-- SQL for Supabase SQL Editor

-- 1. Create Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    threshold_distance FLOAT DEFAULT 50, -- in meters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Members table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Realtime
-- Make sure to go to the Supabase Dashboard -> Database -> Replication -> supabase_realtime
-- and enable it for the 'members' table.
-- Or run:
-- alter publication supabase_realtime add table members;
