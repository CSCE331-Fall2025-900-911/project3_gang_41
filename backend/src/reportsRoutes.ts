import express, { Request, Response } from 'express';
import db from './db';
import { sendSuccess, sendError } from './utils/response';
import { buildInsertQuery } from './utils/sql';
// Use shared tax rate
import { TAX_RATE } from '@project3/shared';

const router = express.Router();
const BUSINESS_TZ = 'America/Chicago';
const TAX_DIVISOR = 1 + TAX_RATE; // e.g. 1.0825

router.get('/dashboard', async (req: Request, res: Response) => {
    try {
    const { range } = req.query;

    // FIX: Explicitly cast to timestamptz to ensure UTC interpretation before TZ conversion
    const localTs = `(orderdate::timestamptz AT TIME ZONE '${BUSINESS_TZ}')`;
    const nowLocal = `(NOW() AT TIME ZONE '${BUSINESS_TZ}')`;

    let boundarySplit = ''; 
    let boundaryStart = ''; 
    let timeLabelSelect = '';

    if (range === 'week') {
      boundarySplit = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '6 days'`;
      boundaryStart = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '13 days'`;
      timeLabelSelect = `TO_CHAR(${localTs}, 'Dy')`; 

    } else if (range === 'month') {
      boundarySplit = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '29 days'`;
      boundaryStart = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '59 days'`;
      timeLabelSelect = `TO_CHAR(${localTs}, 'MM/DD')`;

    } else {
      boundarySplit = `DATE_TRUNC('day', ${nowLocal})`; 
      boundaryStart = `DATE_TRUNC('day', ${nowLocal}) - INTERVAL '1 day'`; 
      timeLabelSelect = `TO_CHAR(${localTs}, 'FMHH12AM')`; 
    }

    const kpiQuery = `
      WITH metrics AS (
        SELECT
          orderdate, totalprice, orderid, employeeatcheckout,
          (${localTs} >= ${boundarySplit}) as is_current,
          (${localTs} < ${boundarySplit} AND 
          (${localTs} - ${boundaryStart}) < (${nowLocal} - ${boundarySplit})) as is_prev_paced
        FROM order_history
        WHERE ${localTs} >= ${boundaryStart}
      )
      SELECT
        COALESCE(SUM(CASE WHEN is_current THEN totalprice::numeric ELSE 0 END), 0)::float as curr_revenue,
        COUNT(DISTINCT CASE WHEN is_current THEN orderid END)::int as curr_orders,
        COUNT(DISTINCT CASE WHEN is_current THEN employeeatcheckout END)::int as curr_staff,
        COALESCE(SUM(CASE WHEN NOT is_current THEN totalprice::numeric ELSE 0 END), 0)::float as prev_revenue_total,
        COUNT(DISTINCT CASE WHEN NOT is_current THEN orderid END)::int as prev_orders_total,
        COUNT(DISTINCT CASE WHEN NOT is_current THEN employeeatcheckout END)::int as prev_staff,
        COALESCE(SUM(CASE WHEN is_prev_paced THEN totalprice::numeric ELSE 0 END), 0)::float as prev_revenue_paced,
        COUNT(DISTINCT CASE WHEN is_prev_paced THEN orderid END)::int as prev_orders_paced
      FROM metrics
    `;

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
        SELECT *, ROW_NUMBER() OVER (PARTITION BY is_current ORDER BY revenue DESC) as rn
        FROM buckets
      )
      SELECT is_current, label, revenue FROM ranked WHERE rn = 1
    `;

    const currentFilter = `${localTs} >= ${boundarySplit}`;
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

    const [kpiRes, peakRes, trendRes, catRes, payRes, stockRes] = await Promise.all([
      db.query(kpiQuery), db.query(peakQuery), db.query(trendQuery),
      db.query(categoryQuery), db.query(paymentQuery), db.query(lowStockQuery)
    ]);

    const k = kpiRes.rows[0] || {};
    const calcChange = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
    const currPeakRow = peakRes.rows.find(r => r.is_current === true);
    const prevPeakRow = peakRes.rows.find(r => r.is_current === false);
    const currAov = k.curr_orders > 0 ? k.curr_revenue / k.curr_orders : 0;
    const prevAov = k.prev_orders_total > 0 ? k.prev_revenue_total / k.prev_orders_total : 0;
    const currEff = k.curr_staff > 0 ? k.curr_revenue / k.curr_staff : 0;
    const prevEff = k.prev_staff > 0 ? k.prev_revenue_total / k.prev_staff : 0;

    const finalKpi = {
      total_revenue: k.curr_revenue,
      total_orders: k.curr_orders,
      active_staff: k.curr_staff,
      revenue_percent_change: calcChange(k.curr_revenue, k.prev_revenue_total),
      orders_percent_change: calcChange(k.curr_orders, k.prev_orders_total),
      avg_order_value_percent_change: calcChange(currAov, prevAov),
      efficiency_percent_change: calcChange(currEff, prevEff),
      revenue_pacing_change: calcChange(k.curr_revenue, k.prev_revenue_paced),
      orders_pacing_change: calcChange(k.curr_orders, k.prev_orders_paced),
      prev_revenue_total: k.prev_revenue_total,
      prev_orders_total: k.prev_orders_total,
      prev_revenue_paced: k.prev_revenue_paced,
      prev_orders_paced: k.prev_orders_paced,
      prev_avg_order_value: prevAov,
      prev_efficiency: prevEff,
      peak_time_label: currPeakRow ? currPeakRow.label : "N/A",
      prev_peak_time_label: prevPeakRow ? prevPeakRow.label : "N/A"
    };

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
      topItems: [],
      categorySales: catRes.rows,
      paymentMethods: payRes.rows,
      lowStock: stockRes.rows
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    sendError(res, 'Failed to fetch dashboard');
  }
});

const getShiftStartTime = async () => {
  const lastCloseRes = await db.query('SELECT end_time FROM z_reports ORDER BY date_created DESC LIMIT 1');
  const prevEndTimeRaw = lastCloseRes.rows[0]?.end_time;
  return prevEndTimeRaw ? new Date(prevEndTimeRaw) : new Date(new Date().setHours(0,0,0,0));
};

router.get('/x-report', async (req: Request, res: Response) => {
  try {
    // 1. Check for End-of-Day Lock (Z-Report exists for today)
    // FIX: Ensure NOW() comparisons use Business Timezone
    const checkLockQuery = `
        SELECT report_id FROM z_reports 
        WHERE DATE(date_created AT TIME ZONE '${BUSINESS_TZ}') = DATE(NOW() AT TIME ZONE '${BUSINESS_TZ}')
        LIMIT 1
    `;
    const lockRes = await db.query(checkLockQuery);
    if (lockRes.rows.length > 0) {
        return res.status(403).json({
            success: false,
            message: "Shift Closed: Z-Report has already been run for today.",
            locked: true
        });
    }

    const startTime = await getShiftStartTime();

    const query = `
      SELECT 
        COUNT(DISTINCT orderid)::int as transactions,
        COALESCE(SUM(totalprice), 0)::float as grossSales,
        COALESCE(SUM(CASE WHEN paymentmethod = 'cash' THEN totalprice ELSE 0 END), 0)::float as cashSales,
        COALESCE(SUM(CASE WHEN paymentmethod = 'card' THEN totalprice ELSE 0 END), 0)::float as cardSales,
        (COALESCE(SUM(totalprice), 0) - (COALESCE(SUM(totalprice), 0) / ${TAX_DIVISOR}))::float as tax
      FROM order_history WHERE orderdate > $1
    `;

    // FIX: Added ::timestamptz to force interpretation as UTC timestamp before rotating to Chicago
    const hourlyQuery = `
      SELECT
        TO_CHAR(orderdate::timestamptz AT TIME ZONE '${BUSINESS_TZ}', 'FMHH12AM') as hour_label,
        EXTRACT(HOUR FROM orderdate::timestamptz AT TIME ZONE '${BUSINESS_TZ}')::int as hour_sort,
        COUNT(DISTINCT orderid)::int as count,
        COALESCE(SUM(totalprice), 0)::float as sales
      FROM order_history 
      WHERE orderdate > $1
      GROUP BY 1, 2
      ORDER BY 2 ASC
    `;

    const [totalRes, hourlyRes] = await Promise.all([
        db.query(query, [startTime]),
        db.query(hourlyQuery, [startTime])
    ]);
    
    const row = totalRes.rows[0];

    sendSuccess(res, {
      transactions: row.transactions,
      grossSales: row.grosssales,
      cashSales: row.cashsales,
      cardSales: row.cardsales,
      netSales: row.grosssales - row.tax,
      tax: row.tax,
      discounts: 0,
      hourlyTotals: hourlyRes.rows
    });

  } catch (error) {
    console.error('X-Report Error:', error);
    sendError(res, 'Failed to generate X-Report');
  }
});

router.post('/z-report', async (req: Request, res: Response) => {
  try {
    const { countedCash, openingFloat = 150.00 } = req.body;
    const prevEndTimeRaw = (await db.query('SELECT end_time FROM z_reports ORDER BY date_created DESC LIMIT 1')).rows[0]?.end_time;
    const startTime = prevEndTimeRaw ? new Date(prevEndTimeRaw) : new Date(new Date().setHours(0,0,0,0));

    // Aggregate Totals
    const aggQuery = `
      SELECT 
        COUNT(DISTINCT orderid)::int as transactions,
        COALESCE(SUM(totalprice), 0)::float as grossSales,
        COALESCE(SUM(CASE WHEN paymentmethod = 'cash' THEN totalprice ELSE 0 END), 0)::float as cashSales,
        COALESCE(SUM(CASE WHEN paymentmethod = 'card' THEN totalprice ELSE 0 END), 0)::float as cardSales,
        (COALESCE(SUM(totalprice), 0) - (COALESCE(SUM(totalprice), 0) / ${TAX_DIVISOR}))::float as tax
      FROM order_history WHERE orderdate > $1
    `;

    const aggRes = await db.query(aggQuery, [startTime]);
    const totals = aggRes.rows[0];
    const expectedCash = Number(openingFloat) + Number(totals.cashsales);
    const variance = Number(countedCash) - expectedCash;

    const insertQ = buildInsertQuery('z_reports', {
      start_time: startTime,
      end_time: new Date(),
      total_sales: totals.grosssales,
      cash_sales: totals.cashsales,
      card_sales: totals.cardsales,
      tax_total: totals.tax,
      transaction_count: totals.transactions,
      opening_float: openingFloat,
      counted_cash: countedCash,
      variance: variance
    });

    if (!insertQ) throw new Error('Failed to build Z-Report query');
    const insertRes = await db.query(insertQ.sql, insertQ.values);

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

// NEW ENDPOINT: Unlock Day (Delete today's Z-Report)
router.post('/reset-day', async (req: Request, res: Response) => {
  try {
    const query = `
      DELETE FROM z_reports 
      WHERE DATE(date_created AT TIME ZONE '${BUSINESS_TZ}') = DATE(NOW() AT TIME ZONE '${BUSINESS_TZ}')
    `;
    await db.query(query);
    sendSuccess(res, { message: 'Day unlocked successfully' });
  } catch (error) {
    console.error('Reset Day Error:', error);
    sendError(res, 'Failed to reset day');
  }
});

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