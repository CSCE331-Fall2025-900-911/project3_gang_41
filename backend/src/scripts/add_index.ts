import pool from '../db'; // Import the existing pool from your db.ts file

async function addDashboardIndex() {
  try {
    console.log('Connecting to database...');
    
    // Run the query
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_order_history_date 
      ON order_history(orderdate);
    `);
    
    console.log('✅ Success: Created index idx_order_history_date');
  } catch (error) {
    console.error('❌ Error creating index:', error);
    process.exit(1); // Exit with error code
  } finally {
    // Always close the pool, success or fail
    await pool.end();
    process.exit(0);
  }
}

addDashboardIndex();