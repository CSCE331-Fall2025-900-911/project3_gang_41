/**
 * Centralized Postgres pool.
 * - Reads connection options from environment variables.
 * - Supports optional SSL for managed DBs (set DB_SSL=true).
 * - Adds a pool error handler to avoid silent crashes.
 */
import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected PG client error', err);
});

export default pool;