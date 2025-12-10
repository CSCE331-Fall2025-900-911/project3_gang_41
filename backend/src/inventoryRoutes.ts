import express, { Request, Response } from 'express';
import db, { runTransaction } from './db';
import { buildInsertQuery, buildUpdateQuery, validateIdValue } from './utils/sql';
import { deductInventory } from './services/inventoryService';
import { 
  sendSuccess, 
  sendError, 
  sendBadRequest, 
  sendNotFound,
  sendCreated,
  sendNoContent
} from './utils/response';
import { InventoryItem } from '@project3/shared';

const router = express.Router();

/**
 * POST /api/inventory/deduct
 * Manually deducts inventory (useful for waste reporting).
 */
router.post('/deduct', async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return sendBadRequest(res, 'Items must be an array');
  }

  try {
    const deductions = await deductInventory(items);
    return sendSuccess(res, deductions, 'Inventory deducted');
  } catch (error) {
    console.error('[Inventory] Deduction error:', error);
    return sendError(res, 'Failed to deduct inventory');
  }
});

/**
 * GET /api/inventory
 * Retrieves all inventory items.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Added show_in_description to SELECT
    const sql = `
      SELECT item_id, item_name, supply, unit, cost, show_in_description
      FROM inventory 
      ORDER BY item_name ASC
    `;
    const result = await db.query<InventoryItem>(sql);
    return sendSuccess(res, result.rows);
  } catch (error) {
    console.error('[Inventory] Load error:', error);
    return sendError(res, 'Failed to load inventory');
  }
});

/**
 * POST /api/inventory
 * Creates a new inventory item.
 */
router.post('/', async (req: Request, res: Response) => {
  const { item_name, quantity, cost, unit, show_in_description } = req.body;

  if (!item_name || quantity === undefined || cost === undefined) {
    return sendBadRequest(res, 'Missing required fields');
  }

  try {
    const query = buildInsertQuery('inventory', {
      item_name: String(item_name).trim(),
      supply: Number(quantity),
      unit: unit || null,
      cost: Number(cost),
      // Added show_in_description to Insert
      show_in_description: typeof show_in_description === 'boolean' ? show_in_description : false
    });
    
    if (!query) return sendBadRequest(res, 'Invalid data');
    
    const result = await db.query<InventoryItem>(query.sql, query.values);
    return sendCreated(res, result.rows[0], 'Inventory item created');
  } catch (error) {
    console.error('[Inventory] Create error:', error);
    return sendError(res, 'Failed to add inventory item');
  }
});

/**
 * GET /api/inventory/:id/menu-usage
 * Get menu items that use a specific inventory ingredient.
 */
router.get('/:id/menu-usage', async (req: Request, res: Response) => {
  let id: number;
  try {
    id = validateIdValue(parseInt(req.params.id, 10));
  } catch {
    return sendBadRequest(res, 'Invalid item ID');
  }

  try {
    const sql = `
      SELECT m.item_id, m.item_name
      FROM menuitems m
      JOIN drinkjointable dj ON m.item_id = dj.drink_id
      WHERE dj.inventory_id = $1
      ORDER BY m.item_name ASC
    `;
    const result = await db.query(sql, [id]);
    return sendSuccess(res, result.rows);
  } catch (error) {
    console.error(`[Inventory] Usage fetch error for ID ${id}:`, error);
    return sendError(res, 'Failed to load menu usage data');
  }
});

/**
 * PUT /api/inventory/:id
 * Updates an inventory item.
 */
router.put('/:id', async (req: Request, res: Response) => {
  let id: number;
  try {
    id = validateIdValue(parseInt(req.params.id, 10));
  } catch {
    return sendBadRequest(res, 'Invalid item ID');
  }

  const { item_name, quantity, unit, cost, show_in_description } = req.body;

  // Added show_in_description to Update
  const query = buildUpdateQuery('inventory', 'item_id', id, {
    item_name,
    supply: quantity,
    unit,
    cost,
    show_in_description
  });

  if (!query) return sendBadRequest(res, 'No valid fields to update');

  try {
    const result = await db.query(query.sql, query.values);
    if (result.rowCount === 0) return sendNotFound(res, 'Item not found');
    return sendSuccess(res, result.rows[0], 'Item updated');
  } catch (error) {
    console.error(`[Inventory] Update error for ID ${id}:`, error);
    return sendError(res, 'Failed to update item');
  }
});

/**
 * DELETE /api/inventory/:id
 * Deletes an inventory item and cleans up recipe links.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  let id: number;
  try {
    id = validateIdValue(parseInt(req.params.id, 10));
  } catch {
    return sendBadRequest(res, 'Invalid ID');
  }

  try {
    await runTransaction(async (client) => {
      // 1. Clean up recipe table
      await client.query('DELETE FROM drinkjointable WHERE inventory_id = $1', [id]);
      // 2. Delete inventory item
      const result = await client.query('DELETE FROM inventory WHERE item_id = $1', [id]);
      if (result.rowCount === 0) throw new Error('NOT_FOUND');
    });
    
    return sendNoContent(res);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return sendNotFound(res, 'Item not found');
    console.error(`[Inventory] Delete error for ID ${id}:`, error);
    return sendError(res, 'Failed to delete item');
  }
});

export default router;