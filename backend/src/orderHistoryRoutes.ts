import express, { Request, Response } from 'express';
import db from './db';
import { deductInventory } from './services/inventoryService';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();

// Business timezone must match reportsRoutes.ts
const BUSINESS_TZ = 'America/Chicago';

// Create Order
router.post('/', async (req: Request, res: Response) => {
  const { items, customerid, employeeId, paymentmethod } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return sendError(res, 'No items provided', 400);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "SELECT COALESCE(MAX(orderid), 0) + 1 AS new_id FROM order_history"
    );
    const orderid = Number(rows[0].new_id);

    // order_history.orderdate is now timestamptz with DEFAULT NOW()
    const insertSql = `
      INSERT INTO order_history
      (orderid, customerid, employeeatcheckout, paymentmethod, menuitemid, itemname, quantity, unitprice, totalprice)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const aggregated = new Map<number, any>();
    for (const item of items) {
      if (aggregated.has(item.item_id)) {
        aggregated.get(item.item_id).quantity += item.quantity;
      } else {
        aggregated.set(item.item_id, { ...item });
      }
    }

    for (const item of aggregated.values()) {
      const total = item.cost * item.quantity;
      await client.query(insertSql, [
        orderid,
        customerid || 0,
        employeeId || 0,
        paymentmethod || 'card',
        item.item_id,
        item.item_name,
        item.quantity,
        item.cost,
        total,
      ]);
    }

    await client.query('COMMIT');

    // Fire-and-forget inventory deduction
    deductInventory(
      Array.from(aggregated.values()).map(i => ({
        item_id: i.item_id,
        quantity: i.quantity,
      }))
    ).catch(e => console.error('Inventory deduction error', e));

    sendSuccess(res, { orderid }, 'Order created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    sendError(res, 'Failed to create order');
  } finally {
    client.release();
  }
});

// Get Order History
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const offset = (page - 1) * limit;

    // IMPORTANT:
    // - We keep MIN(orderdate) AS orderdate for HistoryPage.tsx (raw timestamp).
    // - We ADD order_time_label as a local-time string for DashboardPage.tsx.
    const sql = `
      SELECT 
        orderid, 
        MAX(customerid) as customerid,

        -- Raw earliest order timestamp for this order (still timestamptz in UTC)
        MIN(orderdate) as orderdate,

        -- Local time label, e.g. '08:33 PM' in BUSINESS_TZ
        TO_CHAR(
          MIN(orderdate AT TIME ZONE '${BUSINESS_TZ}'),
          'HH12:MI AM'
        ) as order_time_label,

        MAX(employeeatcheckout) as employeeatcheckout, 
        MAX(paymentmethod) as paymentmethod,
        SUM(totalprice::numeric)::float AS total_order_price,
        json_agg(
          json_build_object(
            'name', itemname, 
            'qty', quantity, 
            'price', totalprice::numeric::float
          )
        ) AS items
      FROM order_history
      GROUP BY orderid
      ORDER BY orderid DESC
      OFFSET $1 LIMIT $2
    `;

    const countResult = await db.query(
      'SELECT COUNT(DISTINCT orderid) FROM order_history'
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const dataResult = await db.query(sql, [offset, limit]);

    sendSuccess(res, {
      orders: dataResult.rows,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    sendError(res, 'Failed to load order history.');
  }
});

export default router;