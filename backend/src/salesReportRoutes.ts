import express, { Request, Response } from 'express';
import db from './db';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();

// Record a sale in the current sales report
router.post('/', async (req: Request, res: Response) => {
  const { order_total, payment_method } = req.body as {
    order_total: number;
    payment_method: string;
  };

  if (order_total === undefined || !payment_method) {
    return sendError(res, 'Missing order_total or payment_method', 400);
  }

  try {
    const sql = 'INSERT INTO current_sales_report (order_total, payment_method) VALUES ($1, $2)';
    await db.query(sql, [order_total, payment_method]);

    console.log(`Sales Report: $${order_total} via ${payment_method}`);
    sendSuccess(res, { order_total, payment_method }, 'Sale recorded');
  } catch (error) {
    console.error('Error recording sale:', error);
    sendError(res, 'Failed to record sale');
  }
});

// Get sales report data (for manager dashboard)
router.get('/', async (req: Request, res: Response) => {
  try {
    const sql = 'SELECT * FROM current_sales_report ORDER BY id DESC';
    const result = await db.query(sql);
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    sendError(res, 'Failed to fetch sales report');
  }
});

export default router;
