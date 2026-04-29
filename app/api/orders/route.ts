import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { CartItem, DrinkCustomization, sizedDrinkCost } from '@/types';
import { isHappyHour, applyHappyHourDiscount } from '@/lib/happyHour';
import { getChicagoDate, getChicagoHour } from '@/lib/time';

const SWEETNESS_TO_SUGAR_USAGE: Record<DrinkCustomization['sweetness'], number> = {
  '0%': 0,
  '50%': 2,
  '100%': 4,
  '150%': 6,
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

async function resolveEmployeeId(client: PoolClient, employeeId?: number | string | null) {
  const parsedEmployeeId = Number(employeeId);

  if (Number.isInteger(parsedEmployeeId) && parsedEmployeeId > 0) {
    const employeeRes = await client.query(
      'SELECT employeeid FROM employees WHERE employeeid = $1',
      [parsedEmployeeId]
    );

    if (employeeRes.rows.length > 0) {
      return parsedEmployeeId;
    }
  }

  const fallbackRes = await client.query(
    'SELECT employeeid FROM employees ORDER BY employeeid LIMIT 1'
  );

  return fallbackRes.rows.length > 0 ? Number(fallbackRes.rows[0].employeeid) : null;
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
      const baseCost = sizedDrinkCost(Number(item.drink.cost), item.customization.size);
      const drinkCost = happyHourActive ? applyHappyHourDiscount(baseCost) : baseCost;
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

    const ingredientNeeds = new Map<number, number>();
    for (const item of items) {
      const recipeRows = await client.query<{ ingredientid: number; amountused: number }>(
        'SELECT ingredientid, amountused FROM recipes WHERE drinkid = $1',
        [item.drink.drinkid]
      );
      for (const row of recipeRows.rows) {
        const prev = ingredientNeeds.get(row.ingredientid) ?? 0;
        ingredientNeeds.set(row.ingredientid, prev + row.amountused * item.quantity);
      }
    }

    if (ingredientNeeds.size > 0) {
      const ids = Array.from(ingredientNeeds.keys());
      const stockRes = await client.query<{ ingredientid: number; name: string; totalquantity: number }>(
        'SELECT ingredientid, name, totalquantity FROM ingredients WHERE ingredientid = ANY($1)',
        [ids]
      );
      const shortfall = stockRes.rows.filter(
        row => row.totalquantity < (ingredientNeeds.get(row.ingredientid) ?? 0)
      );
      if (shortfall.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Insufficient ingredients', outOfStock: shortfall.map(r => r.name) },
          { status: 409 }
        );
      }
    }

    const toppingNeeds = new Map<number, number>();
    for (const item of items) {
      for (const t of item.toppings) {
        if (t.amount > 0) {
          toppingNeeds.set(t.toppingid, (toppingNeeds.get(t.toppingid) ?? 0) + t.amount * item.quantity);
        }
      }
      for (const usage of getCustomizationInventoryUsage(item.customization)) {
        const toppingId = customizationToppingIds.get(usage.name);
        if (toppingId) {
          toppingNeeds.set(toppingId, (toppingNeeds.get(toppingId) ?? 0) + usage.amount * item.quantity);
        }
      }
    }

    if (toppingNeeds.size > 0) {
      const ids = Array.from(toppingNeeds.keys());
      const stockRes = await client.query<{ toppingid: number; name: string; totalquantity: number }>(
        'SELECT toppingid, name, totalquantity FROM toppings WHERE toppingid = ANY($1)',
        [ids]
      );
      const shortfall = stockRes.rows.filter(
        row => row.totalquantity < (toppingNeeds.get(row.toppingid) ?? 0)
      );
      if (shortfall.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Insufficient toppings', outOfStock: shortfall.map(r => r.name) },
          { status: 409 }
        );
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
      const sizedBase = sizedDrinkCost(Number(item.drink.cost), item.customization.size);
      const singleCost = happyHourActive ? applyHappyHourDiscount(sizedBase) : sizedBase;
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
