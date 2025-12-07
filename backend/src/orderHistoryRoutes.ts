import express, { Request, Response } from 'express';
import db, { runTransaction } from './db';
import { deductInventory } from './services/inventoryService';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();
const BUSINESS_TZ = 'America/Chicago';

// Create Order
router.post('/', async (req: Request, res: Response) => {
  const { items, customerId, employeeId, paymentmethod, pointsRedeemed, discountAmount } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return sendError(res, 'No items provided', 400);
  }

  try {
    const orderid = await runTransaction(async (client) => {
      // 1. Get New Order ID
      const { rows } = await client.query(
        "SELECT COALESCE(MAX(orderid), 0) + 1 AS new_id FROM order_history"
      );
      const newId = Number(rows[0].new_id);

      const insertSql = `
        INSERT INTO order_history
        (orderid, customerid, employeeatcheckout, paymentmethod, menuitemid, itemname, quantity, unitprice, totalprice)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      let orderTotal = 0;

      for (const item of items) {
        const lineTotal = Number(item.cost) * Number(item.quantity);
        orderTotal += lineTotal;
        
        await client.query(insertSql, [
          newId,
          customerId || 0, 
          employeeId || 0,
          paymentmethod || 'card',
          item.item_id,
          item.item_name,
          item.quantity,
          item.cost,
          lineTotal,
        ]);
      }

      if (customerId && customerId > 0) {
        const pointsEarned = Math.floor(orderTotal * 10);
        const pointsUsed = pointsRedeemed || 0;
        await client.query(
          `UPDATE customers 
           SET points = points + $1 - $2,
               total_spent = COALESCE(total_spent, 0) + $3
           WHERE customers_id = $4`,
           [pointsEarned, pointsUsed, orderTotal, customerId]
        );
      }

      return newId;
    });

    deductInventory(items).catch(e => console.error('Inventory deduction error', e));

    sendSuccess(res, { orderid }, 'Order created');
  } catch (err) {
    console.error(err);
    sendError(res, 'Failed to create order');
  }
});

// Get Order History
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const offset = (page - 1) * limit;

    const isDashboard = (req.query.mode as string) === 'dashboard';

    const sql = `
      SELECT 
        orderid, 
        MAX(customerid) as customerid,
        MIN(orderdate) as orderdate,
        TO_CHAR(MIN(orderdate AT TIME ZONE '${BUSINESS_TZ}'), 'HH12:MI AM') as order_time_label,
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

    let totalCount = 0;
    if (!isDashboard) {
      const countResult = await db.query('SELECT COUNT(DISTINCT orderid) FROM order_history');
      totalCount = parseInt(countResult.rows[0].count, 10);
    }

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