const { getPool } = require('./config/db');
const pool = getPool();

async function checkAllTables() {
  try {
    // Check tbluserroles
    console.log('=== TBLUSERROLES TABLE ===');
    const roleResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tbluserroles' 
      ORDER BY ordinal_position
    `);
    console.log('tbluserroles columns:');
    roleResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check tblroles
    console.log('\n=== TBLROLES TABLE ===');
    const rolesResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tblroles' 
      ORDER BY ordinal_position
    `);
    console.log('tblroles columns:');
    rolesResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check tblorganizationalunits
    console.log('\n=== TBLORGANIZATIONALUNITS TABLE ===');
    const ouResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tblorganizationalunits' 
      ORDER BY ordinal_position
    `);
    console.log('tblorganizationalunits columns:');
    ouResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Sample data
    console.log('\n=== SAMPLE DATA ===');
    const sampleRoles = await pool.query('SELECT * FROM tblroles LIMIT 3');
    console.log('Sample roles:', sampleRoles.rows);
    
    const sampleUserRoles = await pool.query('SELECT * FROM tbluserroles LIMIT 3');
    console.log('Sample user-role relationships:', sampleUserRoles.rows);
    
    const sampleOUs = await pool.query('SELECT * FROM tblorganizationalunits LIMIT 3');
    console.log('Sample organizational units:', sampleOUs.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkAllTables();
