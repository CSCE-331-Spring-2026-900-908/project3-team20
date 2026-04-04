'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Drink, Topping } from '@/types';

const categoryColors: Record<string, string> = {
  'fruity':   'bg-pink-100 border-pink-300',
  'milk tea': 'bg-amber-100 border-amber-300',
  'other':    'bg-gray-100 border-gray-300',
};

function getCardColor(category: string | null) {
  return categoryColors[(category ?? 'other').toLowerCase()] ?? categoryColors['other'];
}

export default function MenuBoardPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/drinks').then(r => r.json()),
      fetch('/api/toppings').then(r => r.json()),
    ]).then(([drinksData, toppingsData]) => {
      if (Array.isArray(drinksData)) setDrinks(drinksData);
      if (Array.isArray(toppingsData)) setToppings(toppingsData);
      setLoading(false);
    });

    const interval = setInterval(() => {
      Promise.all([
        fetch('/api/drinks').then(r => r.json()),
        fetch('/api/toppings').then(r => r.json()),
      ]).then(([drinksData, toppingsData]) => {
        if (Array.isArray(drinksData)) setDrinks(drinksData);
        if (Array.isArray(toppingsData)) setToppings(toppingsData);
      });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const categories = Array.from(new Set(drinks.map(d => d.category ?? 'Other')));
  const drinksByCategory = categories.reduce<Record<string, Drink[]>>((acc, cat) => {
    acc[cat] = drinks.filter(d => (d.category ?? 'Other') === cat);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-black">
      <Link
        href="/"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-200 sm:bottom-6 sm:left-6"
      >
        Back to Home
      </Link>

      <header className="shrink-0 border-b px-6 py-2">
        <h1 className="text-2xl font-bold">Menu Board</h1>
      </header>

      <main className="flex-1 min-h-0 p-4">
        {loading ? (
          <p className="text-gray-400 text-center mt-12">Loading menu…</p>
        ) : (() => {
          const totalItems = drinks.length + toppings.length;
          const totalRows = Math.ceil(totalItems / 4) + categories.length + (toppings.length > 0 ? 1 : 0);
          return (
            <div
              className="h-full grid grid-cols-4 gap-2"
              style={{ gridTemplateRows: `repeat(${totalRows}, 1fr)` }}
            >
              {categories.flatMap(category => [
                <h2
                  key={`header-${category}`}
                  className="col-span-4 flex items-end text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  {category}
                </h2>,
                ...drinksByCategory[category].map(drink => (
                  <div
                    key={drink.drinkid}
                    className={`rounded px-3 py-1 border flex flex-col justify-center overflow-hidden ${getCardColor(drink.category)}`}
                  >
                    <span className="font-medium text-sm truncate">{drink.name}</span>
                    <span className="text-gray-500 text-xs">${Number(drink.cost).toFixed(2)}</span>
                  </div>
                )),
              ])}
              {toppings.length > 0 && (
                <h2
                  key="header-toppings"
                  className="col-span-4 flex items-end text-xs font-semibold uppercase tracking-widest text-gray-500"
                >
                  Toppings
                </h2>
              )}
              {toppings.map(topping => (
                <div
                  key={topping.toppingid}
                  className="rounded px-3 py-1 border bg-teal-50 border-teal-200 flex flex-col justify-center overflow-hidden"
                >
                  <span className="font-medium text-sm truncate">{topping.name}</span>
                  <span className="text-gray-500 text-xs">+${Number(topping.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </main>

      <footer className="shrink-0 h-10" />
    </div>
  );
}
