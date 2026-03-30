'use client';

import { useState, useEffect } from 'react';
import { Drink, Topping } from '@/types';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; badge: string }> = {
  'fruity':   { bg: 'bg-pink-950',  text: 'text-pink-100',  badge: 'bg-pink-500' },
  'milk tea': { bg: 'bg-amber-950', text: 'text-amber-100', badge: 'bg-amber-500' },
  'other':    { bg: 'bg-slate-800', text: 'text-slate-100', badge: 'bg-slate-500' },
};

function getCategoryStyle(category: string | null) {
  return CATEGORY_STYLES[(category ?? 'other').toLowerCase()] ?? CATEGORY_STYLES['other'];
}

export default function MenuBoardPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchData = () => {
    Promise.all([
      fetch('/api/drinks').then(r => r.json()),
      fetch('/api/toppings').then(r => r.json()),
    ]).then(([drinksData, toppingsData]) => {
      if (Array.isArray(drinksData)) setDrinks(drinksData);
      if (Array.isArray(toppingsData)) setToppings(toppingsData);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
    // Refresh menu data every 5 minutes
    const dataInterval = setInterval(fetchData, 5 * 60 * 1000);
    // Update clock every second
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  // Group drinks by category
  const categories = Array.from(
    new Set(drinks.map(d => d.category ?? 'Other'))
  );

  const drinksByCategory = categories.reduce<Record<string, Drink[]>>((acc, cat) => {
    acc[cat] = drinks.filter(d => (d.category ?? 'Other') === cat);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700 px-10 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Boba Menu</h1>
          <p className="text-gray-400 text-sm mt-0.5">All drinks are made fresh to order</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono font-semibold tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-gray-400 text-sm">
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 p-8">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-2xl animate-pulse">Loading menu…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {/* Drinks by category */}
            {categories.map(category => {
              const style = getCategoryStyle(category);
              return (
                <section key={category}>
                  <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-800 pb-2">
                    {category}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {drinksByCategory[category].map(drink => (
                      <div
                        key={drink.drinkid}
                        className={`rounded-xl p-5 flex flex-col justify-between ${style.bg}`}
                      >
                        <span className={`text-lg font-semibold leading-snug ${style.text}`}>
                          {drink.name}
                        </span>
                        <span className={`mt-3 text-2xl font-bold ${style.text}`}>
                          ${Number(drink.cost).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Toppings section */}
            {toppings.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-gray-800 pb-2">
                  Add-On Toppings
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {toppings.map(topping => (
                    <div
                      key={topping.toppingid}
                      className="rounded-xl p-4 bg-teal-950 flex flex-col justify-between"
                    >
                      <span className="text-teal-100 text-base font-medium leading-snug">
                        {topping.name}
                      </span>
                      <span className="text-teal-100 text-xl font-bold mt-2">
                        +${Number(topping.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 px-10 py-3 text-center text-gray-600 text-xs">
        Prices are subject to change &nbsp;·&nbsp; Please order at the kiosk!
      </footer>
    </div>
  );
}
