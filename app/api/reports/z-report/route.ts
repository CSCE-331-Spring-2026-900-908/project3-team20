import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const TAX_RATE = 0.0825;
const TIMEZONE = 'America/Chicago';

export async function GET() {
  try {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
    const generatedAt = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE });

    // Check if Z report already run today
    const alreadyRun = await pool.query(
      'SELECT id FROM z_report_log WHERE run_date = $1',
      [today]
    );
    if (alreadyRun.rows.length > 0) {
      return NextResponse.json({ alreadyRun: true, date: today });
    }

    const [summaryRes, employeeRes, expensesRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(orderid) AS total_orders, COALESCE(SUM(total), 0) AS total_revenue
         FROM orders WHERE date = $1`,
        [today]
      ),
      pool.query(
        `SELECT e.name, COUNT(o.orderid) AS order_count
         FROM orders o
         JOIN employees e ON e.employeeid = o.employeeid
         WHERE o.date = $1
         GROUP BY e.name
         ORDER BY order_count DESC`,
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
    const tax = totalRevenue * TAX_RATE;

    // Log that Z report was run today
    await pool.query(
      'INSERT INTO z_report_log (run_date) VALUES ($1)',
      [today]
    );

    return NextResponse.json({
      alreadyRun: false,
      date: today,
      generatedAt,
      totalOrders: Number(summaryRes.rows[0].total_orders),
      totalRevenue,
      totalExpenses,
      totalProfit: totalRevenue - totalExpenses,
      tax,
      totalWithTax: totalRevenue + tax,
      employees: employeeRes.rows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch Z report' }, { status: 500 });
  }
}