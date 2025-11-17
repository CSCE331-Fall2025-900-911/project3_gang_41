import express, { Request, Response } from 'express';
import db from './db';

const router = express.Router();

// Get all menu items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = "SELECT item_id, item_name, cost, category FROM menuitems ORDER BY item_id ASC";
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: 'Failed to load menu data.' });
  }
});

// Create new menu item
router.post('/', async (req: Request, res: Response) => {
  const { item_name, cost } = req.body;
  if (!item_name || cost == null) {
    return res.status(400).json({ message: 'Missing item name or cost.' });
  }

  try {
    const insertSql =
      "INSERT INTO menuitems (item_name, cost) VALUES ($1, $2) RETURNING item_id, item_name, cost";
    const result = await db.query(insertSql, [item_name, cost]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding new item:', error);
    res.status(500).json({ message: 'Failed to add item.' });
  }
});

// Link ingredients to a menu item
router.post('/:id/ingredients', async (req: Request, res: Response) => {
  const drinkId = Number(req.params.id);
  const { ingredients } = req.body as { ingredients: { id: number; quantity: number }[] };

  if (!Number.isInteger(drinkId)) {
    return res.status(400).json({ message: 'Invalid menu item id.' });
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ message: 'Ingredients array must be non-empty.' });
  }

  const invIds = ingredients.map((i) => i.id);
  const quantities = ingredients.map((i) => i.quantity);

  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');

    const sql = `
      INSERT INTO drinkjointable (drink_id, inventory_id, quantity)
      SELECT $1, t.inventory_id, t.quantity
      FROM UNNEST($2::int[], $3::numeric[]) AS t(inventory_id, quantity)
    `;
    await client.query(sql, [drinkId, invIds, quantities]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Ingredients linked successfully.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error linking ingredients:', error);
    res.status(500).json({ message: 'Failed to link ingredients.' });
  } finally {
    if (client) client.release();
  }
});

// Update menu item price
router.put('/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { cost } = req.body;
  if (cost == null) {
    return res.status(400).json({ message: 'Missing new price.' });
  }
  try {
    const sql = "UPDATE menuitems SET cost = $1 WHERE item_id = $2";
    const result = await db.query(sql, [cost, itemId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }
    res.json({ message: 'Price updated successfully.' });
  } catch (error) {
    console.error(`Error updating price for item ${itemId}:`, error);
    res.status(500).json({ message: 'Failed to update item price.' });
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