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

        // Generate new order ID
        const { rows } = await client.query(
            "SELECT nextval(pg_get_serial_sequence('order_history', 'orderid')) AS new_order_id"
        );
        const orderid = Number(rows[0].new_order_id);

        const orderdate = new Date();
        const method = paymentmethod ?? 'cash';
        const employee = employeeId ?? null;
        const cust = customerid ?? null;

        const insertSql = `
            INSERT INTO order_history
                (orderid, customerid, orderdate, employeeatcheckout, paymentmethod, itemname, quantity, totalprice)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        // Insert each item with same orderid
        for (const item of items) {
            const totalprice = item.cost * item.quantity;
            await client.query(insertSql, [
                orderid,
                cust,
                orderdate,
                employee,
                method,
                item.item_name,
                item.quantity,
                totalprice,
            ]);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, orderid });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to create order:', err);
        res.status(500).json({ message: 'Failed to create order' });
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