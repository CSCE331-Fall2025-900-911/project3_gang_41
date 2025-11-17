import express, { Request, Response } from 'express';
import db from './db';

const router = express.Router();

// Get all menu items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = `
      SELECT item_id, item_name, cost, category
      FROM menuitems
      ORDER BY item_id ASC
    `;
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: 'Failed to load menu data.' });
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
    res.json(result.rows.map((r: any) => r.category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to load categories.' });
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
    return res.status(400).json({ message: 'Missing item name or cost.' });
  }

  const name = item_name.trim();
  const cat = (category ?? 'Uncategorized').trim();
  const price = typeof cost === 'string' ? parseFloat(cost) : cost;

  if (!Number.isFinite(price)) {
    return res.status(400).json({ message: 'Cost must be a valid number.' });
  }

  try {
    const insertSql = `
      INSERT INTO menuitems (item_name, cost, category)
      VALUES ($1, $2, $3)
      RETURNING item_id, item_name, cost, category
    `;
    const result = await db.query(insertSql, [name, price, cat]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding new item:', error);
    res.status(500).json({ message: 'Failed to add item.' });
  }
});

// Get ingredients for a menu item (for preselecting in UI)
router.get('/:id/ingredients', async (req: Request, res: Response) => {
  const drinkId = Number(req.params.id);
  if (!Number.isInteger(drinkId)) {
    return res.status(400).json({ message: 'Invalid menu item id.' });
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
    res.json({ ingredients: result.rows }); // [{ id, name, quantity }]
  } catch (error) {
    console.error('Error fetching item ingredients:', error);
    res.status(500).json({ message: 'Failed to load ingredients.' });
  }
});

// Replace ingredients for a menu item (delete + insert in transaction)
router.post('/:id/ingredients', async (req: Request, res: Response) => {
  const drinkId = Number(req.params.id);
  const { ingredients } = req.body as { ingredients: { id: number; quantity: number }[] };

  if (!Number.isInteger(drinkId)) {
    return res.status(400).json({ message: 'Invalid menu item id.' });
  }
  if (!Array.isArray(ingredients)) {
    return res.status(400).json({ message: 'Ingredients must be an array.' });
  }

  // Aggregate duplicates and validate
  const agg = new Map<number, number>();
  for (const ing of ingredients) {
    if (!Number.isInteger(ing.id)) continue;
    const qty = Number(ing.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    agg.set(ing.id, (agg.get(ing.id) ?? 0) + qty);
  }

  const invIds = Array.from(agg.keys());
  const quantities = Array.from(agg.values());

  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');

    // Remove existing links
    await client.query('DELETE FROM drinkjointable WHERE drink_id = $1', [drinkId]);

    // Insert new links if any
    if (invIds.length > 0) {
      const insertSql = `
        INSERT INTO drinkjointable (drink_id, inventory_id, quantity)
        SELECT $1, t.inventory_id, t.quantity
        FROM UNNEST($2::int[], $3::numeric[]) AS t(inventory_id, quantity)
      `;
      await client.query(insertSql, [drinkId, invIds, quantities]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Ingredients saved.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error saving ingredients:', error);
    res.status(500).json({ message: 'Failed to save ingredients.' });
  } finally {
    if (client) client.release();
  }
});

// Update menu item (name, price, and optionally category)
router.put('/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { item_name, cost, category } = req.body as {
    item_name?: string;
    cost?: number | string;
    category?: string;
  };

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (typeof item_name === 'string') {
    const name = item_name.trim();
    if (!name) return res.status(400).json({ message: 'item_name cannot be empty.' });
    sets.push(`item_name = $${idx++}`);
    values.push(name);
  }

  if (cost != null) {
    const price = typeof cost === 'string' ? parseFloat(cost) : cost;
    if (!Number.isFinite(price)) {
      return res.status(400).json({ message: 'Cost must be a valid number.' });
    }
    sets.push(`cost = $${idx++}`);
    values.push(price);
  }

  if (typeof category === 'string') {
    const cat = category.trim();
    if (!cat) return res.status(400).json({ message: 'category cannot be empty.' });
    sets.push(`category = $${idx++}`);
    values.push(cat);
  }

  if (sets.length === 0) {
    return res.status(400).json({ message: 'Provide at least one field to update.' });
  }

  try {
    const sql = `
      UPDATE menuitems
      SET ${sets.join(', ')}
      WHERE item_id = $${idx}
      RETURNING item_id, item_name, cost, category
    `;
    values.push(itemId);

    const result = await db.query(sql, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating item ${itemId}:`, error);
    res.status(500).json({ message: 'Failed to update item.' });
  }
});

// Delete menu item and ingredient associations
router.delete('/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;
  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');

    await client.query("DELETE FROM drinkjointable WHERE drink_id = $1", [itemId]);
    const result = await client.query("DELETE FROM menuitems WHERE item_id = $1", [itemId]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Item and associated links deleted.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(`Error deleting item ${itemId}:`, error);
    res.status(500).json({ message: 'Failed to delete item.' });
  } finally {
    if (client) client.release();
  }
});

export default router;