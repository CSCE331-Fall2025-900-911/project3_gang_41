import express, { Request, Response } from 'express';
import db from './db';

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
        return res.status(400).json({ message: 'No items provided' });
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

        const insertSql = `
            INSERT INTO order_history
                (orderid, customerid, orderdate, employeeatcheckout, paymentmethod,
                 menuitemid, itemname, quantity, unitprice, totalprice)
            VALUES
                ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9)
        `;

        // Insert each aggregated item
        for (const item of aggregatedItems.values()) {
            const totalprice = item.unitprice * item.quantity;
            await client.query(insertSql, [
                orderid,
                cust,
                employee,
                method,
                item.item_id,
                item.item_name,
                item.quantity,
                item.unitprice,
                totalprice,
            ]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, orderid });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to create order:', err);
        res.status(500).json({ message: 'Failed to create order', error: String(err) });
    } finally {
        client.release();
    }
});

// Get paginated order history with items aggregated by order
router.get('/', async (req: Request, res: Response) => {
    try {
        const page = parseInt((req.query.page as string) || '1', 10);
        const limit = parseInt((req.query.limit as string) || '50', 10);
        const offset = (page - 1) * limit;

        const countSql = "SELECT COUNT(DISTINCT orderid) FROM order_history";
        const countResult = await db.query(countSql);
        const totalCount = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalCount / limit);

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
                    ORDER BY itemname
                ) AS items
            FROM order_history
            GROUP BY
                orderid, customerid, orderdate, employeeatcheckout, paymentmethod
            ORDER BY orderid DESC
            OFFSET $1 LIMIT $2;
        `;

        const dataResult = await db.query(dataSql, [offset, limit]);

        res.json({
            orders: dataResult.rows,
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).json({ message: 'Failed to load order history.' });
    }
});

export default router;