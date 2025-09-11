const { query } = require('./config/db');

async function runSupabaseMigration() {
  try {
    console.log('🚀 Running Supabase user status migration...');
    
    // Add columns with IF NOT EXISTS for safety
    const addColumnsSQL = `
      ALTER TABLE tblusers 
      ADD COLUMN IF NOT EXISTS dlastactivity TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS donlinestatus VARCHAR(20) DEFAULT 'offline' 
      CHECK (donlinestatus IN ('online', 'away', 'idle', 'offline'));
    `;
    
    await query(addColumnsSQL);
    console.log('✅ Added user status columns');
    
    // Update existing users
    const updateSQL = `
      UPDATE tblusers 
      SET dlastactivity = COALESCE(dlastactivity, NOW()),
          donlinestatus = COALESCE(donlinestatus, 'offline')
      WHERE dlastactivity IS NULL OR donlinestatus IS NULL;
    `;
    
    await query(updateSQL);
    console.log('✅ Updated existing users with default values');
    
    // Verify the migration
    const verifySQL = `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'tblusers' 
      AND column_name IN ('dlastactivity', 'donlinestatus');
    `;
    
    const result = await query(verifySQL);
    console.log('✅ Migration verification:', result.rows);
    
    console.log('🎉 Supabase user status migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Supabase migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

runSupabaseMigration();