import db, { runTransaction } from '../db';
import { executeInventoryDeduction } from './inventoryService';
import { 
  MenuItem, 
  MS_PER_DAY, 
  PaymentMethod, 
  DrinkCustomization,
  // Import Constants to ensure data matches frontend logic exactly
  TOPPING_OPTIONS,
  SWEETNESS_OPTIONS,
  ICE_OPTIONS,
  SIZE_OPTIONS,
  SIZE_PRICE_MODIFIERS,
  TOPPING_PRICE
} from '@project3/shared';
import type { PoolClient } from 'pg';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const BUSINESS_TZ = 'America/Chicago';
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'digital'];

/**
 * Generates a realistic drink customization for fake orders.
 * Uses the EXACT keys from shared/constants to ensure badges render correctly.
 */
function generateRandomCustomization(): DrinkCustomization | null {
  // 70% chance of having customizations, 30% basic drink
  if (Math.random() > 0.7) {
    return null;
  }

  const numToppings = Math.floor(Math.random() * 3); // 0-2 toppings
  const toppings: string[] = [];
  
  // Create a mutable copy of the readonly constant to pick from
  const availableToppings = [...TOPPING_OPTIONS];
  
  for (let i = 0; i < numToppings; i++) {
    if (availableToppings.length === 0) break;
    const index = Math.floor(Math.random() * availableToppings.length);
    // Splice ensures we don't pick the same topping twice
    toppings.push(availableToppings.splice(index, 1)[0]);
  }

  return {
    sweetness: SWEETNESS_OPTIONS[Math.floor(Math.random() * SWEETNESS_OPTIONS.length)],
    ice: ICE_OPTIONS[Math.floor(Math.random() * ICE_OPTIONS.length)],
    size: SIZE_OPTIONS[Math.floor(Math.random() * SIZE_OPTIONS.length)],
    temperature: Math.random() > 0.3 ? 'cold' : 'hot', // 70% cold, 30% hot
    toppings: toppings.sort() // Sort for consistent ordering
  };
}

/**
 * Calculates the real price of a specific item instance based on customization.
 * Matches the frontend cart logic.
 */
function calculateAdjustedPrice(basePrice: number, customization: DrinkCustomization | null): number {
  if (!customization) return basePrice;

  let price = basePrice;

  // Apply Size Modifier (e.g., -1.00 for small, +1.25 for large)
  const sizeMod = SIZE_PRICE_MODIFIERS[customization.size];
  if (sizeMod !== undefined) {
    price += sizeMod;
  }

  // Apply Topping Cost
  if (customization.toppings.length > 0) {
    price += (customization.toppings.length * TOPPING_PRICE);
  }

  // Prevent negative prices just in case
  return Math.max(0, price);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (Mulberry32 & Date Logic)
// ─────────────────────────────────────────────────────────────────────────────

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
  const week = Math.floor((Math.floor((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / MS_PER_DAY) + 1 - 1) / 7) + 1;
  return { hour, weekKey: year * 100 + week };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logic
// ─────────────────────────────────────────────────────────────────────────────

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
        r -= weights[i]!;
        if (r <= 0) return menu[i]!;
    }
    return menu[menu.length - 1]!;
}

async function createSyntheticOrder(
  menu: MenuItem[],
  favoredCategory: string | null,
  favoredItemId: number | null,
  employeeIds: number[]
): Promise<number | null> {
  if (menu.length === 0) return null;

  const numItems = 1 + Math.floor(Math.random() * 4);
  const itemsMap = new Map<number, { item: MenuItem; qty: number }>();

  // Consolidate base items first
  for (let i = 0; i < numItems; i++) {
    const item = pickWeightedMenuItem(menu, favoredCategory, favoredItemId);
    const current = itemsMap.get(item.item_id);
    if (current) {
      current.qty += (1 + Math.floor(Math.random() * 2));
    } else {
      itemsMap.set(item.item_id, { 
        item, 
        qty: 1 + Math.floor(Math.random() * 2) 
      });
    }
  }

  const employeeId = employeeIds[Math.floor(Math.random() * employeeIds.length)] || 0;
  const paymentMethod = VALID_PAYMENT_METHODS[Math.floor(Math.random() * VALID_PAYMENT_METHODS.length)]!;

  return runTransaction(async (client: PoolClient) => {
    // 1. Get next order ID securely
    const seqResult = await client.query<{ new_id: string }>(
      "SELECT nextval(pg_get_serial_sequence('order_history', 'orderid')) AS new_id"
    );
    const newId = Number(seqResult.rows[0].new_id);

    // 2. Prepare Bulk Data
    const orderIds: number[] = [];
    const customerIds: number[] = [];
    const employeeIdsArr: number[] = [];
    const methods: string[] = [];
    const menuIds: number[] = [];
    const names: string[] = [];
    const qtys: number[] = [];
    const prices: number[] = []; // Unit price (adjusted)
    const totals: number[] = []; // Total price (adjusted * quantity)
    const customizations: (string | null)[] = [];

    const deductionRequests: { item_id: number; quantity: number }[] = [];

    for (const { item, qty } of itemsMap.values()) {
      // Generate customization
      const customization = generateRandomCustomization();
      
      // Calculate REAL price including size and toppings
      const adjustedUnitPrice = calculateAdjustedPrice(item.cost, customization);
      const lineTotal = adjustedUnitPrice * qty;

      orderIds.push(newId);
      customerIds.push(0); // Anonymous customer
      employeeIdsArr.push(employeeId);
      methods.push(paymentMethod);
      menuIds.push(item.item_id);
      names.push(item.item_name);
      qtys.push(qty);
      prices.push(adjustedUnitPrice); // Corrected unit price
      totals.push(lineTotal);         // Corrected total
      
      customizations.push(customization ? JSON.stringify(customization) : null);
      deductionRequests.push({ item_id: item.item_id, quantity: qty });
    }

    // 3. Bulk Insert
    await client.query(
      `INSERT INTO order_history (
         orderid, customerid, employeeatcheckout, paymentmethod,
         menuitemid, itemname, quantity, unitprice, totalprice, customizations
       )
       SELECT * FROM unnest(
         $1::int[], $2::int[], $3::int[], $4::text[],
         $5::int[], $6::text[], $7::int[], $8::numeric[], $9::numeric[], $10::jsonb[]
       )`,
      [orderIds, customerIds, employeeIdsArr, methods, menuIds, names, qtys, prices, totals, customizations]
    );

    // 4. Atomic Inventory Deduction
    await executeInventoryDeduction(client, deductionRequests);

    return newId;
  });
}

/**
 * Generates fake orders for the current time slot.
 */
export async function generateFakeOrdersForRun(): Promise<number[]> {
  const { rows: rawMenu } = await db.query<MenuItem>('SELECT item_id, item_name, cost, category FROM menuitems');
  const menu: MenuItem[] = rawMenu.map((r) => ({ ...r, cost: Number(r.cost) }));
  if (menu.length === 0) return [];

  const { rows: employees } = await db.query<{ employee_id: number }>('SELECT employee_id FROM employees');
  const employeeIds = employees.map((e) => e.employee_id);

  const { hour, weekKey } = getBusinessHourAndWeekKey(new Date());
  
  // Peak Logic
  const LUNCH_PEAK_START = 11;
  const LUNCH_PEAK_END = 13;
  const DINNER_PEAK_START = 17;
  const DINNER_PEAK_END = 20;

  const isPeak = (hour >= LUNCH_PEAK_START && hour <= LUNCH_PEAK_END) || 
                 (hour >= DINNER_PEAK_START && hour <= DINNER_PEAK_END);

  const r = Math.random();
  const ordersCount = isPeak ? (r < 0.6 ? 2 : 3) : (r < 0.5 ? 0 : (r < 0.9 ? 1 : 2));
  
  if (ordersCount === 0) return [];

  const categories = Array.from(new Set(menu.map((m) => m.category).filter(Boolean)));
  const weekRng = mulberry32(weekKey);
  const preferCategory = categories.length > 0 && weekRng() < 0.5;
  let favCat: string | null = null;
  let favItem: number | null = null;

  if (preferCategory && categories.length > 0) {
    favCat = categories[Math.floor(weekRng() * categories.length)]!;
  } else if (menu.length > 0) {
    favItem = menu[Math.floor(weekRng() * menu.length)]!.item_id;
  }

  const orderIds: number[] = [];
  for (let i = 0; i < ordersCount; i++) {
    const id = await createSyntheticOrder(menu, favCat, favItem, employeeIds);
    if (id != null) orderIds.push(id);
  }
  return orderIds;
}