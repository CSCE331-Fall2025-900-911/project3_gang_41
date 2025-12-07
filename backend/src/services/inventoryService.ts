import db from '../db';
import type { PoolClient } from 'pg';
import { validateIdValue } from '../utils/sql';
import { InventoryItem } from '@project3/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DeductionRequest {
  item_id: number;
  quantity: number;
}

interface DeductionResult {
  inventory_id: number;
  amount: number;
}

interface RecipeRow {
  drink_id: number;
  inventory_id: number;
  quantity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Deduction Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core logic to calculate and apply inventory deductions.
 * * ## Algorithm Overview:
 * 1. **Bulk Recipe Fetch**: Retrieves all recipe mappings for the ordered drinks
 * in a single query using `WHERE drink_id = ANY($1)`.
 * 2. **In-Memory Aggregation**: Calculates total deduction per inventory item
 * by multiplying recipe quantity × order quantity, then summing across
 * all orders for the same ingredient.
 * 3. **Bulk Update**: Applies all deductions in a single UPDATE statement
 * using PostgreSQL's UNNEST to pass arrays of (inventory_id, amount) pairs.
 * * ## Performance Characteristics:
 * - Database Operations: O(1) - exactly 2 queries regardless of order size.
 * - Concurrency: Accepts an external `client` to participate in atomic transactions.
 * * @param client - The active database client (allows atomic composition)
 * @param items - The items being ordered
 */
export const executeInventoryDeduction = async (
  client: PoolClient,
  items: DeductionRequest[]
): Promise<DeductionResult[]> => {
  if (items.length === 0) return [];

  // 1. Deduplicate items (map item_id -> total quantity)
  const quantityByDrinkId = new Map<number, number>();
  for (const item of items) {
    const current = quantityByDrinkId.get(item.item_id) ?? 0;
    quantityByDrinkId.set(item.item_id, current + item.quantity);
  }
  
  const drinkIds = Array.from(quantityByDrinkId.keys());

  // 2. Bulk fetch recipes (O(1) query)
  const recipeResult = await client.query<RecipeRow>(
    `SELECT drink_id, inventory_id, quantity 
     FROM drinkjointable 
     WHERE drink_id = ANY($1)`,
    [drinkIds]
  );

  if (recipeResult.rows.length === 0) return [];

  // 3. Aggregate required ingredient amounts in memory
  const deductionMap = new Map<number, number>();
  for (const recipe of recipeResult.rows) {
    const orderQuantity = quantityByDrinkId.get(recipe.drink_id) ?? 0;
    const totalNeeded = recipe.quantity * orderQuantity;
    
    if (totalNeeded > 0) {
      const current = deductionMap.get(recipe.inventory_id) ?? 0;
      deductionMap.set(recipe.inventory_id, current + totalNeeded);
    }
  }

  if (deductionMap.size === 0) return [];

  const inventoryIds = Array.from(deductionMap.keys());
  const amounts = Array.from(deductionMap.values());

  // 4. Bulk update using UNNEST (O(1) update)
  await client.query(
    `UPDATE inventory AS inv
     SET supply = inv.supply - bulk.amount
     FROM (
       SELECT 
         unnest($1::int[]) AS item_id,
         unnest($2::numeric[]) AS amount
     ) AS bulk
     WHERE inv.item_id = bulk.item_id`,
    [inventoryIds, amounts]
  );

  return inventoryIds.map((id, index) => ({
    inventory_id: id,
    amount: amounts[index]!
  }));
};

/**
 * Public wrapper for standalone deductions (e.g. wastage reporting).
 * Manages its own transaction to ensure integrity.
 * * @param items - List of items to deduct
 */
export const deductInventory = async (items: DeductionRequest[]) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await executeInventoryDeduction(client, items);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Checks if sufficient stock exists for a specific drink quantity.
 * * ## Architecture Note:
 * This uses a Raw Parameterized SQL query rather than a builder because
 * it requires complex logic (NOT EXISTS + JOIN + Math) that is inefficient
 * to abstract.
 * * @param drinkId - ID of the menu item
 * @param quantity - Quantity requested
 * @param client - Optional transaction client. If provided, uses that connection.
 * @returns TRUE if stock is sufficient, FALSE if not.
 */
export const validateInventoryAvailability = async (
  drinkId: number,
  quantity: number,
  client?: PoolClient 
): Promise<boolean> => {
  if (quantity <= 0) return true;

  // 1. Safety: Strict ID validation
  try {
    validateIdValue(drinkId);
  } catch {
    return false;
  }

  // 2. Context: Use transaction client if provided, else global pool
  const dbHandle = client || db;

  const result = await dbHandle.query<{ available: boolean }>(
    `SELECT NOT EXISTS (
       SELECT 1 
       FROM drinkjointable djt
       JOIN inventory inv ON inv.item_id = djt.inventory_id
       WHERE djt.drink_id = $1
         AND inv.supply < (djt.quantity * $2)
     ) AS available`,
    [drinkId, quantity]
  );

  return result.rows[0]?.available ?? false;
};