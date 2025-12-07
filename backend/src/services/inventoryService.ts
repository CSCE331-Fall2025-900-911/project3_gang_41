import db, { runTransaction } from '../db';

export const deductInventory = async (items: { item_id: number; quantity: number }[]) => {
  if (!Array.isArray(items) || items.length === 0) return;

  return runTransaction(async (client) => {
    const deductions = [];

    for (const item of items) {
      const drinkId = item.item_id;
      const orderQuantity = item.quantity;

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
    return deductions;
  });
};