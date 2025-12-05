import express, { Request, Response } from 'express';
import db from './db';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();
const BUSINESS_TZ = 'America/Chicago';

// --- DASHBOARD ROUTE ---
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const { range } = req.query;

    const localTs = `(orderdate AT TIME ZONE '${BUSINESS_TZ}')`;
    const nowLocal = `(NOW() AT TIME ZONE '${BUSINESS_TZ}')`;

    let boundarySplit = ''; // Separates Previous | Current
    let boundaryStart = ''; // Start of Previous
    
    // For Peak Time grouping
    let timeLabelSelect = '';

    if (range === 'week') {
      boundarySplit = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '6 days'`;
      boundaryStart = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '13 days'`;
      timeLabelSelect = `TO_CHAR(${localTs}, 'Dy')`; // e.g. Mon, Tue

    } else if (range === 'month') {
      boundarySplit = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '29 days'`;
      boundaryStart = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '59 days'`;
      timeLabelSelect = `TO_CHAR(${localTs}, 'MM/DD')`;

    } else {
      // Default: Today vs Yesterday
      boundarySplit = `DATE_TRUNC('day', ${nowLocal})`; 
      boundaryStart = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '1 day'`; 
      timeLabelSelect = `TO_CHAR(${localTs}, 'FMHH12AM')`; // e.g. 5PM
    }

    // --- 1. KPI Query with PACING Logic ---
    const kpiQuery = `
      WITH metrics AS (
        SELECT
          orderdate,
          totalprice,
          orderid,
          employeeatcheckout,
          -- Boolean: Is this row in the "Current" period?
          (${localTs} >= ${boundarySplit}) as is_current,
          -- Boolean: Is this row within the "Pacing" window of the previous period?
          (
            ${localTs} < ${boundarySplit} AND 
            (${localTs} - ${boundaryStart}) < (${nowLocal} - ${boundarySplit})
          ) as is_prev_paced
        FROM order_history
        WHERE ${localTs} >= ${boundaryStart}
      )
      SELECT
        -- Current Totals
        COALESCE(SUM(CASE WHEN is_current THEN totalprice::numeric ELSE 0 END), 0)::float as curr_revenue,
        COUNT(DISTINCT CASE WHEN is_current THEN orderid END)::int as curr_orders,
        COUNT(DISTINCT CASE WHEN is_current THEN employeeatcheckout END)::int as curr_staff,
        
        -- Previous Totals (Full Period)
        COALESCE(SUM(CASE WHEN NOT is_current THEN totalprice::numeric ELSE 0 END), 0)::float as prev_revenue_total,
        COUNT(DISTINCT CASE WHEN NOT is_current THEN orderid END)::int as prev_orders_total,
        COUNT(DISTINCT CASE WHEN NOT is_current THEN employeeatcheckout END)::int as prev_staff,

        -- Previous Paced (Up to this time)
        COALESCE(SUM(CASE WHEN is_prev_paced THEN totalprice::numeric ELSE 0 END), 0)::float as prev_revenue_paced,
        COUNT(DISTINCT CASE WHEN is_prev_paced THEN orderid END)::int as prev_orders_paced
      FROM metrics
    `;

    // --- 2. Peak Time Query ---
    const peakQuery = `
      WITH buckets AS (
        SELECT
          (${localTs} >= ${boundarySplit}) as is_current,
          ${timeLabelSelect} as label,
          SUM(totalprice::numeric) as revenue
        FROM order_history
        WHERE ${localTs} >= ${boundaryStart}
        GROUP BY 1, 2
      ),
      ranked AS (
        SELECT 
          *,
          ROW_NUMBER() OVER (PARTITION BY is_current ORDER BY revenue DESC) as rn
        FROM buckets
      )
      SELECT is_current, label, revenue
      FROM ranked
      WHERE rn = 1
    `;

    // Standard Trend/Items Queries (Current Period Only)
    const currentFilter = `${localTs} >= ${boundarySplit}`;
    
    // Determine Grouping for Trend Chart
    let timeGroupSelect = `EXTRACT(HOUR FROM ${localTs})`;
    let trendLabelSelect = `TO_CHAR(${localTs}, 'FMHH12AM')`;
    if (range === 'week' || range === 'month') {
        timeGroupSelect = `DATE(${localTs})`;
        trendLabelSelect = range === 'week' ? `TO_CHAR(${localTs}, 'Dy MM/DD')` : `TO_CHAR(${localTs}, 'MM/DD')`;
    }

    const trendQuery = `
      SELECT ${timeGroupSelect} as sort_key, ${trendLabelSelect} as time_label,
      COALESCE(SUM(totalprice::numeric), 0)::float as revenue,
      COUNT(DISTINCT orderid)::int as order_count
      FROM order_history WHERE ${currentFilter} GROUP BY 1, 2 ORDER BY 1 ASC`;

    const categoryQuery = `
      SELECT COALESCE(m.category, 'Uncategorized') as name, COALESCE(SUM(oh.totalprice::numeric), 0)::float as value
      FROM order_history oh LEFT JOIN menuitems m ON oh.menuitemid = m.item_id
      WHERE ${currentFilter} GROUP BY 1 ORDER BY value DESC`;

    const paymentQuery = `
      SELECT paymentmethod as name, COUNT(DISTINCT orderid)::int as value
      FROM order_history WHERE ${currentFilter} GROUP BY paymentmethod`;

    const lowStockQuery = `SELECT item_id, item_name, supply, unit, cost FROM inventory ORDER BY supply ASC LIMIT 10`;

    // --- Execute ---
    const [kpiRes, peakRes, trendRes, catRes, payRes, stockRes] = await Promise.all([
      db.query(kpiQuery),
      db.query(peakQuery),
      db.query(trendQuery),
      db.query(categoryQuery),
      db.query(paymentQuery),
      db.query(lowStockQuery)
    ]);

    // --- Processing ---
    const k = kpiRes.rows[0] || {};
    const calcChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

    // Process Peak Time
    const currPeakRow = peakRes.rows.find(r => r.is_current === true);
    const prevPeakRow = peakRes.rows.find(r => r.is_current === false);

    // Derived Metrics for standard cards
    const currAov = k.curr_orders > 0 ? k.curr_revenue / k.curr_orders : 0;
    const prevAov = k.prev_orders_total > 0 ? k.prev_revenue_total / k.prev_orders_total : 0;
    
    const currEff = k.curr_staff > 0 ? k.curr_revenue / k.curr_staff : 0;
    const prevEff = k.prev_staff > 0 ? k.prev_revenue_total / k.prev_staff : 0;

    const finalKpi = {
      total_revenue: k.curr_revenue,
      total_orders: k.curr_orders,
      active_staff: k.curr_staff,

      // Standard Trends (vs Total Previous)
      revenue_percent_change: calcChange(k.curr_revenue, k.prev_revenue_total),
      orders_percent_change: calcChange(k.curr_orders, k.prev_orders_total),
      avg_order_value_percent_change: calcChange(currAov, prevAov),
      efficiency_percent_change: calcChange(currEff, prevEff),

      // Pacing Trends (vs Previous Paced)
      revenue_pacing_change: calcChange(k.curr_revenue, k.prev_revenue_paced),
      orders_pacing_change: calcChange(k.curr_orders, k.prev_orders_paced),

      // Previous Raw Values
      prev_revenue_total: k.prev_revenue_total,
      prev_orders_total: k.prev_orders_total,
      prev_revenue_paced: k.prev_revenue_paced,
      prev_orders_paced: k.prev_orders_paced,
      prev_avg_order_value: prevAov,
      prev_efficiency: prevEff,

      // Peak Labels
      peak_time_label: currPeakRow ? currPeakRow.label : "N/A",
      prev_peak_time_label: prevPeakRow ? prevPeakRow.label : "N/A"
    };

    // Fill Trends
    let finalTrend: any[] = [];
    if (range === 'week' || range === 'month') {
        finalTrend = trendRes.rows;
    } else {
        const hoursMap = new Map();
        trendRes.rows.forEach(r => hoursMap.set(Number(r.sort_key), r));
        for (let i = 0; i <= 23; i++) {
            if (hoursMap.has(i)) finalTrend.push(hoursMap.get(i));
            else {
                const ampm = i >= 12 ? 'PM' : 'AM';
                const hour12 = i === 0 ? 12 : (i > 12 ? i - 12 : i);
                finalTrend.push({ sort_key: i, time_label: `${hour12}${ampm}`, revenue: 0 });
            }
        }
    }

    sendSuccess(res, {
      kpi: finalKpi,
      trend: finalTrend,
      topItems: [], // Pass if needed
      categorySales: catRes.rows,
      paymentMethods: payRes.rows,
      lowStock: stockRes.rows
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    sendError(res, 'Failed to fetch dashboard');
  }
});

// --- HELPER: Find the "Start Line" (Last Z-Report Time) ---
const getShiftStartTime = async () => {
  // 1. Get the timestamp of the very last Z-Report
  const lastCloseRes = await db.query('SELECT end_time FROM z_reports ORDER BY date_created DESC LIMIT 1');
  
  // 2. If we found one, that's our start time. 
  //    If NOT (first time running), start from the beginning of today.
  const prevEndTimeRaw = lastCloseRes.rows[0]?.end_time;
  
  return prevEndTimeRaw 
    ? `'${prevEndTimeRaw.toISOString()}'` 
    : "DATE_TRUNC('day', NOW())"; 
};

// --- X-REPORT (Live Snapshot) ---
router.get('/x-report', async (req: Request, res: Response) => {
  try {
    const startTimeSQL = await getShiftStartTime();

    // FIXED: Changed total_order_price -> totalprice
    const query = `
      SELECT 
        COUNT(DISTINCT orderid)::int as transactions,
        COALESCE(SUM(totalprice), 0)::float as grossSales,
        COALESCE(SUM(CASE WHEN paymentmethod = 'cash' THEN totalprice ELSE 0 END), 0)::float as cashSales,
        COALESCE(SUM(CASE WHEN paymentmethod = 'card' THEN totalprice ELSE 0 END), 0)::float as cardSales,
        -- Calculate Tax (Assuming ~8.25% included in total)
        (COALESCE(SUM(totalprice), 0) - (COALESCE(SUM(totalprice), 0) / 1.0825))::float as tax
      FROM order_history 
      WHERE orderdate > ${startTimeSQL}
    `;

    const result = await db.query(query);
    const row = result.rows[0];

    sendSuccess(res, {
      transactions: row.transactions,
      grossSales: row.grosssales, 
      cashSales: row.cashsales,
      cardSales: row.cardsales,
      netSales: row.grosssales - row.tax,
      tax: row.tax,
      discounts: 0 
    });

  } catch (error) {
    console.error('X-Report Error:', error);
    sendError(res, 'Failed to generate X-Report');
  }
});

// --- Z-REPORT (Close Shift) ---
router.post('/z-report', async (req: Request, res: Response) => {
  try {
    const { countedCash, openingFloat = 150.00 } = req.body;
    const startTimeSQL = await getShiftStartTime();

    // FIXED: Changed total_order_price -> totalprice
    const aggQuery = `
      SELECT 
        COUNT(DISTINCT orderid)::int as transactions,
        COALESCE(SUM(totalprice), 0)::float as grossSales,
        COALESCE(SUM(CASE WHEN paymentmethod = 'cash' THEN totalprice ELSE 0 END), 0)::float as cashSales,
        COALESCE(SUM(CASE WHEN paymentmethod = 'card' THEN totalprice ELSE 0 END), 0)::float as cardSales,
        (COALESCE(SUM(totalprice), 0) - (COALESCE(SUM(totalprice), 0) / 1.0825))::float as tax
      FROM order_history 
      WHERE orderdate > ${startTimeSQL}
    `;

    const aggRes = await db.query(aggQuery);
    const totals = aggRes.rows[0];

    // 2. Calculate Variance
    const expectedCash = Number(openingFloat) + Number(totals.cashsales);
    const variance = Number(countedCash) - expectedCash;

    // 3. Save the snapshot
    const insertQuery = `
      INSERT INTO z_reports (
        start_time, end_time, total_sales, cash_sales, card_sales, 
        tax_total, transaction_count, opening_float, counted_cash, 
        variance
      ) VALUES (
        ${startTimeSQL}, NOW(), $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING report_id
    `;

    const insertValues = [
      totals.grosssales,
      totals.cashsales,
      totals.cardsales,
      totals.tax,
      totals.transactions,
      openingFloat,
      countedCash,
      variance
    ];

    const insertRes = await db.query(insertQuery, insertValues);

    sendSuccess(res, {
      message: 'Shift closed successfully',
      reportId: insertRes.rows[0].report_id,
      variance: variance
    });

  } catch (error) {
    console.error('Z-Report Error:', error);
    sendError(res, 'Failed to close shift');
  }
});

// --- HISTORY ---
router.get('/history', async (req: Request, res: Response) => {
  try {
    const query = `SELECT * FROM z_reports ORDER BY date_created DESC LIMIT 50`;
    const result = await db.query(query);
    sendSuccess(res, result.rows);
  } catch (error) {
    console.error('Reports History Error:', error);
    sendError(res, 'Failed to fetch report history');
  }
});

export default router;