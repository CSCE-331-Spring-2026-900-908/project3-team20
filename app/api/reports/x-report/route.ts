import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const generatedAt = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Chicago',
    });

    const today = now.toLocaleDateString('en-CA', {
        timeZone: 'America/Chicago',
    });

    const [summaryRes, hourlyRes, expensesRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(orderid) AS total_orders, COALESCE(SUM(total), 0) AS total_revenue
         FROM orders WHERE date = $1`,
        [today]
      ),
      pool.query(
        `SELECT hour, COUNT(orderid) AS order_count, COALESCE(SUM(total), 0) AS total_sales
         FROM orders WHERE date = $1
         GROUP BY hour ORDER BY hour`,
        [today]
      ),
      pool.query(
        `SELECT COALESCE(SUM(i.cost * r.amountused * oi.amount), 0) AS total_expenses
         FROM orderitems oi
         JOIN orders o ON o.orderid = oi.orderid
         JOIN recipes r ON r.drinkid = oi.drinkid
         JOIN ingredients i ON i.ingredientid = r.ingredientid
         WHERE o.date = $1`,
        [today]
      ),
    ]);

    const totalRevenue = Number(summaryRes.rows[0].total_revenue);
    const totalExpenses = Number(expensesRes.rows[0].total_expenses);

    return NextResponse.json({
      date: today,
      generatedAt,
      totalOrders: Number(summaryRes.rows[0].total_orders),
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      hourlyBreakdown: hourlyRes.rows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch X report' }, { status: 500 });
  }
}