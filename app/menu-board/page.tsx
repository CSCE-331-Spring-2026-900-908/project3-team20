'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Drink, Topping } from '@/types';

const categoryConfig: Record<string, { color: string; headerBg: string; cardBg: string; border: string; dot: string }> = {
  'fruity': {
    color: 'text-pink-300',
    headerBg: 'bg-pink-500/10 border-pink-500/20',
    cardBg: 'bg-pink-950/30',
    border: 'border-pink-500/30',
    dot: 'bg-pink-400',
  },
  'milk tea': {
    color: 'text-amber-300',
    headerBg: 'bg-amber-500/10 border-amber-500/20',
    cardBg: 'bg-amber-950/30',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  'other': {
    color: 'text-purple-300',
    headerBg: 'bg-purple-500/10 border-purple-500/20',
    cardBg: 'bg-purple-950/30',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400',
  },
};

function getCatConfig(category: string | null) {
  const key = (category ?? 'other').toLowerCase();
  return categoryConfig[key] ?? categoryConfig['other'];
}

export default function MenuBoardPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () =>
      Promise.all([
        fetch('/api/drinks').then(r => r.json()),
        fetch('/api/toppings').then(r => r.json()),
      ]).then(([drinksData, toppingsData]) => {
        if (Array.isArray(drinksData)) setDrinks(drinksData);
        if (Array.isArray(toppingsData)) setToppings(toppingsData);
        setLoading(false);
      });

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const categories = Array.from(new Set(drinks.map(d => d.category ?? 'Other')));
  const drinksByCategory = categories.reduce<Record<string, Drink[]>>((acc, cat) => {
    acc[cat] = drinks.filter(d => (d.category ?? 'Other') === cat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#110800] text-white overflow-y-auto">

      {/* Page header */}
      <header className="bg-[#1e1000] border-b border-amber-900/40 px-8 py-6 text-center">
        <p className="text-amber-500/70 text-xs tracking-[0.4em] uppercase font-semibold mb-1">
          Fresh Made Daily
        </p>
        <h1 className="text-4xl font-extrabold text-amber-100 tracking-tight">Our Menu</h1>
        <p className="text-amber-700/60 text-xs mt-2 tracking-widest uppercase">
          All drinks customizable · Ask about sizes &amp; sweetness levels
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-amber-500/50 text-center mt-24 text-xl tracking-wide">Loading menu…</p>
        ) : (
          <>
            {/* Drink categories */}
            <div className="space-y-10">
              {categories.map(category => {
                const cfg = getCatConfig(category);
                return (
                  <section key={category}>
                    {/* Category header */}
                    <div className={`flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl border ${cfg.headerBg}`}>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <h2 className={`text-base font-bold uppercase tracking-[0.2em] ${cfg.color}`}>
                        {category}
                      </h2>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>

                    {/* Drink cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {drinksByCategory[category].map(drink => (
                        <div
                          key={drink.drinkid}
                          className={`rounded-2xl border px-4 py-3.5 flex flex-col gap-2 ${cfg.cardBg} ${cfg.border} transition-colors`}
                        >
                          <span className="font-semibold text-white leading-snug">{drink.name}</span>
                          <span className={`text-sm font-bold ${cfg.color}`}>
                            ${Number(drink.cost).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Toppings / Add-ons */}
            {toppings.length > 0 && (
              <section className="mt-14">
                <div className="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-xl border bg-teal-500/10 border-teal-500/20">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-400 shrink-0" />
                  <h2 className="text-base font-bold uppercase tracking-[0.2em] text-teal-300">
                    Add-Ons &amp; Toppings
                  </h2>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {toppings.map(topping => (
                    <div
                      key={topping.toppingid}
                      className="rounded-2xl border border-teal-600/25 bg-teal-950/25 px-3 py-3 flex flex-col gap-1"
                    >
                      <span className="font-medium text-sm text-white leading-snug">{topping.name}</span>
                      <span className="text-xs font-bold text-teal-300">
                        +${Number(topping.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="text-center py-8 text-amber-900/40 text-xs tracking-[0.3em] uppercase">
        Prices subject to change · Tax not included
      </footer>

      <Link
        href="/"
        className="fixed bottom-5 left-5 z-50 inline-flex items-center gap-2 rounded-full border border-amber-700/60 bg-[#1e1000] px-4 py-2 text-sm font-semibold text-amber-400 shadow-xl transition hover:-translate-y-0.5 hover:bg-amber-900/60 focus:outline-none focus:ring-4 focus:ring-amber-700/40"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
