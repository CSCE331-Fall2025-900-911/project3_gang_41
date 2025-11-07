import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db';
import menuRoutes from './menuRoutes';
import inventoryRoutes from './inventoryRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected', time: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

app.get('/api/inventory', async (req: Request, res: Response) => {
    try {
        const sql = "SELECT * FROM inventory ORDER BY item_name ASC";
        const result = await pool.query(sql);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching inventory:', err.message);
        res.status(500).json({ message: 'Failed to load inventory.' });
    }
});

app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes);

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});