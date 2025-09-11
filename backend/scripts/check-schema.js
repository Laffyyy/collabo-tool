require('dotenv').config();
const { getPool } = require('../config/db');

async function checkSchema() {
  const pool = getPool();
  try {
    console.log('Checking tblusers table structure...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tblusers' 
      ORDER BY ordinal_position;
    `);
    
    console.log('tblusers columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\nChecking if users exist...');
    const userCount = await pool.query('SELECT COUNT(*) FROM tblusers');
    console.log(`Total users: ${userCount.rows[0].count}`);
    
    if (userCount.rows[0].count > 0) {
      console.log('\nSample user data:');
      const sampleUser = await pool.query('SELECT * FROM tblusers LIMIT 1');
      console.log(sampleUser.rows[0]);
    }
    
  } catch (error) {
    console.error('Schema check failed:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
