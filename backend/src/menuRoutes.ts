import express, { Request, Response } from 'express';
import db, { runTransaction } from './db';
import { buildInsertQuery, buildUpdateQuery } from './utils/sql';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from './utils/response';
import { MenuItem } from '@project3/shared';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = `
      SELECT item_id, item_name, cost, category, image_url
      FROM menuitems
      ORDER BY item_id ASC
    `;
    const result = await db.query<MenuItem>(sql);
    return sendSuccess(res, result.rows);
  } catch (error) {
    console.error('[Menu] Fetch error:', error);
    return sendError(res, 'Failed to load menu data');
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { item_name, cost, category } = req.body;

  if (!item_name || cost == null) {
    return sendBadRequest(res, 'Missing item name or cost');
  }

  const name = String(item_name).trim();
  const cat = String(category ?? 'Uncategorized').trim();
  const price = Number(cost);

  if (isNaN(price)) return sendBadRequest(res, 'Cost must be a valid number');

  try {
    const query = buildInsertQuery('menuitems', {
      item_name: name,
      cost: price,
      category: cat
    });
    if (!query) return sendBadRequest(res, 'Invalid item data');
    const result = await db.query(query.sql, query.values);
    return sendSuccess(res, result.rows[0], 'Item created successfully', 201);
  } catch (error) {
    console.error('[Menu] Create error:', error);
    return sendError(res, 'Failed to add item');
  }
});

// ... (GET/POST ingredients routes remain similar, just add `return sendSuccess(...)`)

router.put('/:itemId', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.itemId, 10);
  if (isNaN(itemId)) return sendBadRequest(res, 'Invalid Item ID');

  const { item_name, cost, category } = req.body;

  const query = buildUpdateQuery('menuitems', 'item_id', itemId, {
    item_name,
    cost,
    category
  });

  if (!query) return sendBadRequest(res, 'Provide at least one field to update');

  try {
    const result = await db.query(query.sql, query.values);
    if (result.rowCount === 0) return sendNotFound(res, 'Menu item not found');
    return sendSuccess(res, result.rows[0], 'Item updated');
  } catch (error) {
    console.error(`[Menu] Update error for ID ${itemId}:`, error);
    return sendError(res, 'Failed to update item');
  }
});

router.delete('/:itemId', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.itemId, 10);
  if (isNaN(itemId)) return sendBadRequest(res, 'Invalid Item ID');
  
  try {
    await runTransaction(async (client) => {
        await client.query("DELETE FROM drinkjointable WHERE drink_id = $1", [itemId]);
        const result = await client.query("DELETE FROM menuitems WHERE item_id = $1", [itemId]);
        if (result.rowCount === 0) throw new Error('NOT_FOUND');
    });
    return sendSuccess(res, null, 'Item deleted');
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return sendNotFound(res, 'Menu item not found');
    console.error(`[Menu] Delete error for ID ${itemId}:`, error);
    return sendError(res, 'Failed to delete item');
  }
});

export default router;