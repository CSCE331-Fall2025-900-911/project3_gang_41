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
 * Aggregates visible ingredients into a list.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Modified query to join and aggregate ingredients
    const sql = `
      SELECT 
        m.item_id, 
        m.item_name, 
        m.cost, 
        m.category, 
        m.image_url, 
        m.description,
        array_remove(array_agg(CASE WHEN i.show_in_description THEN i.item_name ELSE NULL END), NULL) as ingredients_list
      FROM menuitems m
      LEFT JOIN drinkjointable dj ON m.item_id = dj.drink_id
      LEFT JOIN inventory i ON dj.inventory_id = i.item_id
      GROUP BY m.item_id, m.item_name, m.cost, m.category, m.image_url, m.description
      ORDER BY m.item_id ASC
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
  const { item_name, cost, category, image_url, description } = req.body;

  if (!item_name || cost === undefined) {
    return sendBadRequest(res, 'Missing item_name or cost');
  }

  try {
    const query = buildInsertQuery('menuitems', {
      item_name: String(item_name).trim(),
      cost: Number(cost),
      category: category ? String(category).trim() : 'Uncategorized',
      image_url: image_url || null,
      description: description ? String(description).trim().slice(0, 100) : null
    });

    if (!query) return sendBadRequest(res, 'Invalid data');

    const result = await db.query<MenuItem>(query.sql, query.values);
    
    return sendCreated(res, result.rows[0], 'Menu item created'); 
  } catch (error) {
    console.error('[Menu] Create error:', error);
    return sendError(res, 'Failed to add item');
  }
});

/**
 * GET /api/menu/:itemId/ingredients
 * Retrieves the list of inventory items (ingredients) for a specific menu item.
 */
router.get('/:itemId/ingredients', async (req: Request, res: Response) => {
  let itemId: number;
  try {
    itemId = validateIdValue(parseInt(req.params.itemId, 10));
  } catch {
    return sendBadRequest(res, 'Invalid Item ID');
  }

  try {
    // We select inventory_id and quantity directly from the join table
    // Matches the schema shown in your screenshot (drink_id, inventory_id, quantity)
    const sql = `
      SELECT inventory_id, quantity 
      FROM drinkjointable 
      WHERE drink_id = $1
    `;
    
    const result = await db.query(sql, [itemId]);
    
    // Return the raw array. 
    // The updated MenuPage.tsx I gave you handles "inventory_id" automatically.
    return sendSuccess(res, result.rows);
  } catch (error) {
    console.error(`[Menu] Ingredients fetch error for ID ${itemId}:`, error);
    return sendError(res, 'Failed to load ingredients');
  }
});

/**
 * PUT /api/menu/:itemId
 * Updates a menu item.
 */
router.put('/:itemId', async (req: Request, res: Response) => {
  let itemId: number;
  try {
    itemId = validateIdValue(parseInt(req.params.itemId, 10));
  } catch {
    return sendBadRequest(res, 'Invalid Item ID');
  }

  const { item_name, cost, category, image_url, description } = req.body;

  try {
    const query = buildUpdateQuery('menuitems', 'item_id', itemId, {
      item_name: item_name,
      cost: cost !== undefined ? Number(cost) : undefined,
      category: category,
      image_url: image_url,
      description: description !== undefined ? String(description).slice(0, 100) : undefined
    });

    if (!query) return sendBadRequest(res, 'No fields to update');

    const result = await db.query<MenuItem>(query.sql, query.values);

    if (result.rowCount === 0) {
      return sendNotFound(res, 'Menu item not found');
    }

    return sendSuccess(res, result.rows[0], 'Menu item updated');
  } catch (error) {
    console.error(`[Menu] Update error for ID ${itemId}:`, error);
    return sendError(res, 'Failed to update item');
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
    
    return sendNoContent(res); 
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return sendNotFound(res, 'Menu item not found');
    console.error(`[Menu] Delete error for ID ${itemId}:`, error);
    return sendError(res, 'Failed to delete item');
  }
});

export default router;