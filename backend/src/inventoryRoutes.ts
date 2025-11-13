/**
 * Inventory routes:
 * - POST / => create an inventory item
 *   Expects: { item_name: string, quantity: number, cost: number }
 *   Note: Column names in DB are (item_name, supply, cost)
 */
import express, { Request, Response } from 'express';
import db from './db';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { item_name, quantity, cost } = req.body;

  if (!item_name || quantity === undefined || cost === undefined) {
    return res.status(400).json({ message: 'Missing item_name, quantity, or cost.' });
  }

  try {
    // Rely on DB identity/serial to generate item_id automatically
    const sql = "INSERT INTO inventory (item_name, supply, cost) VALUES ($1, $2, $3) RETURNING *";
    const result = await db.query(sql, [item_name, quantity, cost]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding new inventory item:', error);
    res.status(500).json({ message: 'Failed to add inventory item.' });
  }
});

export default router;