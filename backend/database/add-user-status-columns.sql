-- Migration script to add user status tracking columns
-- This script adds the necessary columns for tracking user online status

DO $$ 
BEGIN
    -- Add dlastactivity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tblusers' AND column_name = 'dlastactivity') THEN
        ALTER TABLE tblusers ADD COLUMN dlastactivity TIMESTAMP DEFAULT NOW();
        PRINT 'Added dlastactivity column to tblusers';
    ELSE
        PRINT 'dlastactivity column already exists in tblusers';
    END IF;
    
    -- Add donlinestatus column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tblusers' AND column_name = 'donlinestatus') THEN
        ALTER TABLE tblusers ADD COLUMN donlinestatus VARCHAR(20) DEFAULT 'offline' CHECK (donlinestatus IN ('online', 'away', 'idle', 'offline'));
        PRINT 'Added donlinestatus column to tblusers';
    ELSE
        PRINT 'donlinestatus column already exists in tblusers';
    END IF;

    -- Update existing users to have default values
    UPDATE tblusers 
    SET dlastactivity = COALESCE(dlastactivity, NOW()),
        donlinestatus = COALESCE(donlinestatus, 'offline')
    WHERE dlastactivity IS NULL OR donlinestatus IS NULL;

END $$;

COMMIT;