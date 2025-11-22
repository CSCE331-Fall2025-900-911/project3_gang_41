import express, { Request, Response } from 'express';
import db from './db';
import { deductInventory } from './services/inventoryService';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router();

// Create new order with multiple items
router.post('/', async (req: Request, res: Response) => {
    const { items, customerid, employeeId, paymentmethod } = req.body as {
        items: { item_id: number; item_name: string; quantity: number; cost: number }[];
        customerid?: number;
        employeeId?: number;
        paymentmethod?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
        return sendError(res, 'No items provided', 400);
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Generate new order ID using MAX + 1
        const { rows } = await client.query(
            "SELECT COALESCE(MAX(orderid), 0) + 1 AS new_order_id FROM order_history"
        );
        const orderid = Number(rows[0].new_order_id);

        const method = paymentmethod ?? 'card';
        const employee = employeeId ?? 0;
        const cust = customerid ?? 0;

        // Aggregate items by item_id (like Java implementation)
        const aggregatedItems = new Map<number, {
            item_id: number;
            item_name: string;
            quantity: number;
            unitprice: number;
        }>();

        for (const item of items) {
            const existing = aggregatedItems.get(item.item_id);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                aggregatedItems.set(item.item_id, {
                    item_id: item.item_id,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unitprice: item.cost,
                });
            }
        }

        // 1. Capture the timestamp once so all rows share the same order date
        const orderDate = new Date();

        const insertSql = `
            INSERT INTO order_history
                (orderid, customerid, orderdate, employeeatcheckout, paymentmethod,
                 menuitemid, itemname, quantity, unitprice, totalprice)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

        // Insert each aggregated item
        for (const item of aggregatedItems.values()) {
            const totalprice = item.unitprice * item.quantity;
            await client.query(insertSql, [
                orderid,
                cust,
                orderDate, // use the captured timestamp (maps to $3)
                employee,  // $4
                method,    // $5
                item.item_id, // $6
                item.item_name, // $7
                item.quantity, // $8
                item.unitprice, // $9
                totalprice,    // $10
            ]);
        }

        await client.query('COMMIT');

        // Calculate order total
        const orderTotal = Array.from(aggregatedItems.values())
            .reduce((sum, item) => sum + (item.unitprice * item.quantity), 0);

        // Update inventory and sales report via direct function calls
        const orderItems = Array.from(aggregatedItems.values()).map(item => ({
            item_id: item.item_id,
            quantity: item.quantity
        }));

        try {
            await deductInventory(orderItems);
        } catch (err) {
            console.error("Background task failed", err);
        }

        res.status(201);
        sendSuccess(res, { orderid }, 'Order created');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to create order:', err);
        sendError(res, 'Failed to create order');
    } finally {
        client.release();
    }
});

// Get paginated order history with items aggregated by order
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
                MAX(customerid) as customerid,              -- Take the max (or min) to handle duplicates
                MIN(orderdate) as orderdate,                -- Take the earliest timestamp
                MAX(employeeatcheckout) as employeeatcheckout, 
                MAX(paymentmethod) as paymentmethod,
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
                orderid -- Only group by ID!
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
        
        sendSuccess(res, {
            orders: dataResult.rows,
            totalPages: totalPages,
            currentPage: page
        });

    } catch (error) {
        console.error('Error fetching order history:', error);
        sendError(res, 'Failed to load order history.');
    }
});

export default router;