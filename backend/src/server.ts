import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import helmet from "helmet"; // Security Headers
import rateLimit from "express-rate-limit"; // Rate Limiting
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

// --- 1. Security Middleware ---
app.use(helmet()); // Protects against common vulnerabilities

// Rate limiting: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 300, // Increased slightly for POS usage
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// --- 2. Configuration ---
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

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.set("trust proxy", 1); // Required for Render/Vercel

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

// --- 3. Session Configuration (MemoryStore) ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hrs
    },
  })
);

// --- 4. Routes ---
app.get("/health", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", database: "connected", time: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ status: "error", database: "disconnected", error: err.message });
  }
});

app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/order-history', orderHistoryRoutes);
app.use('/api/sales-report', salesReportRoutes);
app.use('/api/employees', employeeRoutes)
app.use('/api/employees/:id', employeeRoutes)

// Weather Proxy
app.get('/api/weather/current', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const response = await fetch(
      'https://api.weather.gov/gridpoints/HGX/26,133/forecast',
      { headers: { 'User-Agent': 'Restaurant POS System Project' } }
    );
    if (!response.ok) throw new Error("Weather API Error");
    
    const data = await response.json();
    const current = data.properties.periods[0];
    const forecast = current.shortForecast.toLowerCase();

    let icon = 'sun';
    if (forecast.includes('thunder') || forecast.includes('storm')) icon = 'cloud-lightning';
    else if (forecast.includes('rain') || forecast.includes('shower')) icon = 'cloud-rain';
    else if (forecast.includes('wind')) icon = 'wind';
    else if (forecast.includes('cloudy') && !forecast.includes('partly')) icon = 'cloud';
    else if (forecast.includes('partly')) icon = 'cloud-sun';

    res.json({ temperature: current.temperature, icon: icon });
  } catch (error) {
    console.error('Weather fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// --- 5. Auth Routes ---
app.post("/auth/google/verify", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "No credential provided" });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: "Invalid token" });

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
    console.error("Auth error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

app.get("/auth/user", (req, res) => {
  if (req.session.user) res.json(req.session.user);
  else res.status(401).json({ error: "Not authenticated" });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});