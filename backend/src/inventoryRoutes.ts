import express, { Request, Response } from 'express';
import db from './db';
import { deductInventory } from './services/inventoryService';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();

// API endpoint: Deduct inventory based on order items and their recipes
router.post('/deduct', async (req: Request, res: Response) => {
  try {
    const deductions = await deductInventory(req.body.items);
    sendSuccess(res, deductions, 'Inventory deducted');
  } catch (error) {
    console.error('Error deducting inventory:', error);
    sendError(res, 'Failed to deduct inventory');
  }
});

// Get all inventory items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = "SELECT * FROM inventory ORDER BY item_name ASC";
    const result = await db.query(sql);
    sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error("Error fetching inventory:", err.message);
    sendError(res, "Failed to load inventory.");
  }
});

// Create new inventory item
router.post('/', async (req: Request, res: Response) => {
  const { item_name, quantity, cost, unit } = req.body;

  if (!item_name || quantity === undefined || cost === undefined) {
    return sendError(res, 'Missing item_name, quantity, or cost.', 400);
  }

  try {
    const sql = `
      INSERT INTO inventory (item_name, supply, unit, cost)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(sql, [item_name, quantity, unit ?? null, cost]);
    res.status(201);
    sendSuccess(res, result.rows[0], 'Inventory item created');
  } catch (error) {
    console.error('Error adding new inventory item:', error);
    sendError(res, 'Failed to add inventory item.');
  }
});

// Update inventory item (partial update)
router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return sendError(res, 'Invalid item id.', 400);
  }

  const { item_name, quantity, unit, cost } = req.body as {
    item_name?: string;
    quantity?: number;
    unit?: string | null;
    cost?: number | string;
  };

  const setClauses: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (item_name !== undefined) {
    setClauses.push(`item_name = $${i++}`);
    values.push(item_name);
  }
  if (quantity !== undefined) {
    setClauses.push(`supply = $${i++}`);
    values.push(quantity);
  }
  if (unit !== undefined) {
    setClauses.push(`unit = $${i++}`);
    values.push(unit);
  }
  if (cost !== undefined) {
    setClauses.push(`cost = $${i++}`);
    values.push(cost);
  }

  if (setClauses.length === 0) {
    return sendError(res, 'No valid fields to update.', 400);
  }

  try {
    const sql = `
      UPDATE inventory
      SET ${setClauses.join(', ')}
      WHERE item_id = $${i}
      RETURNING *
    `;
    values.push(id);
    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      return sendError(res, 'Inventory item not found.', 404);
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error(`Error updating inventory item ${id}:`, error);
    sendError(res, 'Failed to update inventory item.');
  }
});

// Delete inventory item
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return sendError(res, 'Invalid item id.', 400);
  }

  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');

    // Remove associations with menu items first (if any)
    await client.query('DELETE FROM drinkjointable WHERE inventory_id = $1', [id]);

    const result = await client.query('DELETE FROM inventory WHERE item_id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Inventory item not found.', 404);
    }

    await client.query('COMMIT');
    sendSuccess(res, { message: 'Inventory item deleted.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(`Error deleting inventory item ${id}:`, error);
    sendError(res, 'Failed to delete inventory item.');
  } finally {
    if (client) client.release();
  }
});

export default router;