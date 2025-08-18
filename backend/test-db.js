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
    
    // List all tables to see what exists
    console.log('\nListing all tables in current schema:');
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
    
    // Try different case variations of the table name
    const tableVariations = [
      'tblsecurityquestions',
      'TblSecurityQuestions', 
      'TBLSECURITYQUESTIONS',
      'TBLSecurityQuestions'
    ];
    
    console.log('\nTesting table name variations:');
    for (const tableName of tableVariations) {
      try {
        const count = await sql`
          SELECT COUNT(*) as count 
          FROM ${sql(tableName)}
        `;
        console.log(`✓ Found table: ${tableName} with ${count[0].count} records`);
        
        // If we find the table, show sample data
        const sampleData = await sql`
          SELECT did, dquestiontext 
          FROM ${sql(tableName)}
          LIMIT 3
        `;
        
        console.log('Sample questions:');
        sampleData.forEach((q, index) => {
          console.log(`  ${index + 1}. ${q.dquestiontext} (ID: ${q.did})`);
        });
        break;
        
      } catch (error) {
        console.log(`✗ Table not found: ${tableName}`);
      }
    }
    
    // Check if table exists in other schemas
    console.log('\nChecking all schemas for security questions table:');
    const allTables = await sql`
      SELECT table_name, table_schema 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%security%' OR table_name ILIKE '%question%'
      ORDER BY table_schema, table_name
    `;
    
    if (allTables.length > 0) {
      console.log('Found security/question related tables:');
      allTables.forEach((table) => {
        console.log(`  ${table.table_schema}.${table.table_name}`);
      });
    } else {
      console.log('No security/question related tables found in any schema');
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