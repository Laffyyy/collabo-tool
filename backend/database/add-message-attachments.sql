-- Migration script to add attachment support to tblmessages
-- This script adds the dattachment column to store attachment data

DO $$ 
BEGIN
    -- Add dattachment column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tblmessages' AND column_name = 'dattachment') THEN
        ALTER TABLE tblmessages ADD COLUMN dattachment TEXT NULL;
        PRINT 'Added dattachment column to tblmessages';
    ELSE
        PRINT 'dattachment column already exists in tblmessages';
    END IF;
END $$;

COMMIT;