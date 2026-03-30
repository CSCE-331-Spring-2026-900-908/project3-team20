'use client';

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
    <div className="flex flex-col min-h-screen bg-white text-black">
      <header className="border-b px-6 py-4">
        <h1 className="text-2xl font-bold">Menu Board</h1>
      </header>

      <main className="flex-1 p-6">
        {loading ? (
          <p className="text-gray-400 text-center mt-12">Loading menu…</p>
        ) : (
          <div className="flex flex-col gap-8">
            {categories.map(category => (
              <section key={category}>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
                  {category}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {drinksByCategory[category].map(drink => (
                    <div
                      key={drink.drinkid}
                      className={`rounded p-3 border flex flex-col justify-between ${getCardColor(drink.category)}`}
                    >
                      <span className="font-medium text-sm">{drink.name}</span>
                      <span className="text-gray-500 text-xs mt-1">${Number(drink.cost).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {toppings.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
                  Toppings
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {toppings.map(topping => (
                    <div
                      key={topping.toppingid}
                      className="rounded p-3 border bg-teal-50 border-teal-200 flex flex-col justify-between"
                    >
                      <span className="font-medium text-sm">{topping.name}</span>
                      <span className="text-gray-500 text-xs mt-1">+${Number(topping.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
