import pool from '../db';

export async function getDrinks() {
  const result = await pool.query(`
                                    SELECT drinkid, name, cost, category
                                    FROM drinks
                                    WHERE name IS NOT NULL
                                    ORDER BY category, name
                                `);
  return result.rows;
}