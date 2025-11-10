import express, { Request, Response } from 'express';
import db from './db'; 

const router = express.Router();

// GET /api/menu
router.get('/', async (req: Request, res: Response) => {
    try {
        const sql = "SELECT item_id, item_name, cost FROM menuitems ORDER BY item_id ASC";
        const result = await db.query(sql);
        res.json(result.rows); 
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ message: 'Failed to load menu data.' });
    }
});

// POST /api/menu
router.post('/', async (req: Request, res: Response) => {
    const { item_name, cost } = req.body;
    if (!item_name || !cost) {
        return res.status(400).json({ message: 'Missing item name or cost.' });
    }

    let client; 

    try {
        client = await db.connect();
        await client.query('BEGIN');

        const maxIdQuery = "SELECT MAX(item_id) AS max_id FROM menuitems";
        const maxIdResult = await client.query(maxIdQuery);
        
        const nextId = (maxIdResult.rows[0].max_id || 0) + 1;

        const insertSql = "INSERT INTO menuitems (item_id, item_name, cost) VALUES ($1, $2, $3) RETURNING item_id";
        const result = await client.query(insertSql, [nextId, item_name, cost]);

        await client.query('COMMIT');

        res.status(201).json(result.rows[0]);

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Error adding new item:', error);
        res.status(500).json({ message: 'Failed to add item.' });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// POST /api/menu/:id/ingredients
router.post('/:id/ingredients', async (req: Request, res: Response) => {
    const { id } = req.params; // The ID of the menu item (drink)
    const { ingredients } = req.body; // Array of objects: [{ id: 22, quantity: 1 }]

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ message: 'Ingredients array must be non-empty.' });
    }

    let client;
    try {
        client = await db.connect();
        await client.query('BEGIN'); 

        // 1. Get the current max ID from the join table itself
        const maxJoinIdQuery = "SELECT MAX(id) AS max_id FROM drinkjointable";
        const maxJoinIdResult = await client.query(maxJoinIdQuery);
        let nextJoinId = (maxJoinIdResult.rows[0].max_id || 0); // Start from the max ID

        // 2. Loop through each ingredient object
        for (const ingredient of ingredients) {
            nextJoinId++; // Increment the ID for each new row

            // 3. Insert all 4 columns
            const sql = "INSERT INTO drinkjointable (id, drink_id, inventory_id, quantity) VALUES ($1, $2, $3, $4)";
            await client.query(sql, [nextJoinId, id, ingredient.id, ingredient.quantity]);
        }
        
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

// PUT /api/menu/:itemId
router.put('/:itemId', async (req: Request, res: Response) => {
    const { itemId } = req.params;
    const { cost } = req.body;
    if (!cost) {
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

// DELETE /api/menu/:itemId
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