require('dotenv').config();
const { getPool } = require('./config/db');

async function testReactionsTable() {
  try {
    console.log('🔍 Testing database connection and reactions table...');
    console.log('🔑 DATABASE_URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');
    console.log('🔑 DATABASE_URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'Not found');
    
    const pool = getPool();
    const client = await pool.connect();
    
    // Test basic connection
    const testQuery = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', testQuery.rows[0].now);
    
    // Check if reactions table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'tblmessagesreactions'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ tblmessagesreactions table exists');
      
      // Check table structure
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tblmessagesreactions'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Table columns:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
      
      // Check if table has any data
      const count = await client.query('SELECT COUNT(*) FROM tblmessagesreactions');
      console.log(`📊 Table has ${count.rows[0].count} reactions`);
      
    } else {
      console.log('❌ tblmessagesreactions table NOT found');
      
      // List all tables to see what's available
      const allTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('📋 Available tables:');
      allTables.rows.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  }
  
  process.exit(0);
}

testReactionsTable();