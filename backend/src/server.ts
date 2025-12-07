import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

import pool, { closePool } from './db';
import menuRoutes from './menuRoutes';
import inventoryRoutes from './inventoryRoutes';
import orderHistoryRoutes from './orderHistoryRoutes';
import salesReportRoutes from './salesReportRoutes';
import employeeRoutes from './employeeRoutes';
import reportsRoutes from './reportsRoutes';
import customerRoutes from './customerRoutes';
import { generateFakeOrdersForRun } from './services/fakeOrderService';
import { sendSuccess, sendError } from './utils/response';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Time constants (in milliseconds)
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 15 * MS_PER_MINUTE;
const RATE_LIMIT_MAX_REQUESTS = 2000;

// Session configuration
const SESSION_MAX_AGE_MS = MS_PER_DAY;

// Weather cache duration (5 minutes)
const WEATHER_CACHE_TTL_MS = 5 * MS_PER_MINUTE;

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface SessionUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface GoogleVerifyRequestBody {
  credential?: string;
}

interface WeatherCache {
  data: { temperature: number; icon: string } | null;
  timestamp: number;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth Client Setup
// ─────────────────────────────────────────────────────────────────────────────

const googleClientId = process.env.GOOGLE_CLIENT_ID;
if (!googleClientId) {
  console.warn('[Auth] GOOGLE_CLIENT_ID not set. Google OAuth will not work.');
}
const oauthClient = new OAuth2Client(googleClientId);

// ─────────────────────────────────────────────────────────────────────────────
// Express App Setup
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

// Trust proxy for production environments (Render, Vercel, etc.)
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use(helmet());
app.use(compression());

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

// ─────────────────────────────────────────────────────────────────────────────
// CORS Configuration
// ─────────────────────────────────────────────────────────────────────────────

const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// ─────────────────────────────────────────────────────────────────────────────
// Session Configuration
// ─────────────────────────────────────────────────────────────────────────────

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && IS_PRODUCTION) {
  throw new Error('SESSION_SECRET must be set in production');
}

app.use(
  session({
    secret: sessionSecret || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: IS_PRODUCTION,
      sameSite: IS_PRODUCTION ? 'none' : 'lax',
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Weather Cache (Simple in-memory cache)
// ─────────────────────────────────────────────────────────────────────────────

const weatherCache: WeatherCache = { data: null, timestamp: 0 };

/**
 * Maps weather forecast text to an icon name.
 */
const getWeatherIcon = (forecast: string): string => {
  const lowerForecast = forecast.toLowerCase();

  if (lowerForecast.includes('thunder') || lowerForecast.includes('storm')) {
    return 'cloud-lightning';
  }
  if (lowerForecast.includes('rain') || lowerForecast.includes('shower')) {
    return 'cloud-rain';
  }
  if (lowerForecast.includes('wind')) {
    return 'wind';
  }
  if (lowerForecast.includes('cloudy') && !lowerForecast.includes('partly')) {
    return 'cloud';
  }
  if (lowerForecast.includes('partly')) {
    return 'cloud-sun';
  }
  return 'sun';
};

// ─────────────────────────────────────────────────────────────────────────────
// Health Check Route
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    const currentTime = result.rows[0]?.current_time;

    return sendSuccess(res, {
      status: 'healthy',
      database: 'connected',
      timestamp: currentTime,
      uptime: process.uptime(),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Health] Database check failed:', errorMessage);
    return sendError(res, `Database disconnected: ${errorMessage}`, 503);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/inventory', inventoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/order-history', orderHistoryRoutes);
app.use('/api/sales-report', salesReportRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/customers', customerRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Weather Proxy Route (with caching)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/weather/current', async (_req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');

    // Return cached data if still valid
    const now = Date.now();
    if (weatherCache.data && now - weatherCache.timestamp < WEATHER_CACHE_TTL_MS) {
      return sendSuccess(res, weatherCache.data);
    }

    const response = await fetch(
      'https://api.weather.gov/gridpoints/HGX/26,133/forecast',
      {
        headers: { 'User-Agent': 'Restaurant POS System Project' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Weather API returned status ${response.status}`);
    }

    const data = await response.json();
    const currentPeriod = data?.properties?.periods?.[0];

    if (!currentPeriod) {
      throw new Error('Invalid weather API response structure');
    }

    const weatherData = {
      temperature: currentPeriod.temperature,
      icon: getWeatherIcon(currentPeriod.shortForecast),
    };

    // Update cache
    weatherCache.data = weatherData;
    weatherCache.timestamp = now;

    return sendSuccess(res, weatherData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Weather] Fetch error:', errorMessage);

    // Return stale cache if available
    if (weatherCache.data) {
      console.warn('[Weather] Returning stale cached data');
      return sendSuccess(res, weatherCache.data);
    }

    return sendError(res, 'Failed to fetch weather data', 502);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Routes
// ─────────────────────────────────────────────────────────────────────────────

app.post('/auth/google/verify', async (req: Request<{}, {}, GoogleVerifyRequestBody>, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      return sendError(res, 'Missing or invalid credential', 400);
    }

    if (!googleClientId) {
      return sendError(res, 'OAuth not configured', 503);
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload: TokenPayload | undefined = ticket.getPayload();

    if (!payload?.sub || !payload?.email || !payload?.name) {
      return sendError(res, 'Invalid token payload', 401);
    }

    const user: SessionUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

    req.session.user = user;

    return new Promise<void>((resolve) => {
      req.session.save((err) => {
        if (err) {
          console.error('[Auth] Session save error:', err);
          sendError(res, 'Failed to save session', 500);
        } else {
          sendSuccess(res, { user });
        }
        resolve();
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth] Verification error:', errorMessage);
    return sendError(res, 'Token verification failed', 401);
  }
});

app.get('/auth/user', (req: Request, res: Response) => {
  if (req.session.user) {
    return sendSuccess(res, { user: req.session.user });
  }
  return sendError(res, 'Not authenticated', 401);
});

app.post('/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('[Auth] Logout error:', err);
    }
    res.clearCookie('connect.sid');
    return sendSuccess(res, { loggedOut: true });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal Routes
// ─────────────────────────────────────────────────────────────────────────────

app.post('/internal/generate-fake-orders', async (_req: Request, res: Response) => {
  try {
    const orderIds = await generateFakeOrdersForRun();
    return sendSuccess(res, { createdOrders: orderIds });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Orders] Fake order generation failed:', errorMessage);
    return sendError(res, 'Failed to generate fake orders', 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  return sendError(res, IS_PRODUCTION ? 'Internal server error' : err.message, 500);
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  return sendError(res, 'Route not found', 404);
});

// ─────────────────────────────────────────────────────────────────────────────
// Server Startup & Graceful Shutdown
// ─────────────────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
});

const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] HTTP server closed');
    await closePool();
    console.log('[Server] Shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;