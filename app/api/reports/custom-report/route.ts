import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
    }

    const [summaryRes, dailyRes, expensesRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(orderid) AS total_orders, COALESCE(SUM(total), 0) AS total_revenue
         FROM orders WHERE date >= $1 AND date <= $2`,
        [start, end]
      ),
      pool.query(
        `SELECT date, COUNT(orderid) AS order_count, COALESCE(SUM(total), 0) AS total_sales
         FROM orders WHERE date >= $1 AND date <= $2
         GROUP BY date ORDER BY date`,
        [start, end]
      ),
      pool.query(
        `SELECT COALESCE(SUM(i.cost * r.amountused * oi.amount), 0) AS total_expenses
         FROM orderitems oi
         JOIN orders o ON o.orderid = oi.orderid
         JOIN recipes r ON r.drinkid = oi.drinkid
         JOIN ingredients i ON i.ingredientid = r.ingredientid
         WHERE o.date >= $1 AND o.date <= $2`,
        [start, end]
      ),
    ]);

    const totalRevenue = Number(summaryRes.rows[0].total_revenue);
    const totalExpenses = Number(expensesRes.rows[0].total_expenses);

    return NextResponse.json({
      startDate: start,
      endDate: end,
      totalOrders: Number(summaryRes.rows[0].total_orders),
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      dailyBreakdown: dailyRes.rows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch custom report' }, { status: 500 });
  }
}