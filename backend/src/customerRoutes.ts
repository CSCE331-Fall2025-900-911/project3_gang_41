import express, { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import db from './db';
import { sendSuccess, sendError } from './utils/response';
import { buildInsertQuery } from './utils/sql';
import { Customer } from '@project3/shared';

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
        query = 'SELECT * FROM customers WHERE phone_number = $1';
        params = [phone];
    } else {
        query = 'SELECT * FROM customers WHERE email = $1';
        params = [email];
    }

    // Use generic with Shared Type
    const result = await db.query<Customer>(query, params);

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

// 2. Register new customer
router.post('/register', async (req: Request, res: Response) => {
  const { phone, email, name } = req.body;

  if (!name) return sendError(res, 'Name is required', 400);
  if (!phone && !email) return sendError(res, 'Either Phone or Email is required', 400);

  try {
    const phoneVal = phone && phone.length > 0 ? phone : null;
    const emailVal = email && email.length > 0 ? email : null;

    const query = buildInsertQuery('customers', {
      phone_number: phoneVal,
      email: emailVal,
      customer_name: name,
      points: 50,
      sign_up_date: new Date()
    });
    if (!query) throw new Error('Failed to build query');
    const result = await db.query<Customer>(query.sql, query.values);
    sendSuccess(res, result.rows[0], 'Registration successful');
  } catch (error: any) {
    if (error.code === '23505') { 
        return sendError(res, 'Phone number or Email already registered', 409);
    }
    console.error('Registration error:', error);
    sendError(res, 'Registration failed');
  }
});

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
  
      const existing = await db.query<Customer>(
        'SELECT * FROM customers WHERE google_sub = $1 OR email = $2',
        [googleSub, email]
      );
  
      if (existing.rows.length > 0) {
        if (!existing.rows[0].google_sub) {
           await db.query('UPDATE customers SET google_sub = $1 WHERE customers_id = $2', [googleSub, existing.rows[0].customers_id]);
        }
        return sendSuccess(res, existing.rows[0]);
      }
  
      const query = buildInsertQuery('customers', {
        customer_name: name,
        email,
        google_sub: googleSub,
        points: 50,
        sign_up_date: new Date()
      });
      if (!query) throw new Error('Failed to build query');
      const newUser = await db.query<Customer>(query.sql, query.values);

      sendSuccess(res, newUser.rows[0]);
    } catch (error) {
      console.error('Google Customer Auth Error:', error);
      sendError(res, 'Authentication failed');
    }
});

// ... (Order history route remains similar, typically returns aggregate data not strict Customer type)

export default router;