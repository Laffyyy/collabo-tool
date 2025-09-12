-- Add columns for chat management functionality to existing tables

-- Add columns to tblmessages table for message moderation
ALTER TABLE tblmessages 
ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flag_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Add columns to tblconversations table for conversation management
ALTER TABLE tblconversations 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add indices for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON tblmessages(flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON tblmessages(deleted) WHERE deleted = true;
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON tblconversations(archived) WHERE archived = true;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_timestamp ON tblmessages(dconversationid, tcreatedat);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON tblconversations(dtype);

-- Update existing messages to have default values
UPDATE tblmessages 
SET flagged = FALSE, deleted = FALSE 
WHERE flagged IS NULL OR deleted IS NULL;

-- Update existing conversations to have default values
UPDATE tblconversations 
SET archived = FALSE 
WHERE archived IS NULL;

-- Add NOT NULL constraints after setting defaults
ALTER TABLE tblmessages 
ALTER COLUMN flagged SET NOT NULL,
ALTER COLUMN deleted SET NOT NULL;

ALTER TABLE tblconversations 
ALTER COLUMN archived SET NOT NULL;