import db, { runTransaction } from '../db';
import { deductInventory } from './inventoryService';

const BUSINESS_TZ = 'America/Chicago';

// ---- Simple seeded RNG so behavior is stable within a week ----
type RNG = () => number;

function mulberry32(seed: number): RNG {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Get business-local hour (0–23) and a “week key” that’s constant for that week
function getBusinessHourAndWeekKey(date: Date): { hour: number; weekKey: number } {
  // Get local components in BUSINESS_TZ
  const dtParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const year = Number(dtParts.find((p) => p.type === 'year')?.value ?? '1970');
  const month = Number(dtParts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(dtParts.find((p) => p.type === 'day')?.value ?? '1');
  const hour = Number(dtParts.find((p) => p.type === 'hour')?.value ?? '0');

  // Approximate week number: week 1 = days 1–7, week 2 = days 8–14, etc.
  const d = new Date(Date.UTC(year, month - 1, day));
  const oneJan = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((d.getTime() - oneJan.getTime()) / 86400000) + 1;
  const week = Math.floor((dayOfYear - 1) / 7) + 1;

  const weekKey = year * 100 + week; // e.g. 2025 week 13 => 202513
  return { hour, weekKey };
}

// Type for menu row we use here
type MenuRow = {
  item_id: number;
  item_name: string;
  cost: number | string;
  category: string | null;
};

/**
 * Weighted random choice of a menu item, with bias toward a favored
 * category or a favored item if provided.
 */
function pickWeightedMenuItem(
  menu: MenuRow[],
  rng: RNG,
  favoredCategory: string | null,
  favoredItemId: number | null
): MenuRow {
  // Base weight for any item
  const BASE = 1;
  const FAVORITE_MULTIPLIER = 4; // how much more often favorites appear

  const weights: number[] = [];
  let total = 0;

  for (const m of menu) {
    let w = BASE;
    if (favoredItemId != null && m.item_id === favoredItemId) {
      w *= FAVORITE_MULTIPLIER;
    } else if (favoredCategory && m.category === favoredCategory) {
      w *= FAVORITE_MULTIPLIER;
    }
    weights.push(w);
    total += w;
  }

  let r = rng() * total;
  for (let i = 0; i < menu.length; i++) {
    r -= weights[i];
    if (r <= 0) return menu[i];
  }
  return menu[menu.length - 1]; // fallback
}

/**
 * Create a single synthetic order in the DB and deduct inventory.
 * Returns the new orderid or null if it could not be created.
 */
async function createSyntheticOrder(
  menu: MenuRow[],
  rng: RNG,
  favoredCategory: string | null,
  favoredItemId: number | null
): Promise<number | null> {
  if (menu.length === 0) return null;

  // 1–4 items per order
  const numItems = 1 + Math.floor(rng() * 4);
  const chosen: {
    item_id: number;
    item_name: string;
    cost: number;
    quantity: number;
  }[] = [];

  for (let i = 0; i < numItems; i++) {
    const item = pickWeightedMenuItem(menu, rng, favoredCategory, favoredItemId);
    const quantity = 1 + Math.floor(rng() * 3); // 1–3 units
    const costNum =
      typeof item.cost === 'string' ? parseFloat(item.cost) : Number(item.cost);
    chosen.push({
      item_id: item.item_id,
      item_name: item.item_name,
      cost: costNum,
      quantity,
    });
  }

  // Aggregate duplicates
  const agg = new Map<number, { item_id: number; item_name: string; cost: number; quantity: number }>();
  for (const c of chosen) {
    const existing = agg.get(c.item_id);
    if (existing) existing.quantity += c.quantity;
    else agg.set(c.item_id, { ...c });
  }
  const aggregatedItems = Array.from(agg.values());

  // Insert into order_history (similar to your real order route)
  const orderid = await runTransaction<number>(async (client) => {
    const { rows } = await client.query(
      'SELECT COALESCE(MAX(orderid), 0) + 1 AS new_id FROM order_history'
    );
    const newId = Number(rows[0].new_id);

    const insertSql = `
      INSERT INTO order_history
      (orderid, customerid, employeeatcheckout, paymentmethod, menuitemid, itemname, quantity, unitprice, totalprice)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const paymentMethods = ['cash', 'card', 'mobile'] as const;
    const paymentmethod =
      paymentMethods[Math.floor(rng() * paymentMethods.length)];
    const customerid = 0;
    const employeeId = 0; // could also randomize from employees table

    for (const item of aggregatedItems) {
      const total = item.cost * item.quantity;
      await client.query(insertSql, [
        newId,
        customerid,
        employeeId,
        paymentmethod,
        item.item_id,
        item.item_name,
        item.quantity,
        item.cost,
        total,
      ]);
    }

    return newId;
  });

  // Deduct inventory
  const itemsForInventory = aggregatedItems.map((it) => ({
    item_id: it.item_id,
    quantity: it.quantity,
  }));
  await deductInventory(itemsForInventory).catch((e) =>
    console.error('Fake order inventory deduction error', e)
  );

  console.log(`Generated fake order #${orderid}`);
  return orderid;
}

/**
 * Entry point for the cron/bot:
 * - Decides how many orders to create this run (0–3).
 * - Applies weekly "favorite" bias and peak-hour behavior.
 */
export async function generateFakeOrdersForRun(): Promise<number[]> {
  // Load menu
  const { rows: menu } = await db.query<MenuRow>(
    'SELECT item_id, item_name, cost, category FROM menuitems'
  );
  if (menu.length === 0) {
    console.warn('No menu items found; cannot generate fake orders.');
    return [];
  }

  const now = new Date();
  const { hour, weekKey } = getBusinessHourAndWeekKey(now);
  const rng = mulberry32(weekKey);

  // Determine peak vs off-peak (business local time)
  const isPeak =
    (hour >= 11 && hour <= 13) || // lunch 11–1
    (hour >= 17 && hour <= 20);   // dinner 5–8

  // Decide how many orders to create this run
  let ordersCount = 0;
  const r = rng();
  if (isPeak) {
    // 2–3 orders most of the time
    if (r < 0.6) ordersCount = 2;
    else ordersCount = 3;
  } else {
    // Often 0, sometimes 1, rarely 2
    if (r < 0.5) ordersCount = 0;
    else if (r < 0.9) ordersCount = 1;
    else ordersCount = 2;
  }

  if (ordersCount === 0) {
    console.log(`Off-peak hour ${hour}, generated 0 fake orders this run.`);
    return [];
  }

  // --- Weekly changing preference: sometimes category, sometimes single item ---

  const categories = Array.from(
    new Set(menu.map((m) => (m.category ?? '').trim()).filter(Boolean))
  );

  const preferCategory = categories.length > 0 && rng() < 0.5;

  let favoredCategory: string | null = null;
  let favoredItemId: number | null = null;

  if (preferCategory) {
    // This week, prefer a category
    favoredCategory = categories[Math.floor(rng() * categories.length)];
    console.log(`Weekly favorite category for week ${weekKey}: ${favoredCategory}`);
  } else {
    // This week, prefer a specific item
    const item = menu[Math.floor(rng() * menu.length)];
    favoredItemId = item.item_id;
    console.log(`Weekly favorite item for week ${weekKey}: #${item.item_id} ${item.item_name}`);
  }

  // Create the orders
  const orderIds: number[] = [];
  for (let i = 0; i < ordersCount; i++) {
    const id = await createSyntheticOrder(menu, rng, favoredCategory, favoredItemId);
    if (id != null) orderIds.push(id);
  }

  console.log(
    `Generated ${orderIds.length} fake order(s) this run at hour ${hour} (peak: ${isPeak})`
  );

  return orderIds;
}