import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import { OAuth2Client } from "google-auth-library";
import pool from "./db";
import menuRoutes from "./menuRoutes";
import inventoryRoutes from "./inventoryRoutes";
import orderHistoryRoutes from "./orderHistoryRoutes";

// Initialize Google OAuth2 Client for token verification
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
const PORT = process.env.PORT || 3000;

// Extend Express Session type to include user data
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

// Allow comma-separated list in FRONTEND_URL
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }) as any
);

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

app.get("/api/inventory", async (req: Request, res: Response) => {
  try {
    const sql = "SELECT * FROM inventory ORDER BY item_name ASC";
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err: any) {
    console.error("Error fetching inventory:", err.message);
    res.status(500).json({ message: "Failed to load inventory." });
  }
});

app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/order-history', orderHistoryRoutes);

// Google OAuth token verification endpoint
app.post("/auth/google/verify", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "No credential provided" });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Create user object from Google profile
    const user = {
      id: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture,
    };

    // Store user in session
    req.session.user = user;

    // Save session and respond
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

// Get current user from session
app.get("/auth/user", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Logout endpoint
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

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
