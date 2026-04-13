'use client';

import Link from 'next/link';
import Image from 'next/image';
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

/**
 * Returns the image path for a drink.
 * Place drink images at: /public/images/drinks/<drink-name-kebab-case>.png
 * e.g. "Taro Milk Tea" → /public/images/drinks/taro-milk-tea.png
 */
function getDrinkImagePath(drinkName: string): string {
  const slug = drinkName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `/images/drinks/${slug}.png`;
}

export default function MenuBoardPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  // Track which drink images have failed to load so we show the placeholder instead
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

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
    // Outer wrapper locks to viewport height — no page scroll
    <div className="h-screen overflow-hidden bg-[#110800] text-white flex flex-col">

      {/* ── Compact page header ─────────────────────────────────────── */}
      <header className="shrink-0 bg-[#1e1000] border-b border-amber-900/40 px-6 py-3 flex items-center justify-between">
        <p className="text-amber-500/60 text-[10px] tracking-[0.35em] uppercase font-semibold hidden sm:block">
          Fresh Made Daily
        </p>
        <h1 className="text-2xl font-extrabold text-amber-100 tracking-tight mx-auto sm:mx-0">
          Our Menu
        </h1>
        <p className="text-amber-700/50 text-[10px] tracking-widest uppercase hidden sm:block">
          Customizable · All sizes
        </p>
      </header>

      {/* ── Main content area — fills remaining height ───────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col px-4 py-3 gap-3">

        {loading ? (
          <p className="text-amber-500/50 text-center m-auto text-lg tracking-wide">
            Loading menu…
          </p>
        ) : (
          <>
            {/* ── Drink categories laid out side-by-side ──────────────── */}
            {/*
              Each category gets an equal column.
              The number of columns auto-adjusts based on how many categories exist.
              Change grid-cols-* below if you add or remove categories.
            */}
            <div
              className="flex-1 overflow-hidden grid gap-3"
              style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
            >
              {categories.map(category => {
                const cfg = getCatConfig(category);
                return (
                  <section key={category} className="flex flex-col overflow-hidden">

                    {/* Category header */}
                    <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg border shrink-0 ${cfg.headerBg}`}>
                      <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <h2 className={`text-xs font-bold uppercase tracking-[0.2em] ${cfg.color}`}>
                        {category}
                      </h2>
                    </div>

                    {/* Drink cards — 2-column grid that fills the remaining column height */}
                    <div className="flex-1 overflow-hidden grid grid-cols-2 gap-2 content-start">
                      {drinksByCategory[category].map(drink => (
                        <div
                          key={drink.drinkid}
                          className={`rounded-xl border flex flex-col overflow-hidden ${cfg.cardBg} ${cfg.border}`}
                        >
                          {/* Drink image — fixed height so the name is never pushed out */}
                          <div className="relative w-full h-20 shrink-0">
                            {!imgErrors.has(drink.drinkid) ? (
                              <Image
                                src={getDrinkImagePath(drink.name)}
                                alt={drink.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, 20vw"
                                onError={() =>
                                  setImgErrors(prev => new Set(prev).add(drink.drinkid))
                                }
                              />
                            ) : (
                              /* Neutral placeholder when image file does not exist */
                              <div className="absolute inset-0 bg-black/20" />
                            )}
                          </div>

                          {/* Drink name + price */}
                          <div className="px-2 py-1.5 flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-white leading-snug line-clamp-2">
                              {drink.name}
                            </span>
                            <span className={`text-xs font-bold ${cfg.color}`}>
                              ${Number(drink.cost).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                  </section>
                );
              })}
            </div>

            {/* ── Toppings strip — compact single row at the bottom ────── */}
            {toppings.length > 0 && (
              <section className="shrink-0">
                <div className="flex items-center gap-2 mb-1.5 px-3 py-1 rounded-lg border bg-teal-500/10 border-teal-500/20">
                  <span className="h-2 w-2 rounded-full bg-teal-400 shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
                    Add-Ons &amp; Toppings
                  </h2>
                </div>

                {/* Toppings scroll horizontally if there are many */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {toppings.map(topping => (
                    <div
                      key={topping.toppingid}
                      className="shrink-0 rounded-xl border border-teal-600/25 bg-teal-950/25 px-3 py-2 flex flex-col gap-0.5 min-w-[80px]"
                    >
                      {/*
                        ── TOPPING IMAGE (optional) ──────────────────────────────
                        Place at: /public/images/toppings/<slug>.png
                        e.g. "Boba Pearls" → /public/images/toppings/boba-pearls.png
                        ─────────────────────────────────────────────────────────
                      */}
                      <span className="font-medium text-xs text-white leading-snug">{topping.name}</span>
                      <span className="text-[10px] font-bold text-teal-300">
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

      {/* ── Footer note ────────────────────────────────────────────────── */}
      <footer className="shrink-0 text-center py-1.5 text-amber-900/40 text-[9px] tracking-[0.3em] uppercase border-t border-amber-900/20">
        Prices subject to change · Tax not included
      </footer>

      <Link
        href="/"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-amber-700/60 bg-[#1e1000] px-3 py-1.5 text-xs font-semibold text-amber-400 shadow-xl transition hover:-translate-y-0.5 hover:bg-amber-900/60 focus:outline-none focus:ring-4 focus:ring-amber-700/40"
      >
        ← Back
      </Link>
    </div>
  );
}
