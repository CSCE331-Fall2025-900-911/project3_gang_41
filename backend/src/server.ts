import dotenv from 'dotenv';
dotenv.config();

import express from 'express'; // web framework handling http
import cors from 'cors'; // middleware from frontend to backend
import pool from './db'; // db connection pool

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected', time: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

app.get('/api/menu', async (req, res) => {
  try {
    const result = await pool.query('SELECT item_id, item_name, cost FROM menuitems ORDER BY item_name');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching menu:', err);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
