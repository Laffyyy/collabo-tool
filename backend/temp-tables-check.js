const { getPool } = require('./config/db');
const pool = getPool();

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log('Available tables:');
    result.rows.forEach(row => console.log('- ' + row.table_name));
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}
checkTables();
