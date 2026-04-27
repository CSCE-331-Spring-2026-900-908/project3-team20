import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const TAX_RATE = 0.0825;
const TIMEZONE = 'America/Chicago';

export async function GET() {
  try {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
    const generatedAt = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TIMEZONE,
    });

    const alreadyRun = await pool.query(
      `SELECT *
       FROM z_report_log
       WHERE run_date = $1
       LIMIT 1`,
      [today]
    );

    if (alreadyRun.rows.length > 0) {
      const savedReport = alreadyRun.rows[0];

      return NextResponse.json({
        alreadyRun: true,
        date: savedReport.run_date,
        generatedAt: savedReport.generated_at,
        totalOrders: Number(savedReport.total_orders),
        totalRevenue: Number(savedReport.total_revenue),
        totalExpenses: Number(savedReport.total_expenses),
        totalProfit: Number(savedReport.total_profit),
        tax: Number(savedReport.tax),
        totalWithTax: Number(savedReport.total_with_tax),
        employees: savedReport.employees ?? [],
      });
    }

    const [summaryRes, employeeRes, expensesRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(orderid) AS total_orders,
                COALESCE(SUM(total), 0) AS total_revenue
         FROM orders
         WHERE date = $1`,
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

    const totalOrders = Number(summaryRes.rows[0].total_orders);
    const totalRevenue = Number(summaryRes.rows[0].total_revenue);
    const totalExpenses = Number(expensesRes.rows[0].total_expenses);
    const totalProfit = totalRevenue - totalExpenses;
    const tax = totalRevenue * TAX_RATE;
    const totalWithTax = totalRevenue + tax;
    const employees = employeeRes.rows;

    // Save the generated Z report
    await pool.query(
      `INSERT INTO z_report_log (
        run_date,
        generated_at,
        total_orders,
        total_revenue,
        total_expenses,
        total_profit,
        tax,
        total_with_tax,
        employees
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        today,
        generatedAt,
        totalOrders,
        totalRevenue,
        totalExpenses,
        totalProfit,
        tax,
        totalWithTax,
        JSON.stringify(employees),
      ]
    );

    return NextResponse.json({
      alreadyRun: false,
      date: today,
      generatedAt,
      totalOrders,
      totalRevenue,
      totalExpenses,
      totalProfit,
      tax,
      totalWithTax,
      employees,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch Z report' },
      { status: 500 }
    );
  }
}