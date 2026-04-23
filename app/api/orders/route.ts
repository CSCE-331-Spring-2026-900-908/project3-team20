import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { CartItem, DrinkCustomization } from '@/types';
import { isHappyHour, applyHappyHourDiscount } from '@/lib/happyHour';
import { getChicagoDate, getChicagoHour } from '@/lib/time';

const SWEETNESS_TO_SUGAR_USAGE: Record<DrinkCustomization['sweetness'], number> = {
  '0%': 0,
  '25%': 1,
  '50%': 2,
  '75%': 3,
  '100%': 4,
};
const ICE_TO_TOPPING_USAGE: Record<DrinkCustomization['ice'], number> = {
  None: 0,
  Less: 1,
  Normal: 2,
  More: 3,
};

function normalizeToppingName(name: string) {
  return name.trim().toLowerCase();
}

function getCustomizationInventoryUsage(customization: DrinkCustomization) {
  return [
    { name: 'hot', amount: customization.hot === 'Yes' ? 1 : 0 },
    { name: 'sugar', amount: SWEETNESS_TO_SUGAR_USAGE[customization.sweetness] ?? 0 },
    { name: 'ice', amount: ICE_TO_TOPPING_USAGE[customization.ice] ?? 0 },
  ].filter(item => item.amount > 0);
}

async function resolveEmployeeId(client: Awaited<ReturnType<typeof pool.connect>>, employeeId?: number | string | null) {
  const parsedEmployeeId = Number(employeeId);

  if (Number.isInteger(parsedEmployeeId) && parsedEmployeeId > 0) {
    const employeeRes = await client.query(
      'SELECT employeeid FROM employees WHERE employeeid = $1',
      [parsedEmployeeId]
    );

    if (employeeRes.rowCount > 0) {
      return parsedEmployeeId;
    }
  }

  const fallbackRes = await client.query(
    'SELECT employeeid FROM employees ORDER BY employeeid LIMIT 1'
  );

  return fallbackRes.rowCount > 0 ? Number(fallbackRes.rows[0].employeeid) : null;
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { items, employeeId, wheelPrize } = (await request.json()) as {
      items: CartItem[];
      employeeId?: number | string | null;
      wheelPrize?: { discountPct: number; fixedDiscount?: number } | null;
    };
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    const resolvedEmployeeId = await resolveEmployeeId(client, employeeId);

    if (!resolvedEmployeeId) {
      return NextResponse.json(
        { error: 'No employees are available to assign this order' },
        { status: 400 }
      );
    }

    const now = new Date();
    const dateStr = getChicagoDate(now);
    const hour = getChicagoHour(now);
    const happyHourActive = isHappyHour(hour);

    const subtotal = items.reduce((sum, item) => {
      const drinkCost = happyHourActive
        ? applyHappyHourDiscount(Number(item.drink.cost))
        : Number(item.drink.cost);
      const toppingCost = item.toppings.reduce((s, t) => s + t.price * t.amount, 0);
      return sum + (drinkCost + toppingCost) * item.quantity;
    }, 0);
    const wheelDiscountAmt = wheelPrize
      ? wheelPrize.discountPct > 0
        ? subtotal * wheelPrize.discountPct / 100
        : (wheelPrize.fixedDiscount ?? 0)
      : 0;
    const total = Math.max(0, subtotal - wheelDiscountAmt);

    await client.query('BEGIN');

    const customizationInventoryNames = Array.from(new Set(
      items.flatMap(item => getCustomizationInventoryUsage(item.customization).map(usage => usage.name))
    ));
    const customizationToppingIds = new Map<string, number>();

    if (customizationInventoryNames.length > 0) {
      const customizationToppingsRes = await client.query(
        'SELECT toppingid, name FROM toppings WHERE LOWER(name) = ANY($1::text[])',
        [customizationInventoryNames]
      );

      for (const row of customizationToppingsRes.rows as Array<{ toppingid: number; name: string }>) {
        customizationToppingIds.set(normalizeToppingName(row.name), Number(row.toppingid));
      }
    }

    // 1. Insert order
    const orderRes = await client.query(
      'INSERT INTO orders (customerid, employeeid, total, date, hour) VALUES ($1, $2, $3, $4, $5) RETURNING orderid',
      [1, resolvedEmployeeId, total.toFixed(2), dateStr, hour]
    );
    const orderId = orderRes.rows[0].orderid;

    // 2. Insert order items and toppings
    for (const item of items) {
      const singleCost = happyHourActive
        ? applyHappyHourDiscount(Number(item.drink.cost))
        : Number(item.drink.cost);
      const itemRes = await client.query(
        'INSERT INTO orderitems (orderid, drinkid, amount, singlecost) VALUES ($1, $2, $3, $4) RETURNING orderitemsid',
        [orderId, item.drink.drinkid, item.quantity, singleCost.toFixed(2)]
      );
      const orderItemsId = itemRes.rows[0].orderitemsid;

      const toppingUsage = new Map<number, number>();

      for (const t of item.toppings) {
        if (t.amount > 0) {
          toppingUsage.set(t.toppingid, (toppingUsage.get(t.toppingid) ?? 0) + t.amount);
        }
      }

      for (const usage of getCustomizationInventoryUsage(item.customization)) {
        const toppingId = customizationToppingIds.get(usage.name);
        if (toppingId) {
          toppingUsage.set(toppingId, (toppingUsage.get(toppingId) ?? 0) + usage.amount);
        }
      }

      for (const [toppingId, amount] of toppingUsage.entries()) {
        if (amount > 0) {
          await client.query(
            'INSERT INTO orderitemstop (orderitemsid, toppingid, amountused) VALUES ($1, $2, $3)',
            [orderItemsId, toppingId, amount]
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
