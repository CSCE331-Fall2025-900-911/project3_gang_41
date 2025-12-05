import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import db from './db';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. Lookup by Phone (Kiosk quick login)
router.post('/lookup', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return sendError(res, 'Phone number required', 400);

  try {
    const result = await db.query(
      'SELECT customers_id, customer_name, points FROM customers WHERE phone_number = $1', 
      [phone]
    );

    if (result.rows.length > 0) {
      sendSuccess(res, { found: true, customer: result.rows[0] });
    } else {
      sendSuccess(res, { found: false });
    }
  } catch (error) {
    console.error('Customer lookup error:', error);
    sendError(res, 'Database error');
  }
});

// 2. Register new customer (Phone)
router.post('/register', async (req: Request, res: Response) => {
  const { phone, name } = req.body;
  if (!phone || !name) return sendError(res, 'Phone and Name required', 400);

  try {
    const result = await db.query(
      `INSERT INTO customers (phone_number, customer_name, points, sign_up_date) 
       VALUES ($1, $2, 50, NOW()) -- Bonus 50 points for signing up
       RETURNING customers_id, customer_name, points`,
      [phone, name]
    );
    sendSuccess(res, result.rows[0], 'Registration successful');
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
        return sendError(res, 'Phone number already registered', 409);
    }
    console.error('Registration error:', error);
    sendError(res, 'Registration failed');
  }
});

// 3. Google Auth (Verify & Login/Register)
router.post('/google', async (req: Request, res: Response) => {
  const { credential } = req.body;
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    if (!payload || !payload.sub) throw new Error("Invalid Token");

    const googleSub = payload.sub;
    const email = payload.email;
    const name = payload.name || "Valued Customer";

    // Check if exists
    const existing = await db.query(
      'SELECT customers_id, customer_name, points FROM customers WHERE google_sub = $1 OR email = $2',
      [googleSub, email]
    );

    if (existing.rows.length > 0) {
      // Update google_sub if matched by email but sub is missing
      if (!existing.rows[0].google_sub) {
         await db.query('UPDATE customers SET google_sub = $1 WHERE customers_id = $2', [googleSub, existing.rows[0].customers_id]);
      }
      return sendSuccess(res, existing.rows[0]);
    }

    // Create new
    const newUser = await db.query(
      `INSERT INTO customers (customer_name, email, google_sub, points, sign_up_date)
       VALUES ($1, $2, $3, 50, NOW())
       RETURNING customers_id, customer_name, points`,
      [name, email, googleSub]
    );

    sendSuccess(res, newUser.rows[0]);
  } catch (error) {
    console.error('Google Customer Auth Error:', error);
    sendError(res, 'Authentication failed');
  }
});

// 4. Get Customer Past Orders
router.get('/:id/orders', async (req: Request, res: Response) => {
  const customerId = parseInt(req.params.id);
  if (isNaN(customerId)) return sendError(res, 'Invalid Customer ID', 400);

  try {
    const sql = `
      SELECT 
        orderid,
        MIN(orderdate) as order_date,
        SUM(totalprice) as total_price,
        json_agg(json_build_object('name', itemname, 'qty', quantity)) as items
      FROM order_history
      WHERE customerid = $1
      GROUP BY orderid
      ORDER BY orderid DESC
      LIMIT 10
    `;
    
    const result = await db.query(sql, [customerId]);
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Error fetching past orders:', error);
    sendError(res, 'Failed to fetch history');
  }
});
export default router;