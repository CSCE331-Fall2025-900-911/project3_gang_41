import pool from '../db';

async function addDashboardIndex() {
  try {
    console.log('Connecting to database...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_order_history_date 
      ON order_history(orderdate);
    `);
    console.log('✅ Success: Created index idx_order_history_date');
  } catch (error) {
    console.error('❌ Error creating index:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

addDashboardIndex();