import { defineConfig } from "cypress";
import dotenv from 'dotenv';
dotenv.config();

import { Client } from 'pg';

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      // implement node event listeners here
      on('task', {
        getLatestOtp({ email }: { email: string }) {
          // Create a new client instance for each task
          const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false // Required for Supabase connections
            },
            connectionTimeoutMillis: 10000, // 10 second timeout
            query_timeout: 20000 // 10 second timeout
          });

          return client.connect()
            .then(() => {
              return client.query(
                'SELECT o.dotpcode FROM tblotp o JOIN tblusers u ON o.duserid = u.did WHERE u.demail = $1 ORDER BY o.tcreatedat DESC LIMIT 1',
                [email]
              );
            })
            .then((res: { rows: { dotpcode: string }[] }) => {
              return res.rows[0]?.dotpcode;
            })
            .catch((err: any) => {
              console.error('Database error:', err);
              if (err.code === 'ECONNREFUSED') {
                console.error('Could not connect to database. Please check if database is running and DATABASE_URL is correct');
              }
              return null;
            })
            .finally(() => {
              return client.end().catch((err: any) => {
                console.error('Error closing connection:', err);
              });
            });
        },
        ThisreturnsEMPID({ EMPID }: { EMPID: string }) {
          const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false // Required for Supabase connections
            },
            connectionTimeoutMillis: 5000, // 5 second timeout
            query_timeout: 10000 // 10 second timeout
          });
        
          return client.connect()
            .then(() => {
              return client.query(
                'SELECT * FROM tblusers WHERE demployeeid = $1',
                [EMPID] 
              );
            })
            .then((res: { rows: any[] }) => {
              return res.rows;
            })
            .catch((err: any) => {
              console.error('Database error:', err);
              return [];
            })
            .finally(() => {
              return client.end().catch((err: any) => {
                console.error('Error closing connection:', err);
              });
            });
        }
      });
    },
  },



  component: {
    devServer: {
      framework: "svelte",
      bundler: "vite",
    },
  },
});
//   tblotp
//   | column_name  | data_type                   | character_maximum_length |
// | ------------ | --------------------------- | ------------------------ |
// | did          | uuid                        | null                     |
// | duserid      | uuid                        | null                     |
// | dotpcode     | character varying           | 10                       |
// | dusagestatus | boolean                     | null                     |
// | texpiresat   | timestamp without time zone | null                     |
// | tcreatedat   | timestamp without time zone | null                     |
// | tusedat      | timestamp without time zone | null                     |
// tblusers
// | column_name         | data_type                   | character_maximum_length |
// | ------------------- | --------------------------- | ------------------------ |
// | did                 | uuid                        | null                     |
// | demployeeid         | character varying           | 50                       |
// | dusername           | character varying           | 100                      |
// | demail              | character varying           | 255                      |
// | dpasswordhash       | character varying           | 255                      |
// | dfirstname          | character varying           | 100                      |
// | dlastname           | character varying           | 100                      |
// | dprofilephotourl    | text                        | null                     |
// | dcoverphotourl      | text                        | null                     |
// | dphone              | character varying           | 20                       |
// | daccountstatus      | character varying           | 20                       |
// | dpresencestatus     | character varying           | 10                       |
// | tlastlogin          | timestamp without time zone | null                     |
// | tlastseen           | timestamp without time zone | null                     |
// | tjoindate           | timestamp without time zone | null                     |
// | dmustchangepassword | boolean                     | null                     |
// | tcreatedat          | timestamp without time zone | null                     |
// | tupdatedat          | timestamp without time zone | null                     |
