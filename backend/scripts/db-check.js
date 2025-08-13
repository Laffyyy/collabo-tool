require('dotenv').config();
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[db-check] Missing DATABASE_URL in environment (.env)');
  process.exit(2);
}

const sql = postgres(connectionString);

(async () => {
  try {
    const rows = await sql`select 1 as ok`;
    console.log('[db-check] Connected to database. Result:', rows && rows[0]);
    await sql.end({ timeout: 5 });
    process.exit(0);
  } catch (err) {
    console.error('[db-check] Connection failed:', err && err.message ? err.message : err);
    try { await sql.end({ timeout: 5 }); } catch (_) {}
    process.exit(1);
  }
})();


