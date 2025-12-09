import express, { Request, Response } from 'express';
import db, { runTransaction } from './db';
import { executeInventoryDeduction, validateInventoryAvailability } from './services/inventoryService';
import { 
  sendSuccess, 
  sendError, 
  sendBadRequest, 
  sendCreated
} from './utils/response';
import { POINTS_PER_DOLLAR, DrinkCustomization } from '@project3/shared';
import type { PoolClient } from 'pg';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────────────────────────────────────

const BUSINESS_TZ = 'America/Chicago';
const DEFAULT_PAGE_SIZE = 20;

interface OrderItemInput {
  item_id: number;
  item_name: string;
  cost: number;
  quantity: number;
  customization?: DrinkCustomization;
}

interface CreateOrderBody {
  items: OrderItemInput[];
  customerId?: number;
  employeeId?: number;
  paymentmethod?: string;
  pointsRedeemed?: number;
}

interface OrderHistoryQuery {
  page?: string;
  limit?: string;
  mode?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

/**
 * Creates a new order with atomic inventory deduction.
 * POST /api/order-history
 */
router.post('/', async (req: Request<{}, {}, CreateOrderBody>, res: Response) => {
  const { 
    items, 
    customerId, 
    employeeId, 
    paymentmethod, 
    pointsRedeemed 
  } = req.body;

  // 1. Strict Input Validation
  if (!Array.isArray(items) || items.length === 0) {
    return sendBadRequest(res, 'Order must contain at least one item');
  }

  const validatedItems: OrderItemInput[] = [];
  for (const item of items) {
    if (item.item_id === undefined || item.item_id === null || !item.quantity || item.quantity <= 0) {
      return sendBadRequest(res, 'Invalid item data');
    }
    validatedItems.push({
      item_id: Number(item.item_id),
      item_name: String(item.item_name).trim(),
      cost: Number(item.cost),
      quantity: Math.floor(Number(item.quantity)),
      // FIX: Ensure customization is passed through validation
      customization: item.customization || undefined, 
    });
  }

  const safeCustomerId = Number(customerId) || 0;
  const safeEmployeeId = Number(employeeId) || 0;
  const safePayment = paymentmethod || 'card';

  try {
    const orderId = await runTransaction(async (client: PoolClient) => {
      
      // 2. Pre-Check Inventory (Fail Fast)
      for (const item of validatedItems) {
        const hasStock = await validateInventoryAvailability(
          item.item_id, 
          item.quantity, 
          client 
        );
        if (!hasStock) {
          throw new Error(`INSUFFICIENT_STOCK: ${item.item_name}`);
        }
      }

      // 3. Get Next Sequence ID
      const seqResult = await client.query<{ new_id: string }>(
        "SELECT nextval(pg_get_serial_sequence('order_history', 'orderid')) AS new_id"
      );
      const newId = Number(seqResult.rows[0].new_id);

      // 4. Prepare Bulk Arrays
      const orderIds: number[] = [];
      const customerIds: number[] = [];
      const employeeIds: number[] = [];
      const paymentMethods: string[] = [];
      const menuItemIds: number[] = [];
      const itemNames: string[] = [];
      const quantities: number[] = [];
      const unitPrices: number[] = [];
      const totalPrices: number[] = [];
      const customizations: (string | null)[] = [];

      let orderTotal = 0;

      for (const item of validatedItems) {
        const lineTotal = item.cost * item.quantity;
        orderTotal += lineTotal;

        orderIds.push(newId);
        customerIds.push(safeCustomerId);
        employeeIds.push(safeEmployeeId);
        paymentMethods.push(safePayment);
        menuItemIds.push(item.item_id);
        itemNames.push(item.item_name);
        quantities.push(item.quantity);
        unitPrices.push(item.cost);
        totalPrices.push(lineTotal);
        // Serialize to JSON string, Postgres handles jsonb
        customizations.push(item.customization ? JSON.stringify(item.customization) : null);
      }

      // 5. Bulk Insert using UNNEST
      await client.query(
        `INSERT INTO order_history (
           orderid, customerid, employeeatcheckout, paymentmethod,
           menuitemid, itemname, quantity, unitprice, totalprice, customizations
         )
         SELECT * FROM unnest(
           $1::int[], $2::int[], $3::int[], $4::text[],
           $5::int[], $6::text[], $7::int[], $8::numeric[], $9::numeric[], $10::jsonb[]
         )`,
        [orderIds, customerIds, employeeIds, paymentMethods, menuItemIds, itemNames, quantities, unitPrices, totalPrices, customizations]
      );

      // 6. Atomic Inventory Deduction
      await executeInventoryDeduction(client, validatedItems.map(i => ({
        item_id: i.item_id,
        quantity: i.quantity
      })));

      // 7. Update Customer Points
      if (safeCustomerId > 0) {
        const pointsEarned = Math.floor(orderTotal * POINTS_PER_DOLLAR);
        const pointsUsed = Number(pointsRedeemed) || 0;
        
        await client.query(
          `UPDATE customers 
           SET points = points + $1 - $2,
               total_spent = COALESCE(total_spent, 0) + $3
           WHERE customers_id = $4`,
          [pointsEarned, pointsUsed, orderTotal, safeCustomerId]
        );
      }

      return newId;
    });

    return sendCreated(res, { orderid: orderId }, 'Order created successfully');

  } catch (err: any) {
    if (String(err.message).includes('INSUFFICIENT_STOCK')) {
      return sendBadRequest(res, err.message);
    }
    console.error('[Order] Creation failed:', err);
    return sendError(res, 'Failed to create order');
  }
});

/**
 * Retrieves paginated order history with aggregated items.
 * GET /api/order-history
 */
router.get('/', async (req: Request<{}, {}, {}, OrderHistoryQuery>, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;
    const isDashboard = req.query.mode === 'dashboard';

    const sql = `
      SELECT 
        orderid, 
        MAX(customerid) AS customerid,
        MIN(orderdate) AS orderdate,
        TO_CHAR(MIN(orderdate AT TIME ZONE $3), 'HH12:MI AM') AS order_time_label,
        MAX(employeeatcheckout) AS employeeatcheckout, 
        MAX(paymentmethod) AS paymentmethod,
        SUM(totalprice::numeric)::float AS total_order_price,
        json_agg(
          json_build_object(
            'name', itemname,
            'qty', quantity,
            'price', totalprice::numeric::float,
            'customization', customizations
          )
        ) AS items
      FROM order_history
      GROUP BY orderid
      ORDER BY orderid DESC
      OFFSET $1 LIMIT $2
    `;

    let totalCount = 0;
    if (!isDashboard) {
      const countResult = await db.query<{ count: string }>(
        'SELECT COUNT(DISTINCT orderid) AS count FROM order_history'
      );
      totalCount = parseInt(countResult.rows[0]?.count ?? '0', 10);
    }

    const dataResult = await db.query(sql, [offset, limit, BUSINESS_TZ]);

    return sendSuccess(res, {
      orders: dataResult.rows,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    });
  } catch (error) {
    console.error('[OrderHistory] Fetch failed:', error);
    return sendError(res, 'Failed to load order history');
  }
});

export default router;