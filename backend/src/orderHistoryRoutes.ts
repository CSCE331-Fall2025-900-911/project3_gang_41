import express, { Request, Response } from 'express';
import db from './db'; 

const router = express.Router();

// GET /api/order-history
router.get('/', async (req: Request, res: Response) => {
    try {
        // --- 1. Get query params ---
        const page = parseInt(req.query.page as string || '1');
        const limit = parseInt(req.query.limit as string || '20'); // Updated to match your frontend default
        const offset = (page - 1) * limit;
        const searchId = req.query.id ? parseInt(req.query.id as string) : null;

        let countSql = "SELECT COUNT(DISTINCT orderid) FROM order_history";
        let dataSql = `
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
        `;
        
        // --- 2. Add WHERE clause if searching ---
        const params: any[] = [];
        if (searchId) {
            countSql += " WHERE orderid = $1";
            dataSql += " WHERE orderid = $1";
            params.push(searchId);
        }

        // --- 3. Add Group By & Order By ---
        dataSql += `
            GROUP BY 
                orderid, customerid, orderdate, employeeatcheckout, paymentmethod
            ORDER BY 
                orderid DESC
        `;

        // --- 4. Add Pagination ---
        // If searching by ID, pagination params come after the ID param
        // If not searching, they are $1 and $2
        const offsetParamIndex = params.length + 1;
        const limitParamIndex = params.length + 2;
        
        dataSql += ` OFFSET $${offsetParamIndex} LIMIT $${limitParamIndex}`;
        params.push(offset);
        params.push(limit);

        // --- 5. Execute Queries ---
        // Count query only needs the search param (if any)
        const countParams = searchId ? [searchId] : [];
        const countResult = await db.query(countSql, countParams);
        const totalCount = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalCount / limit);
        
        const dataResult = await db.query(dataSql, params);
        
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