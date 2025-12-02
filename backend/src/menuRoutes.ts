import express, { Request, Response } from 'express';
import db, { runTransaction } from './db';
import { buildUpdateQuery } from './utils/sql';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();

// Get all menu items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = `
      SELECT item_id, item_name, cost, category, image_url
      FROM menuitems
      ORDER BY item_id ASC
    `;
    const result = await db.query(sql);
    // WRAPPED RESPONSE
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    sendError(res, 'Failed to load menu data.');
  }
});

// Optional: list distinct categories for UI suggestions
router.get('/categories/distinct', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT category
      FROM menuitems
      WHERE category IS NOT NULL AND category <> ''
      ORDER BY category ASC
    `);
    sendSuccess(res, result.rows.map((r: any) => r.category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    sendError(res, 'Failed to load categories.');
  }
});

// Create new menu item (with category)
router.post('/', async (req: Request, res: Response) => {
  const { item_name, cost, category } = req.body as {
    item_name?: string;
    cost?: number | string;
    category?: string;
  };

  if (!item_name || cost == null) {
    return sendError(res, 'Missing item name or cost.', 400);
  }

  const name = item_name.trim();
  const cat = (category ?? 'Uncategorized').trim();
  const price = typeof cost === 'string' ? parseFloat(cost) : cost;

  if (!Number.isFinite(price)) {
    return sendError(res, 'Cost must be a valid number.', 400);
  }

  try {
    const insertSql = `
      INSERT INTO menuitems (item_name, cost, category)
      VALUES ($1, $2, $3)
      RETURNING item_id, item_name, cost, category
    `;
    const result = await db.query(insertSql, [name, price, cat]);
    sendSuccess(res, result.rows[0], 'Item created successfully');
  } catch (error) {
    console.error('Error adding new item:', error);
    sendError(res, 'Failed to add item.');
  }
});

// Get ingredients for a menu item (for preselecting in UI)
router.get('/:id/ingredients', async (req: Request, res: Response) => {
  const drinkId = Number(req.params.id);
  if (!Number.isInteger(drinkId)) {
    return sendError(res, 'Invalid menu item id.', 400);
  }

  try {
    const sql = `
      SELECT
        i.item_id   AS id,
        i.item_name AS name,
        dj.quantity AS quantity
      FROM drinkjointable dj
      JOIN inventory i ON i.item_id = dj.inventory_id
      WHERE dj.drink_id = $1
      ORDER BY i.item_name ASC
    `;
    const result = await db.query(sql, [drinkId]);
    sendSuccess(res, { ingredients: result.rows });
  } catch (error) {
    console.error('Error fetching item ingredients:', error);
    sendError(res, 'Failed to load ingredients.');
  }
});

// Refactored Ingredients Save
router.post('/:id/ingredients', async (req: Request, res: Response) => {
  const drinkId = Number(req.params.id);
  const { ingredients } = req.body;

  if (!Number.isInteger(drinkId)) return sendError(res, 'Invalid menu item id.', 400);
  if (!Array.isArray(ingredients)) return sendError(res, 'Ingredients must be an array.', 400);

  // Aggregate logic (same as original)
  const agg = new Map<number, number>();
  for (const ing of ingredients) {
    if (!Number.isInteger(ing.id)) continue;
    const qty = Number(ing.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    agg.set(ing.id, (agg.get(ing.id) ?? 0) + qty);
  }

  const invIds = Array.from(agg.keys());
  const quantities = Array.from(agg.values());

  try {
    await runTransaction(async (client) => {
      await client.query('DELETE FROM drinkjointable WHERE drink_id = $1', [drinkId]);

      if (invIds.length > 0) {
        const insertSql = `
          INSERT INTO drinkjointable (drink_id, inventory_id, quantity)
          SELECT $1, t.inventory_id, t.quantity
          FROM UNNEST($2::int[], $3::numeric[]) AS t(inventory_id, quantity)
        `;
        await client.query(insertSql, [drinkId, invIds, quantities]);
      }
    });

    res.status(201);
    sendSuccess(res, { message: 'Ingredients saved.' });
  } catch (error) {
    console.error('Error saving ingredients:', error);
    sendError(res, 'Failed to save ingredients.');
  }
});

// Refactored PUT
router.put('/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { item_name, cost, category } = req.body;

  const query = buildUpdateQuery('menuitems', 'item_id', Number(itemId), {
    item_name,
    cost,
    category
  });

  if (!query) return sendError(res, 'Provide at least one field to update.', 400);

  try {
    const result = await db.query(query.sql, query.values);
    if (result.rowCount === 0) return sendError(res, 'Menu item not found.', 404);
    sendSuccess(res, result.rows[0], 'Item updated');
  } catch (error) {
    console.error(`Error updating item ${itemId}:`, error);
    sendError(res, 'Failed to update item.');
  }
});

// Refactored DELETE
router.delete('/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;
  
  try {
    await runTransaction(async (client) => {
        await client.query("DELETE FROM drinkjointable WHERE drink_id = $1", [itemId]);
        const result = await client.query("DELETE FROM menuitems WHERE item_id = $1", [itemId]);
        if (result.rowCount === 0) throw new Error('NOT_FOUND');
    });
    sendSuccess(res, null, 'Item deleted');
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return sendError(res, 'Menu item not found.', 404);
    console.error(`Error deleting item ${itemId}:`, error);
    sendError(res, 'Failed to delete item.');
  }
});

export default router;