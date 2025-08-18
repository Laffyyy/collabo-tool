const postgres = require('postgres');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

module.exports = { sql };