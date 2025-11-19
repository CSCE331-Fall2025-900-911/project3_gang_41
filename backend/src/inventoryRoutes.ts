import express, { Request, Response } from 'express';
import db from './db';

const router = express.Router();

// API endpoint: Deduct inventory based on order items and their recipes
router.post('/deduct', async (req: Request, res: Response) => {
  const { items } = req.body as {
    items: { item_id: number; quantity: number }[];
  };

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'No items provided' });
  }

  try {
    const deductions: { inventory_id: number; amount: number }[] = [];

    // For each menu item in the order
    for (const item of items) {
      const drinkId = item.item_id;
      const orderQuantity = item.quantity;

      // Get ingredients needed for this menu item
      const recipeResult = await db.query(
        'SELECT inventory_id, quantity FROM drinkjointable WHERE drink_id = $1',
        [drinkId]
      );

      // For each ingredient in the recipe
      for (const recipe of recipeResult.rows) {
        const inventoryId = recipe.inventory_id;
        const recipeQuantity = recipe.quantity;

        // Calculate total needed (recipe amount × order quantity)
        const totalNeeded = recipeQuantity * orderQuantity;

        // Subtract from inventory
        await db.query(
          'UPDATE inventory SET supply = supply - $1 WHERE item_id = $2',
          [totalNeeded, inventoryId]
        );

        deductions.push({ inventory_id: inventoryId, amount: totalNeeded });
        console.log(`Inventory ID ${inventoryId}: -${totalNeeded}`);
      }
    }

    res.json({ success: true, deductions });
  } catch (error) {
    console.error('Error deducting inventory:', error);
    res.status(500).json({ message: 'Failed to deduct inventory', error: String(error) });
  }
});

// Get all inventory items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = "SELECT * FROM inventory ORDER BY item_name ASC";
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error fetching inventory:", err.message);
    res.status(500).json({ message: "Failed to load inventory." });
  }
});

// Create new inventory item
router.post('/', async (req: Request, res: Response) => {
  const { item_name, quantity, cost, unit } = req.body;

  if (!item_name || quantity === undefined || cost === undefined) {
    return res.status(400).json({ message: 'Missing item_name, quantity, or cost.' });
  }

  try {
    const sql = `
      INSERT INTO inventory (item_name, supply, unit, cost)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(sql, [item_name, quantity, unit ?? null, cost]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding new inventory item:', error);
    res.status(500).json({ message: 'Failed to add inventory item.' });
  }
});

// Update inventory item (partial update)
router.put('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid item id.' });
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
    return res.status(400).json({ message: 'No valid fields to update.' });
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
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(`Error updating inventory item ${id}:`, error);
    res.status(500).json({ message: 'Failed to update inventory item.' });
  }
});

// Delete inventory item
router.delete('/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid item id.' });
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
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Inventory item deleted.' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error(`Error deleting inventory item ${id}:`, error);
    res.status(500).json({ message: 'Failed to delete inventory item.' });
  } finally {
    if (client) client.release();
  }
});

export default router;