import 'dotenv/config';
import { Pool, PoolClient, PoolConfig } from 'pg';

// ─────────────────────────────────────────────────────────────────────────────
// Database Configuration Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PORT = 5432;
const DEFAULT_MAX_POOL_SIZE = 20;
const DEFAULT_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// Environment Validation
// ─────────────────────────────────────────────────────────────────────────────

interface DatabaseConfig {
  host: string;
  database: string;
  user: string;
  password: string;
  port: number;
  ssl: PoolConfig['ssl'];
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

/**
 * Validates and returns database configuration from environment variables.
 * Throws descriptive error if required variables are missing.
 */
const getDatabaseConfig = (): DatabaseConfig => {
  const requiredVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as const;
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missing.join(', ')}`
    );
  }

  const port = parseInt(process.env.DB_PORT ?? '', 10);

  return {
    host: process.env.DB_HOST!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    port: Number.isNaN(port) ? DEFAULT_PORT : port,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: DEFAULT_MAX_POOL_SIZE,
    idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DEFAULT_CONNECTION_TIMEOUT_MS,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Pool Initialization
// ─────────────────────────────────────────────────────────────────────────────

const pool = new Pool(getDatabaseConfig());

pool.on('error', (err: Error) => {
  console.error('[DB] Unexpected pool error:', err.message);
  // In production, you might want to trigger alerts or graceful shutdown
});

pool.on('connect', () => {
  console.debug('[DB] New client connected to pool');
});

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Executes a callback within a database transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK, and client release.
 *
 * @template T - The return type of the callback
 * @param callback - Async function receiving a PoolClient for queries
 * @returns The result of the callback
 * @throws Re-throws any error after rolling back the transaction
 *
 * @example
 * const result = await runTransaction(async (client) => {
 *   await client.query('INSERT INTO orders ...');
 *   await client.query('UPDATE inventory ...');
 *   return { success: true };
 * });
 */
export const runTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DB] Transaction rolled back due to error:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Gracefully closes all pool connections.
 * Call this during application shutdown.
 */
export const closePool = async (): Promise<void> => {
  console.log('[DB] Closing database pool...');
  await pool.end();
  console.log('[DB] Database pool closed');
};

export default pool;