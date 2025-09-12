require('dotenv').config();
const { getPool } = require('./config/db');

async function checkMessageSchema() {
  const pool = getPool();
  try {
    console.log('Checking tblmessages table structure...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tblmessages' 
      ORDER BY ordinal_position;
    `);
    
    console.log('tblmessages columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    const hasAttachment = result.rows.find(row => row.column_name === 'dattachment');
    if (hasAttachment) {
      console.log('\n✅ dattachment column exists!');
    } else {
      console.log('\n❌ dattachment column missing!');
    }
    
  } catch (error) {
    console.error('Schema check failed:', error);
  } finally {
    await pool.end();
  }
}

checkMessageSchema();