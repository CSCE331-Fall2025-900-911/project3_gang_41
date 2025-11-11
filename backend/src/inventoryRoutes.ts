// backend/src/inventoryRoutes.ts
import express, { Request, Response } from 'express';
import db from './db'; // Use db, not pool, if your db.ts exports 'db'

const router = express.Router();
const pool = db; // Assuming db.ts exports { query, connect } as default

// POST /api/inventory
router.post('/', async (req: Request, res: Response) => {
    // 1. Get cost from req.body
    const { item_name, quantity, cost } = req.body;
    
    // 2. Update validation
    if (!item_name || quantity === undefined || cost === undefined) {
        return res.status(400).json({ message: 'Missing item_name, quantity, or cost.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const maxIdQuery = "SELECT MAX(item_id) AS max_id FROM inventory";
        const maxIdResult = await client.query(maxIdQuery);
        const nextId = (maxIdResult.rows[0].max_id || 0) + 1;

        // 3. Update SQL query to use 'supply' and 'cost'
        const sql = "INSERT INTO inventory (item_id, item_name, supply, cost) VALUES ($1, $2, $3, $4) RETURNING *";
        
        // 4. Update query parameters
        const result = await client.query(sql, [nextId, item_name, quantity, cost]);
        
        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error adding new inventory item:', error);
        res.status(500).json({ message: 'Failed to add inventory item.' });
    } finally {
        if (client) client.release();
    }
});

// You would also add GET, PUT, DELETE for inventory here later

export default router;