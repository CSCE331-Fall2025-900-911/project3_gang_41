import express, { Request, Response } from 'express';
import db, { runTransaction } from './db';
import { buildInsertQuery, buildUpdateQuery, validateIdValue } from './utils/sql';
import { 
  sendSuccess, 
  sendError, 
  sendBadRequest, 
  sendNotFound, 
  sendCreated,
  sendNoContent
} from './utils/response';
import { MenuItem } from '@project3/shared';

const router = express.Router();

/**
 * GET /api/menu
 * Retrieves all menu items ordered by ID.
 */
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

/**
 * POST /api/menu
 * Creates a new menu item.
 */
router.post('/', async (req: Request, res: Response) => {
  const { item_name, cost, category, image_url } = req.body;

  if (!item_name || cost === undefined) {
    return sendBadRequest(res, 'Missing item_name or cost');
  }

  try {
    const query = buildInsertQuery('menuitems', {
      item_name: String(item_name).trim(),
      cost: Number(cost),
      category: category ? String(category).trim() : 'Uncategorized',
      image_url: image_url || null
    });

    if (!query) return sendBadRequest(res, 'Invalid data');

    const result = await db.query<MenuItem>(query.sql, query.values);
    
    // Usage of semantic 201 Created
    return sendCreated(res, result.rows[0], 'Menu item created'); 
  } catch (error) {
    console.error('[Menu] Create error:', error);
    return sendError(res, 'Failed to add item');
  }
});

/**
 * DELETE /api/menu/:itemId
 * Deletes a menu item and its recipe associations.
 */
router.delete('/:itemId', async (req: Request, res: Response) => {
  let itemId: number;
  try {
    itemId = validateIdValue(parseInt(req.params.itemId, 10));
  } catch {
    return sendBadRequest(res, 'Invalid Item ID');
  }
  
  try {
    await runTransaction(async (client) => {
        // 1. Remove recipe associations (referential integrity)
        await client.query("DELETE FROM drinkjointable WHERE drink_id = $1", [itemId]);
        // 2. Remove item
        const result = await client.query("DELETE FROM menuitems WHERE item_id = $1", [itemId]);
        if (result.rowCount === 0) throw new Error('NOT_FOUND');
    });
    
    // Usage of semantic 204 No Content
    return sendNoContent(res); 
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return sendNotFound(res, 'Menu item not found');
    console.error(`[Menu] Delete error for ID ${itemId}:`, error);
    return sendError(res, 'Failed to delete item');
  }
});

// Note: Additional PUT/Ingredients routes would follow this same pattern
// but are omitted for brevity unless requested specifically.
export default router;