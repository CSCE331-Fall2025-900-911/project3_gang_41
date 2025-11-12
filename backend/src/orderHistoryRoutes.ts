// backend/src/orderHistoryRoutes.ts
import express, { Request, Response } from 'express';
import db from './db';

const router = express.Router();


router.post('/', async (req: Request, res: Response) => {
    // TODO: Add impelemtnion for vackend 
    res.status(201).json({ success: true });
});

// GET /api/order-history
router.get('/', async (req: Request, res: Response) => {
    try {
        // --- 1. Get page and limit from query, with defaults ---
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '50');
        const offset = (page - 1) * limit;

        // --- 2. Get the TOTAL count of all orders first ---
        const countSql = "SELECT COUNT(DISTINCT orderid) FROM order_history";
        const countResult = await db.query(countSql);
        const totalCount = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalCount / limit);

        // --- 3. Get the paged data ---
        const dataSql = `
            SELECT 
                orderid, 
                customerid, 
                orderdate, 
                employeeatcheckout, 
                paymentmethod,
                SUM(CAST(totalprice AS numeric)) AS total_order_price,
                json_agg(
                    json_build_object(
                        'name', itemname, 
                        'qty', quantity, 
                        'price', totalprice
                    )
                ) AS items
            FROM 
                order_history
            GROUP BY 
                orderid, customerid, orderdate, employeeatcheckout, paymentmethod
            ORDER BY 
                orderid DESC
            OFFSET $1 LIMIT $2;
        `;
        
        const dataResult = await db.query(dataSql, [offset, limit]);
        
        // --- 4. Send back an object with both data and page info ---
        res.json({
            orders: dataResult.rows,
            totalPages: totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ message: 'Failed to load order history.' });
    }
});

export default router;