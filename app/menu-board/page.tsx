'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Drink, Topping } from '@/types';

const categoryConfig: Record<string, { headerBg: string; headerText: string; cardBg: string; border: string; dot: string; price: string }> = {
  'fruity': {
    headerBg: 'bg-pink-100 border-pink-200',
    headerText: 'text-pink-700',
    cardBg: 'bg-white hover:bg-pink-50',
    border: 'border-pink-200',
    dot: 'bg-pink-400',
    price: 'text-pink-600',
  },
  'milk tea': {
    headerBg: 'bg-amber-100 border-amber-200',
    headerText: 'text-amber-800',
    cardBg: 'bg-white hover:bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    price: 'text-amber-700',
  },
  'signature': {
    headerBg: 'bg-violet-100 border-violet-200',
    headerText: 'text-violet-700',
    cardBg: 'bg-white hover:bg-violet-50',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    price: 'text-violet-600',
  },
  'specialty': {
    headerBg: 'bg-orange-100 border-orange-200',
    headerText: 'text-orange-800',
    cardBg: 'bg-white hover:bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    price: 'text-orange-700',
  },
  'tea': {
    headerBg: 'bg-emerald-100 border-emerald-200',
    headerText: 'text-emerald-700',
    cardBg: 'bg-white hover:bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    price: 'text-emerald-600',
  },
  'other': {
    headerBg: 'bg-stone-100 border-stone-200',
    headerText: 'text-stone-700',
    cardBg: 'bg-white hover:bg-stone-50',
    border: 'border-stone-200',
    dot: 'bg-stone-500',
    price: 'text-stone-600',
  },
};

function getCatConfig(category: string | null) {
  const key = (category ?? 'other').toLowerCase();
  return categoryConfig[key] ?? categoryConfig['other'];
}

function getDrinkImagePath(drinkName: string): string {
  const slug = drinkName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `/images/drinks/${slug}.png`;
}

export default function MenuBoardPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div className="h-screen overflow-hidden bg-[#f8f3e3] text-[#2A2A2A] flex flex-col">

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <p className="text-stone-400 text-[10px] tracking-[0.35em] uppercase font-semibold hidden sm:block">
          Fresh Made Daily
        </p>
        <h1 className="text-2xl font-bold text-[#2A2A2A] tracking-tight mx-auto sm:mx-0">
          Our Menu
        </h1>
        <p className="text-stone-400 text-[10px] tracking-widest uppercase hidden sm:block">
          Customizable · All sizes
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col px-4 py-3 gap-3">

        {loading ? (
          <p className="text-stone-400 text-center m-auto text-lg tracking-wide">
            Loading menu…
          </p>
        ) : (
          <>
            {/* Categories side by side */}
            <div
              className="flex-1 overflow-hidden grid gap-4"
              style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
            >
              {categories.map(category => {
                const cfg = getCatConfig(category);
                return (
                  <section key={category} className="flex flex-col overflow-hidden">

                    {/* Category header */}
                    <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl border shrink-0 ${cfg.headerBg}`}>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <h2 className={`text-sm font-bold uppercase tracking-[0.15em] ${cfg.headerText}`}>
                        {category}
                      </h2>
                    </div>

                    {/* Drink list */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-1">
                      {drinksByCategory[category].map(drink => (
                        <div
                          key={drink.drinkid}
                          className={`flex-1 min-h-0 rounded-xl border flex items-center gap-2 px-2 py-1 transition-colors ${cfg.cardBg} ${cfg.border}`}
                        >
                          {/* Small circular image bubble */}
                          <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm bg-stone-100">
                            {!imgErrors.has(drink.drinkid) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getDrinkImagePath(drink.name)}
                                alt={drink.name}
                                className="w-full h-full object-cover"
                                onError={() =>
                                  setImgErrors(prev => new Set(prev).add(drink.drinkid))
                                }
                              />
                            ) : (
                              <div className="w-full h-full bg-stone-200 flex items-center justify-center text-stone-400 text-xs">
                                ☕
                              </div>
                            )}
                          </div>

                          {/* Name + price */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#2A2A2A] leading-snug truncate">
                              {drink.name}
                            </p>
                            <p className={`text-xs font-bold mt-0.5 ${cfg.price}`}>
                              ${Number(drink.cost).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                  </section>
                );
              })}
            </div>

            {/* Toppings strip */}
            {toppings.length > 0 && (
              <section className="shrink-0">
                <div className="flex items-center gap-2 mb-1.5 px-3 py-1.5 rounded-xl border bg-teal-50 border-teal-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500 shrink-0" />
                  <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-teal-700">
                    Add-Ons &amp; Toppings
                  </h2>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {toppings.map(topping => (
                    <div
                      key={topping.toppingid}
                      className="shrink-0 rounded-xl border border-teal-200 bg-white px-3 py-2 flex flex-col gap-0.5 min-w-[80px]"
                    >
                      <span className="font-semibold text-xs text-[#2A2A2A] leading-snug">{topping.name}</span>
                      <span className="text-[10px] font-bold text-teal-600">
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

      {/* Footer */}
      <footer className="shrink-0 text-center py-1.5 text-stone-400 text-[9px] tracking-[0.3em] uppercase border-t border-stone-200">
        Prices subject to change · Tax not included
      </footer>

      <Link
        href="/"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-md transition hover:-translate-y-0.5 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-300"
      >
        ← Back
      </Link>
    </div>
  );
}
