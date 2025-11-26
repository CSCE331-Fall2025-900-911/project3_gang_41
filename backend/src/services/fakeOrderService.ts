// backend/src/services/fakeOrderService.ts

import db, { runTransaction } from '../db';
import { deductInventory } from './inventoryService';
import type { MenuItem, OrderItem } from '@project3/shared';

const BUSINESS_TZ = 'America/Chicago';

// ---- Simple seeded RNG, used ONLY for weekly favorite selection ----
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

  const d = new Date(Date.UTC(year, month - 1, day));
  const oneJan = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((d.getTime() - oneJan.getTime()) / 86400000) + 1;
  const week = Math.floor((dayOfYear - 1) / 7) + 1;

  const weekKey = year * 100 + week; // e.g. 2025 week 13 => 202513
  return { hour, weekKey };
}

// Raw DB row type for menuitems
type MenuDbRow = {
  item_id: number;
  item_name: string;
  cost: number | string;
  category: string | null;
};

// Raw DB row type for employees
type EmployeeRow = {
  employee_id: number;
};

/**
 * Convert raw DB rows into shared MenuItem type.
 * - Ensures cost is a number
 * - Normalizes category to non-null string
 */
function normalizeMenuRows(rows: MenuDbRow[]): MenuItem[] {
  return rows.map((r) => ({
    item_id: r.item_id,
    item_name: r.item_name,
    cost: typeof r.cost === 'string' ? parseFloat(r.cost) || 0 : Number(r.cost) || 0,
    category: (r.category ?? 'Uncategorized').trim() || 'Uncategorized',
  }));
}

/**
 * Weighted random choice of a menu item, with bias toward a favored
 * category or a favored item. Uses Math.random() so each run is different.
 */
function pickWeightedMenuItem(
  menu: MenuItem[],
  favoredCategory: string | null,
  favoredItemId: number | null
): MenuItem {
  const BASE = 1;
  const FAVORITE_MULTIPLIER = 4;

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

  let r = Math.random() * total;
  for (let i = 0; i < menu.length; i++) {
    r -= weights[i];
    if (r <= 0) return menu[i];
  }
  return menu[menu.length - 1];
}

/**
 * Create a single synthetic order in the DB and deduct inventory.
 * Returns the new orderid or null if it could not be created.
 */
async function createSyntheticOrder(
  menu: MenuItem[],
  favoredCategory: string | null,
  favoredItemId: number | null,
  employeeIds: number[]
): Promise<number | null> {
  if (menu.length === 0) return null;

  // 1–4 items per order (per-run randomness)
  const numItems = 1 + Math.floor(Math.random() * 4);
  const chosen: OrderItem[] = [];

  for (let i = 0; i < numItems; i++) {
    const item = pickWeightedMenuItem(menu, favoredCategory, favoredItemId);
    const quantity = 1 + Math.floor(Math.random() * 3); // 1–3 units
    chosen.push({
      item_id: item.item_id,
      item_name: item.item_name,
      cost: item.cost,
      quantity,
    });
  }

  // Aggregate duplicates (OrderItem from shared types)
  const agg = new Map<number, OrderItem>();
  for (const c of chosen) {
    const existing = agg.get(c.item_id);
    if (existing) existing.quantity += c.quantity;
    else agg.set(c.item_id, { ...c });
  }
  const aggregatedItems = Array.from(agg.values());

  // Insert into order_history (same structure as real orders)
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
      paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

    const customerid = 0;

    // Pick a random existing employee, or 0 if no employees in DB
    const employeeId =
      employeeIds.length > 0
        ? employeeIds[Math.floor(Math.random() * employeeIds.length)]
        : 0;

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

  // Deduct inventory using shared item_id + quantity shape
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
 * Entry point for the bot:
 * - Decides how many orders this run (0–3) with peak-hour bias
 * - Picks a weekly favorite (category OR item) using a deterministic seed
 * - Uses random selection per run so actual orders vary
 */
export async function generateFakeOrdersForRun(): Promise<number[]> {
  // Load raw menu rows and normalize into shared MenuItem
  const { rows: rawMenu } = await db.query<MenuDbRow>(
    'SELECT item_id, item_name, cost, category FROM menuitems'
  );
  const menu = normalizeMenuRows(rawMenu);

  if (menu.length === 0) {
    console.warn('No menu items found; cannot generate fake orders.');
    return [];
  }

  // Load employees so we can assign orders to real cashiers
  const { rows: employees } = await db.query<EmployeeRow>(
    'SELECT employee_id FROM employees'
  );
  const employeeIds = employees.map((e) => e.employee_id);

  const now = new Date();
  const { hour, weekKey } = getBusinessHourAndWeekKey(now);

  // Peak vs off-peak based on business-local hour
  const isPeak =
    (hour >= 11 && hour <= 13) || // lunch 11–1
    (hour >= 17 && hour <= 20);   // dinner 5–8

  // Decide how many orders to create this run (per-run randomness)
  let ordersCount = 0;
  const r = Math.random();
  if (isPeak) {
    // 2–3 orders most of the time
    ordersCount = r < 0.6 ? 2 : 3;
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

  // --- Weekly changing preference: deterministic, but only affects weights ---
  const categories = Array.from(
    new Set(menu.map((m) => (m.category ?? '').trim()).filter(Boolean))
  );

  const weekRng = mulberry32(weekKey); // used ONLY for weekly favorite
  const preferCategory = categories.length > 0 && weekRng() < 0.5;

  let favoredCategory: string | null = null;
  let favoredItemId: number | null = null;

  if (preferCategory) {
    favoredCategory = categories[Math.floor(weekRng() * categories.length)];
    console.log(`Weekly favorite category for week ${weekKey}: ${favoredCategory}`);
  } else {
    const item = menu[Math.floor(weekRng() * menu.length)];
    favoredItemId = item.item_id;
    console.log(
      `Weekly favorite item for week ${weekKey}: #${item.item_id} ${item.item_name}`
    );
  }

  // Now actually create the orders (each run will differ due to Math.random)
  const orderIds: number[] = [];
  for (let i = 0; i < ordersCount; i++) {
    const id = await createSyntheticOrder(
      menu,
      favoredCategory,
      favoredItemId,
      employeeIds
    );
    if (id != null) orderIds.push(id);
  }

  console.log(
    `Generated ${orderIds.length} fake order(s) this run at hour ${hour} (peak: ${isPeak})`
  );
  return orderIds;
}