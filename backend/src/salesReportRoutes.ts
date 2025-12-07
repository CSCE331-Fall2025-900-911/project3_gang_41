import express, { Request, Response } from 'express';
import db from './db';
import { sendSuccess, sendError, sendBadRequest } from './utils/response';
import { buildInsertQuery } from './utils/sql';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {
  const { order_total, payment_method } = req.body as {
    order_total: number;
    payment_method: string;
  };

  if (order_total === undefined || !payment_method) {
    return sendBadRequest(res, 'Missing order_total or payment_method');
  }

  try {
    const query = buildInsertQuery('current_sales_report', {
      order_total,
      payment_method
    });

    if (!query) return sendBadRequest(res, 'Invalid sale data');

    await db.query(query.sql, query.values);
    sendSuccess(res, { order_total, payment_method }, 'Sale recorded');
  } catch (error) {
    console.error('Error recording sale:', error);
    sendError(res, 'Failed to record sale');
  }
});

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