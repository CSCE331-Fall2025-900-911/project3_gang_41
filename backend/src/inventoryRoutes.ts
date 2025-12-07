import express, { Request, Response } from 'express';
import db, { runTransaction } from './db';
import { buildUpdateQuery } from './utils/sql';
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

// Refactored PUT
router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return sendError(res, 'Invalid item id.', 400);

  const { item_name, quantity, unit, cost } = req.body;

  // Map frontend "quantity" to DB column "supply"
  const query = buildUpdateQuery('inventory', 'item_id', id, {
    item_name,
    supply: quantity,
    unit,
    cost
  });

  if (!query) return sendError(res, 'No valid fields to update.', 400);

  try {
    const result = await db.query(query.sql, query.values);
    if (result.rowCount === 0) return sendError(res, 'Inventory item not found.', 404);
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error(`Error updating inventory item ${id}:`, error);
    sendError(res, 'Failed to update inventory item.');
  }
});

// Refactored DELETE using runTransaction
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return sendError(res, 'Invalid item id.', 400);

  try {
    await runTransaction(async (client) => {
      // Remove associations first
      await client.query('DELETE FROM drinkjointable WHERE inventory_id = $1', [id]);
      
      const result = await client.query('DELETE FROM inventory WHERE item_id = $1', [id]);
      if (result.rowCount === 0) {
        throw new Error('NOT_FOUND');
        // Throwing ensures ROLLBACK, then we catch below
      }
    });
    
    sendSuccess(res, { message: 'Inventory item deleted.' });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
        return sendError(res, 'Inventory item not found.', 404);
    }
    console.error(`Error deleting inventory item ${id}:`, error);
    sendError(res, 'Failed to delete inventory item.');
  }
});

// Get menu items that use a specific inventory ingredient
router.get('/:id/menu-usage', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return sendError(res, 'Invalid item id.', 400);

  try {
    const sql = `
      SELECT m.item_id, m.item_name
      FROM menuitems m
      JOIN drinkjointable dj ON m.item_id = dj.drink_id
      WHERE dj.inventory_id = $1
      ORDER BY m.item_name ASC
    `;
    const result = await db.query(sql, [id]);
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error(`Error fetching usage for inventory item ${id}:`, error);
    sendError(res, 'Failed to load menu usage data.');
  }
});

export default router;