import express, { Request, Response } from 'express';
import db, { runTransaction } from './db';
import { buildInsertQuery, buildUpdateQuery, validateIdValue } from './utils/sql';
import { deductInventory } from './services/inventoryService';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from './utils/response';
import { InventoryItem } from '@project3/shared';

const router = express.Router();

router.post('/deduct', async (req: Request, res: Response) => {
  try {
    const deductions = await deductInventory(req.body.items);
    return sendSuccess(res, deductions, 'Inventory deducted');
  } catch (error) {
    console.error('[Inventory] Deduction error:', error);
    return sendError(res, 'Failed to deduct inventory');
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = "SELECT * FROM inventory ORDER BY item_name ASC";
    const result = await db.query<InventoryItem>(sql);
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error("[Inventory] Load error:", err.message);
    return sendError(res, "Failed to load inventory");
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { item_name, quantity, cost, unit } = req.body;

  if (!item_name || quantity === undefined || cost === undefined) {
    return sendBadRequest(res, 'Missing item_name, quantity, or cost');
  }

  try {
    const query = buildInsertQuery('inventory', {
      item_name,
      supply: quantity,
      unit: unit ?? null,
      cost
    });
    if (!query) return sendBadRequest(res, 'Invalid data');
    const result = await db.query(query.sql, query.values);
    return sendSuccess(res, result.rows[0], 'Inventory item created', 201);
  } catch (error) {
    console.error('[Inventory] Create error:', error);
    return sendError(res, 'Failed to add inventory item');
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  let id: number;
  try {
    id = validateIdValue(parseInt(req.params.id, 10));
  } catch (e) {
    return sendBadRequest(res, 'Invalid item ID');
  }

  const { item_name, quantity, unit, cost } = req.body;

  const query = buildUpdateQuery('inventory', 'item_id', id, {
    item_name,
    supply: quantity, // Map frontend 'quantity' to DB 'supply'
    unit,
    cost
  });

  if (!query) return sendBadRequest(res, 'No valid fields to update');

  try {
    const result = await db.query(query.sql, query.values);
    if (result.rowCount === 0) return sendNotFound(res, 'Item not found');
    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error(`[Inventory] Update error for ID ${id}:`, error);
    return sendError(res, 'Failed to update inventory item');
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  let id: number;
  try {
    id = validateIdValue(parseInt(req.params.id, 10));
  } catch (e) {
    return sendBadRequest(res, 'Invalid item ID');
  }

  try {
    await runTransaction(async (client) => {
      // 1. Remove recipe associations
      await client.query('DELETE FROM drinkjointable WHERE inventory_id = $1', [id]);
      
      // 2. Delete item
      const result = await client.query('DELETE FROM inventory WHERE item_id = $1', [id]);
      if (result.rowCount === 0) {
        throw new Error('NOT_FOUND');
      }
    });
    
    return sendSuccess(res, null, 'Inventory item deleted');
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return sendNotFound(res, 'Inventory item not found');
    }
    console.error(`[Inventory] Delete error for ID ${id}:`, error);
    return sendError(res, 'Failed to delete inventory item');
  }
});

export default router;