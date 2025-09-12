require('dotenv').config();
const { sql } = require('./config/db');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✓ Database connected successfully');
    console.log('Current time:', result[0].current_time);
    
    // Check current database and schema
    const dbInfo = await sql`SELECT current_database(), current_schema()`;
    console.log(`Database: ${dbInfo[0].current_database}, Schema: ${dbInfo[0].current_schema}`);
    
    // Get all columns from tblusers table
    console.log('\n=== TBLUSERS TABLE COLUMNS ===');
    try {
      const columns = await sql`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns 
        WHERE table_name = 'tblusers'
        AND table_schema = current_schema()
        ORDER BY ordinal_position
      `;
      
      if (columns.length === 0) {
        console.log('No columns found for tblusers table');
        
        // Try different case variations
        const tableVariations = ['tblusers', 'TblUsers', 'TBLUSERS', 'TBLUsers'];
        
        for (const tableName of tableVariations) {
          try {
            const variantColumns = await sql`
              SELECT 
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default,
                ordinal_position
              FROM information_schema.columns 
              WHERE table_name = ${tableName}
              ORDER BY ordinal_position
            `;
            
            if (variantColumns.length > 0) {
              console.log(`\n✓ Found table: ${tableName}`);
              console.log('Columns:');
              variantColumns.forEach((col, index) => {
                const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                
                console.log(`  ${index + 1}. ${col.column_name} - ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
              });
              break;
            }
          } catch (error) {
            // Continue to next variation
          }
        }
      } else {
        console.log('✓ Found tblusers table');
        console.log('Columns:');
        columns.forEach((col, index) => {
          const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          
          console.log(`  ${index + 1}. ${col.column_name} - ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
        });
        
        // Also show sample data
        console.log('\n=== SAMPLE DATA FROM TBLUSERS ===');
        const sampleData = await sql`SELECT * FROM tblusers LIMIT 3`;
        
        if (sampleData.length > 0) {
          console.log('Sample records:');
          sampleData.forEach((user, index) => {
            console.log(`\nRecord ${index + 1}:`);
            Object.entries(user).forEach(([key, value]) => {
              console.log(`  ${key}: ${value}`);
            });
          });
        } else {
          console.log('No sample data found');
        }
      }
      
    } catch (error) {
      console.error('Error getting tblusers columns:', error.message);
    }
    
    // List all tables to see what exists
    console.log('\n=== ALL TABLES IN CURRENT SCHEMA ===');
    const tables = await sql`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_schema = current_schema()
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      console.log('No tables found in current schema');
    } else {
      tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.table_name} (schema: ${table.table_schema})`);
      });
    }
    
    await sql.end();
    console.log('\n✓ Debug test completed');
    
  } catch (error) {
    console.error('✗ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testConnection();