import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        getLatestOtp({ email }) {
          // Replace this with actual database query logic
          const { Client } = require('pg');
          const client = new Client({
            connectionString: 'postgresql://postgres.cwejlsdpeaqxvpothpbn:password@db.cwejlsdpeaqxvpothpbn.supabase.co:5432/postgres',
          });
          client.connect();

          return client
            .query('SELECT dotpcode FROM tblotp WHERE duserid = $1 ORDER BY tcreatedat DESC LIMIT 1', [email])
            .then((res) => {
              client.end();
              return res.rows[0]?.dotpcode;
            })
            .catch((err) => {
              client.end();
              console.error('Error fetching OTP:', err);
              return null;
            });
        },
      });
    },
  },

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


  component: {
    devServer: {
      framework: "svelte",
      bundler: "vite",
    },
  },
});
