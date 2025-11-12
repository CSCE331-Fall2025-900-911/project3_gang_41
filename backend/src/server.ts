import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db';
import menuRoutes from './menuRoutes';
import inventoryRoutes from './inventoryRoutes';
import orderHistoryRoutes from './orderHistoryRoutes';
import express from 'express'; // web framework handling http
import cors from 'cors'; // middleware from frontend to backend
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './db'; // db connection pool

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // Simple user object with Google profile data
    const user = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      picture: profile.photos?.[0]?.value
    };
    return done(null, user);
  }
));

app.get('/health', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'connected', time: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

app.get('/api/inventory', async (req: Request, res: Response) => {
    try {
        const sql = "SELECT * FROM inventory ORDER BY item_name ASC";
        const result = await pool.query(sql);
        res.json(result.rows);
    } catch (err: any) {
        console.error('Error fetching inventory:', err.message);
        res.status(500).json({ message: 'Failed to load inventory.' });
    }
});

app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/order-history', orderHistoryRoutes);


app.get('/api/menu', async (req, res) => {
  try {
    const result = await pool.query('SELECT item_id, item_name, cost FROM menuitems ORDER BY item_name');
    res.json(result.rows);
  } catch (err: any) {
    console.error('Error fetching menu - Full error:', err);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    res.status(500).json({
      error: 'Failed to fetch menu items',
      details: err.message,
      code: err.code
    });
  }
});

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to cashier
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/cashier`);
  }
);

// Get current user
app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});