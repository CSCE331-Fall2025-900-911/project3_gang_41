import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import db from './db';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. Lookup by Phone OR Email
router.post('/lookup', async (req: Request, res: Response) => {
  const { phone, email } = req.body;
  
  if (!phone && !email) {
      return sendError(res, 'Phone number or Email required', 400);
  }

  try {
    let query = '';
    let params: any[] = [];

    if (phone) {
        query = 'SELECT customers_id, customer_name, points, email, phone_number FROM customers WHERE phone_number = $1';
        params = [phone];
    } else {
        // Use ILIKE for case-insensitive email matching just in case
        query = 'SELECT customers_id, customer_name, points, email, phone_number FROM customers WHERE email = $1';
        params = [email];
    }

    const result = await db.query(query, params);

    if (result.rows.length > 0) {
      sendSuccess(res, { found: true, customer: result.rows[0] });
    } else {
      sendSuccess(res, { found: false });
    }
  } catch (error) {
    console.error('Customer lookup error:', error);
    sendError(res, 'Database error during lookup');
  }
});

// 2. Register new customer (Phone OR Email)
router.post('/register', async (req: Request, res: Response) => {
  const { phone, email, name } = req.body;

  // Validate inputs
  if (!name) {
      return sendError(res, 'Name is required', 400);
  }
  if (!phone && !email) {
      return sendError(res, 'Either Phone or Email is required', 400);
  }

  try {
    // Explicitly handle nulls for SQL
    const phoneVal = phone && phone.length > 0 ? phone : null;
    const emailVal = email && email.length > 0 ? email : null;

    const result = await db.query(
      `INSERT INTO customers (phone_number, email, customer_name, points, sign_up_date) 
       VALUES ($1, $2, $3, 50, NOW()) 
       RETURNING customers_id, customer_name, points, email, phone_number`,
      [phoneVal, emailVal, name]
    );
    
    sendSuccess(res, result.rows[0], 'Registration successful');
  } catch (error: any) {
    // Handle Postgres Unique Violation (code 23505)
    if (error.code === '23505') { 
        return sendError(res, 'Phone number or Email already registered', 409);
    }
    console.error('Registration error:', error);
    sendError(res, 'Registration failed');
  }
});

// ... (Rest of routes: /google, /:id/orders remain unchanged) ...
// Ensure you keep the Google auth and Order History routes below this in your file.
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
  
      const existing = await db.query(
        'SELECT customers_id, customer_name, points FROM customers WHERE google_sub = $1 OR email = $2',
        [googleSub, email]
      );
  
      if (existing.rows.length > 0) {
        if (!existing.rows[0].google_sub) {
           await db.query('UPDATE customers SET google_sub = $1 WHERE customers_id = $2', [googleSub, existing.rows[0].customers_id]);
        }
        return sendSuccess(res, existing.rows[0]);
      }
  
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