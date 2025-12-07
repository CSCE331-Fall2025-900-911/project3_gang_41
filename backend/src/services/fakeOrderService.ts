import db, { runTransaction } from '../db';
import { deductInventory } from './inventoryService';
import type { MenuItem, OrderItem } from '@project3/shared';

const BUSINESS_TZ = 'America/Chicago';

type RNG = () => number;
function mulberry32(seed: number): RNG {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getBusinessHourAndWeekKey(date: Date) {
  const dtParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false,
  }).formatToParts(date);
  const year = Number(dtParts.find((p) => p.type === 'year')?.value);
  const month = Number(dtParts.find((p) => p.type === 'month')?.value);
  const day = Number(dtParts.find((p) => p.type === 'day')?.value);
  const hour = Number(dtParts.find((p) => p.type === 'hour')?.value);
  
  const d = new Date(Date.UTC(year, month - 1, day));
  const week = Math.floor((Math.floor((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1 - 1) / 7) + 1;
  return { hour, weekKey: year * 100 + week };
}

type MenuDbRow = { item_id: number; item_name: string; cost: number | string; category: string | null; };

function normalizeMenuRows(rows: MenuDbRow[]): MenuItem[] {
  return rows.map((r) => ({
    item_id: r.item_id,
    item_name: r.item_name,
    cost: Number(r.cost) || 0,
    category: (r.category ?? 'Uncategorized').trim() || 'Uncategorized',
  }));
}

function pickWeightedMenuItem(menu: MenuItem[], favoredCategory: string | null, favoredItemId: number | null): MenuItem {
  const weights: number[] = [];
  let total = 0;
  for (const m of menu) {
    let w = 1;
    if (favoredItemId != null && m.item_id === favoredItemId) w *= 4;
    else if (favoredCategory && m.category === favoredCategory) w *= 4;
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

async function createSyntheticOrder(menu: MenuItem[], favoredCategory: string | null, favoredItemId: number | null, employeeIds: number[]) {
  if (menu.length === 0) return null;
  const numItems = 1 + Math.floor(Math.random() * 4);
  const agg = new Map<number, OrderItem>();

  for (let i = 0; i < numItems; i++) {
    const item = pickWeightedMenuItem(menu, favoredCategory, favoredItemId);
    const quantity = 1 + Math.floor(Math.random() * 3);
    const existing = agg.get(item.item_id);
    if (existing) existing.quantity += quantity;
    else agg.set(item.item_id, { item_id: item.item_id, item_name: item.item_name, cost: item.cost, quantity });
  }
  const items = Array.from(agg.values());

  const orderid = await runTransaction<number>(async (client) => {
    const { rows } = await client.query('SELECT COALESCE(MAX(orderid), 0) + 1 AS new_id FROM order_history');
    const newId = Number(rows[0].new_id);
    const employeeId = employeeIds.length > 0 ? employeeIds[Math.floor(Math.random() * employeeIds.length)] : 0;
    const payment = (['cash', 'card', 'mobile'] as const)[Math.floor(Math.random() * 3)];

    for (const item of items) {
      await client.query(
        `INSERT INTO order_history (orderid, customerid, employeeatcheckout, paymentmethod, menuitemid, itemname, quantity, unitprice, totalprice)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [newId, 0, employeeId, payment, item.item_id, item.item_name, item.quantity, item.cost, item.cost * item.quantity]
      );
    }
    return newId;
  });

  await deductInventory(items.map(it => ({ item_id: it.item_id, quantity: it.quantity }))).catch(console.error);
  return orderid;
}

export async function generateFakeOrdersForRun(): Promise<number[]> {
  const { rows: rawMenu } = await db.query<MenuDbRow>('SELECT item_id, item_name, cost, category FROM menuitems');
  const menu = normalizeMenuRows(rawMenu);
  if (menu.length === 0) return [];

  const { rows: employees } = await db.query<{employee_id: number}>('SELECT employee_id FROM employees');
  const employeeIds = employees.map((e) => e.employee_id);

  const { hour, weekKey } = getBusinessHourAndWeekKey(new Date());
  const isPeak = (hour >= 11 && hour <= 13) || (hour >= 17 && hour <= 20);
  const r = Math.random();
  let ordersCount = isPeak ? (r < 0.6 ? 2 : 3) : (r < 0.5 ? 0 : (r < 0.9 ? 1 : 2));
  if (ordersCount === 0) return [];

  const categories = Array.from(new Set(menu.map((m) => m.category).filter(Boolean)));
  const weekRng = mulberry32(weekKey);
  const preferCategory = categories.length > 0 && weekRng() < 0.5;
  let favCat: string | null = null;
  let favItem: number | null = null;

  if (preferCategory) favCat = categories[Math.floor(weekRng() * categories.length)];
  else favItem = menu[Math.floor(weekRng() * menu.length)].item_id;

  const orderIds: number[] = [];
  for (let i = 0; i < ordersCount; i++) {
    const id = await createSyntheticOrder(menu, favCat, favItem, employeeIds);
    if (id != null) orderIds.push(id);
  }
  return orderIds;
}