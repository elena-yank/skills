
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE practice_logs 
      ADD COLUMN IF NOT EXISTS moderator_proposed_status VARCHAR(50);
    `);
    console.log('Migration successful: Added moderator_proposed_status column.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
