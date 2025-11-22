import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { OAuth2Client } from "google-auth-library";
import pool from "./db";
import menuRoutes from "./menuRoutes";
import inventoryRoutes from "./inventoryRoutes";
import orderHistoryRoutes from "./orderHistoryRoutes";
import salesReportRoutes from "./salesReportRoutes";
import employeeRoutes from "./employeeRoutes";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const app = express();
const PORT = process.env.PORT || 3000;

// Extend session type to include user data from Google OAuth
declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };
  }
}

// Support multiple frontend origins (comma-separated)
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

// Trust proxy headers for correct client IP and session handling
app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

const PgSessionStore = pgSession(session);

app.use(
  session({
    store: new PgSessionStore({
      pool: pool, // Use your existing DB pool from ./db.ts
      tableName: 'session', // You must create this table in Postgres
      createTableIfMissing: true // This will create the table for you automatically
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours 🐄
    },
  })
);

// Health check with DB ping
app.get("/health", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", database: "connected", time: result.rows[0] });
  } catch (err: any) {
    res
      .status(500)
      .json({ status: "error", database: "disconnected", error: err.message });
  }
});

// API routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/order-history', orderHistoryRoutes);
app.use('/api/sales-report', salesReportRoutes);
app.use('/api/employees', employeeRoutes)
app.use('/api/employees/:id', employeeRoutes)

// National Weather endpoint for TAMU
app.get('/api/weather/current', async (req: Request, res: Response) => {
  try {
    // Disable caching to ensure fresh weather data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const response = await fetch(
      'https://api.weather.gov/gridpoints/HGX/26,133/forecast',
      {
        headers: { 'User-Agent': 'Restaurant POS System Project' },
        cache: 'no-store'
      }
    );
    const data = await response.json();

    const current = data.properties.periods[0];
    const forecast = current.shortForecast.toLowerCase();

    let icon = 'sun'; // default sunny if no other match
    if (forecast.includes('thunder') || forecast.includes('storm')) icon = 'cloud-lightning';
    else if (forecast.includes('rain') || forecast.includes('shower')) icon = 'cloud-rain';
    else if (forecast.includes('wind')) icon = 'wind';
    else if (forecast.includes('cloudy') && !forecast.includes('partly')) icon = 'cloud';
    else if (forecast.includes('partly')) icon = 'cloud-sun';

    res.json({
      temperature: current.temperature,
      icon: icon
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Verify Google OAuth token and create session
app.post("/auth/google/verify", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "No credential provided" });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const user = {
      id: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
    };

    req.session.user = user;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Failed to save session" });
      }
      res.json({ success: true, user });
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Get current authenticated user
app.get("/auth/user", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Destroy session and logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});