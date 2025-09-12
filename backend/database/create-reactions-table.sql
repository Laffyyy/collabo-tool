-- Create reactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS tblmessagereactions (
    did SERIAL PRIMARY KEY,
    dmessageid VARCHAR(255) NOT NULL,
    duserid VARCHAR(255) NOT NULL,
    demoji VARCHAR(20) NOT NULL,
    tcreatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dmessageid, duserid, demoji)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON tblmessagereactions(dmessageid);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON tblmessagereactions(duserid);
CREATE INDEX IF NOT EXISTS idx_reactions_emoji ON tblmessagereactions(demoji);

-- Comment
COMMENT ON TABLE tblmessagereactions IS 'Stores user reactions to messages';
COMMENT ON COLUMN tblmessagereactions.dmessageid IS 'ID of the message being reacted to';
COMMENT ON COLUMN tblmessagereactions.duserid IS 'ID of the user who reacted';
COMMENT ON COLUMN tblmessagereactions.demoji IS 'The emoji reaction';
COMMENT ON COLUMN tblmessagereactions.tcreatedat IS 'When the reaction was created';