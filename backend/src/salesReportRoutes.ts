import express, { Request, Response } from 'express';
import db from './db';

const router = express.Router();

// Record a sale in the current sales report
router.post('/', async (req: Request, res: Response) => {
  const { order_total, payment_method } = req.body as {
    order_total: number;
    payment_method: string;
  };

  if (order_total === undefined || !payment_method) {
    return res.status(400).json({ message: 'Missing order_total or payment_method' });
  }

  try {
    const sql = 'INSERT INTO current_sales_report (order_total, payment_method) VALUES ($1, $2)';
    await db.query(sql, [order_total, payment_method]);

    console.log(`Sales Report: $${order_total} via ${payment_method}`);
    res.json({ success: true, order_total, payment_method });
  } catch (error) {
    console.error('Error recording sale:', error);
    res.status(500).json({ message: 'Failed to record sale', error: String(error) });
  }
});

// Get sales report data (for manager dashboard)
router.get('/', async (req: Request, res: Response) => {
  try {
    const sql = 'SELECT * FROM current_sales_report ORDER BY id DESC';
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ message: 'Failed to fetch sales report' });
  }
});

export default router;
