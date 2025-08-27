const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    console.log('🔄 Starting database migration...');
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'update-user-schema.sql'),
      'utf8'
    );

    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Database migration completed successfully!');
    console.log('📋 Changes applied:');
    console.log('   - Added missing columns to tblusers table');
    console.log('   - Created organizational_units table');
    console.log('   - Added proper indexes and constraints');
    console.log('   - Inserted default organizational units');
    console.log('   - Created default admin user (admin@collabo-tool.com / admin123)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
