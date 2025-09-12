const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function addChatManagementColumns() {
  try {
    console.log('Adding chat management columns to database...');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../database/add-chat-management-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await query(sql);
    
    console.log('✅ Chat management columns added successfully!');
    
    // Test the new columns by querying the tables
    console.log('\n📊 Testing new columns...');
    
    // Test messages table
    const messagesTest = await query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE flagged = false) as unflagged_messages,
        COUNT(*) FILTER (WHERE deleted = false) as active_messages
      FROM tblmessages
    `);
    
    console.log('Messages table:', messagesTest.rows[0]);
    
    // Test conversations table
    const conversationsTest = await query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(*) FILTER (WHERE archived = false) as active_conversations
      FROM tblconversations
    `);
    
    console.log('Conversations table:', conversationsTest.rows[0]);
    
    console.log('\n✅ Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding chat management columns:', error);
    throw error;
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addChatManagementColumns()
    .then(() => {
      console.log('\n🎉 Migration completed! Chat management features are now available.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addChatManagementColumns };