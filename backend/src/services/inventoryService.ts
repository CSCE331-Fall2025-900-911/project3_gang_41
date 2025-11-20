import db from '../db';

export const deductInventory = async (items: { item_id: number; quantity: number }[]) => {
  if (!Array.isArray(items) || items.length === 0) return;

  // Using a client for transaction safety is best here
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    const deductions = [];

    for (const item of items) {
      const drinkId = item.item_id;
      const orderQuantity = item.quantity;

      // Get ingredients
      const recipeResult = await client.query(
        'SELECT inventory_id, quantity FROM drinkjointable WHERE drink_id = $1',
        [drinkId]
      );

      for (const recipe of recipeResult.rows) {
        const totalNeeded = recipe.quantity * orderQuantity;
        await client.query(
          'UPDATE inventory SET supply = supply - $1 WHERE item_id = $2',
          [totalNeeded, recipe.inventory_id]
        );
        deductions.push({ inventory_id: recipe.inventory_id, amount: totalNeeded });
      }
    }
    await client.query('COMMIT');
    return deductions;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error; // Re-throw so the caller knows it failed
  } finally {
    client.release();
  }
};