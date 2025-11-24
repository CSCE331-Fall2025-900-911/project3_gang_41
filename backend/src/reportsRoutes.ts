import express, { Request, Response } from 'express';
import db from './db';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();

// Business timezone: change if needed (e.g. 'America/New_York', 'Europe/London')
const BUSINESS_TZ = 'America/Chicago';

router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { range } = req.query;
    const client = await db.connect();

    // orderdate is stored as timestamptz (UTC).
    // We view it in local business time via AT TIME ZONE.
    const localTs = `(orderdate AT TIME ZONE '${BUSINESS_TZ}')`;
    const nowLocal = `(NOW() AT TIME ZONE '${BUSINESS_TZ}')`;

    let dateFilter = '';
    let timeGroupSelect = '';
    let timeLabelSelect = '';

    if (range === 'week') {
      // Last 7 *calendar* days in local time, including today.
      // If today is 2025-11-22 locally, this covers 11-16 .. 11-22.
      const startLocal = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '6 days'`;
      dateFilter = `${localTs} >= ${startLocal}`;

      timeGroupSelect = `DATE(${localTs})`;
      timeLabelSelect = `TO_CHAR(${localTs}, 'Dy MM/DD')`;

    } else if (range === 'month') {
      // Last 30 days in local time (rolling 30-day window).
      const startLocal = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '29 days'`;
      dateFilter = `${localTs} >= ${startLocal}`;

      timeGroupSelect = `DATE(${localTs})`;
      timeLabelSelect = `TO_CHAR(${localTs}, 'MM/DD')`;

    } else {
      // Default: TODAY in local time.
      // All orders from local midnight today onward.
      const todayLocalMidnight = `DATE_TRUNC('day', ${nowLocal})`;
      dateFilter = `${localTs} >= ${todayLocalMidnight}`;

      // Group by local hour (0..23)
      timeGroupSelect = `EXTRACT(HOUR FROM ${localTs})`;

      // Label like "9PM"
      timeLabelSelect = `TO_CHAR(${localTs}, 'FMHH12AM')`;
    }

    try {
      // 1. KPI Stats
      const kpiQuery = `
        SELECT
          COALESCE(SUM(totalprice::numeric), 0)::float as total_revenue,
          COUNT(DISTINCT orderid)::int as total_orders,
          COUNT(DISTINCT employeeatcheckout)::int as active_staff
        FROM order_history
        WHERE ${dateFilter}
      `;
      const kpiPromise = client.query(kpiQuery);

      // 2. Trend Graph
      const trendQuery = `
        SELECT
          ${timeGroupSelect} as sort_key,
          ${timeLabelSelect} as time_label,
          COALESCE(SUM(totalprice::numeric), 0)::float as revenue,
          COUNT(DISTINCT orderid)::int as order_count
        FROM order_history
        WHERE ${dateFilter}
        GROUP BY 1, 2
        ORDER BY 1 ASC
      `;
      const trendPromise = client.query(trendQuery);

      // 3. Top Selling Items
      const topItemsQuery = `
        SELECT itemname as name, SUM(quantity)::int as value
        FROM order_history
        WHERE ${dateFilter}
        GROUP BY itemname
        ORDER BY value DESC
        LIMIT 5
      `;
      const topItemsPromise = client.query(topItemsQuery);

      // 4. Sales by Category
      const categoryQuery = `
        SELECT
          COALESCE(m.category, 'Uncategorized') as name,
          COALESCE(SUM(oh.totalprice::numeric), 0)::float as value
        FROM order_history oh
        LEFT JOIN menuitems m ON oh.menuitemid = m.item_id
        WHERE ${dateFilter}
        GROUP BY 1
        ORDER BY value DESC
      `;
      const categoryPromise = client.query(categoryQuery);

      // 5. Payment Methods
      const paymentQuery = `
        SELECT paymentmethod as name, COUNT(DISTINCT orderid)::int as value
        FROM order_history
        WHERE ${dateFilter}
        GROUP BY paymentmethod
      `;
      const paymentPromise = client.query(paymentQuery);

      // 6. Low Stock (not time-filtered)
      const lowStockQuery = `
        SELECT item_id, item_name, supply, unit, cost
        FROM inventory
        ORDER BY supply ASC
        LIMIT 10
      `;
      const lowStockPromise = client.query(lowStockQuery);

      // Execute all queries in parallel
      const [kpiResult, trendResult, topItemsResult, categoryResult, paymentResult, lowStockResult] = await Promise.all([
        kpiPromise,
        trendPromise,
        topItemsPromise,
        categoryPromise,
        paymentPromise,
        lowStockPromise
      ]);

      // --- ZERO FILLING LOGIC FOR "TODAY" ---
      let finalTrend: any[] = [];

      if (range === 'week' || range === 'month') {
        // For week/month, use DB results as-is (per-day buckets).
        finalTrend = trendResult.rows;
      } else {
        // For "Today", fill hours 0..23 in LOCAL time.
        const hoursMap = new Map<number, any>();
        trendResult.rows.forEach(row => {
          hoursMap.set(Number(row.sort_key), row);
        });

        for (let i = 0; i <= 23; i++) {
          if (hoursMap.has(i)) {
            finalTrend.push(hoursMap.get(i));
          } else {
            const ampm = i >= 12 ? 'PM' : 'AM';
            const hour12 = i === 0 ? 12 : (i > 12 ? i - 12 : i);

            finalTrend.push({
              sort_key: i,
              time_label: `${hour12}${ampm}`,
              revenue: 0,
              order_count: 0,
            });
          }
        }
      }

      sendSuccess(res, {
        kpi: kpiResult.rows[0] || { total_revenue: 0, total_orders: 0, active_staff: 0 },
        trend: finalTrend,
        topItems: topItemsResult.rows,
        categorySales: categoryResult.rows,
        paymentMethods: paymentResult.rows,
        lowStock: lowStockResult.rows,
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching dashboard report:', error);
    sendError(res, 'Failed to fetch dashboard data');
  }
});

export default router;