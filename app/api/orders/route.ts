import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CartItem, lineTotal } from '@/types';

const KIOSK_EMPLOYEE_ID = 1;

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { items, employeeId } = (await request.json()) as {
      items: CartItem[];
      employeeId?: number | string | null;
    };
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    const resolvedEmployeeId = Number.isFinite(Number(employeeId))
      ? Number(employeeId)
      : KIOSK_EMPLOYEE_ID;
    const total = items.reduce((sum, item) => sum + lineTotal(item), 0);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hour = now.getHours();

    await client.query('BEGIN');

    // 1. Insert order
    const orderRes = await client.query(
      'INSERT INTO orders (customerid, employeeid, total, date, hour) VALUES ($1, $2, $3, $4, $5) RETURNING orderid',
      [1, resolvedEmployeeId, total.toFixed(2), dateStr, hour]
    );
    const orderId = orderRes.rows[0].orderid;

    // 2. Insert order items and toppings
    for (const item of items) {
      const itemRes = await client.query(
        'INSERT INTO orderitems (orderid, drinkid, amount, singlecost) VALUES ($1, $2, $3, $4) RETURNING orderitemsid',
        [orderId, item.drink.drinkid, item.quantity, Number(item.drink.cost).toFixed(2)]
      );
      const orderItemsId = itemRes.rows[0].orderitemsid;

      for (const t of item.toppings) {
        if (t.amount > 0) {
          await client.query(
            'INSERT INTO orderitemstop (orderitemsid, toppingid, amountused) VALUES ($1, $2, $3)',
            [orderItemsId, t.toppingid, t.amount]
          );
        }
      }
    }

    // 3. Decrement ingredients
    await client.query(
      `UPDATE ingredients i
       SET totalquantity = GREATEST(0, i.totalquantity - x.used)
       FROM (
         SELECT r.ingredientid, SUM(oi.amount * r.amountused) AS used
         FROM orderitems oi
         JOIN recipes r ON r.drinkid = oi.drinkid
         WHERE oi.orderid = $1
         GROUP BY r.ingredientid
       ) x
       WHERE i.ingredientid = x.ingredientid`,
      [orderId]
    );

    // 4. Decrement toppings
    await client.query(
      `UPDATE toppings t
       SET totalquantity = GREATEST(0, t.totalquantity - x.used)
       FROM (
         SELECT oit.toppingid, SUM(oi.amount * oit.amountused) AS used
         FROM orderitemstop oit
         JOIN orderitems oi ON oi.orderitemsid = oit.orderitemsid
         WHERE oi.orderid = $1
         GROUP BY oit.toppingid
       ) x
       WHERE t.toppingid = x.toppingid`,
      [orderId]
    );

    // 5. Decrement misc by 1 each
    await client.query(
      `UPDATE misc
       SET totalquantity = GREATEST(0, totalquantity - 1)
       WHERE totalquantity >= 1`
    );

    await client.query('COMMIT');
    return NextResponse.json({ orderId, total });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  } finally {
    client.release();
  }
}
