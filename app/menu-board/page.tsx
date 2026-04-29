'use client';

import { useState, useEffect } from 'react';
import { Drink, Topping } from '@/types';

const CATEGORY_ORDER = ['fruity', 'milk tea', 'signature', 'specialty', 'coffee', 'slushies', 'tea', 'other'];

const categoryConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
  'fruity': { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700', label: 'bg-pink-700' },
  'milk tea': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800', label: 'bg-amber-700' },
  'signature': { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700', label: 'bg-violet-600' },
  'specialty': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', label: 'bg-orange-700' },
  'coffee': { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-900', label: 'bg-yellow-800' },
  'slushies': { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700', label: 'bg-cyan-600' },
  'tea': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', label: 'bg-emerald-700' },
  'other': { bg: 'bg-stone-100', border: 'border-stone-300', text: 'text-stone-700', label: 'bg-stone-500' },
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

  // Build ordered drink list: Fruity → Milk Tea → Signature → Specialty → Tea → Other
  const orderedDrinks: Drink[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catDrinks = drinks.filter(d => (d.category ?? 'other').toLowerCase() === cat);
    orderedDrinks.push(...catDrinks);
  }

  const handleImgError = (id: number) => {
    setImgErrors(prev => new Set(prev).add(id));
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f8f3e3] text-[#2A2A2A] flex flex-col">

      <style jsx global>{`
        @keyframes scroll-wheel {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes scroll-toppings {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .drinks-wheel {
          animation: scroll-wheel 60s linear infinite;
          will-change: transform;
        }
        .toppings-track {
          animation: scroll-toppings 60s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .drinks-wheel, .toppings-track {
            animation: none;
          }
        }
      `}</style>

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <p className="text-stone-400 text-xs tracking-[0.35em] uppercase font-semibold hidden sm:block">
          Fresh Made Daily
        </p>
        <h1 className="text-3xl font-bold text-[#2A2A2A] tracking-tight mx-auto sm:mx-0">
          Our Menu
        </h1>
        <p className="text-stone-400 text-xs tracking-widest uppercase hidden sm:block">
          Customizable · All sizes
        </p>
      </header>

      {/* Main scroll area */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">

        {loading ? (
          <p className="text-stone-400 text-center m-auto text-xl tracking-wide">
            Loading menu…
          </p>
        ) : (
          <>
            {/* Giant drinks wheel - single continuous scroll */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <div className="drinks-wheel flex items-center gap-6 h-full py-4 px-2" style={{ width: 'max-content' }}>
                {/* First copy */}
                {orderedDrinks.map(drink => {
                  const cfg = getCatConfig(drink.category);
                  return (
                    <div
                      key={`${drink.drinkid}-a`}
                      className={`shrink-0 h-full flex flex-col items-center justify-center ${cfg.bg} ${cfg.border} border-4 rounded-3xl px-6 py-4`}
                      style={{ minWidth: '200px', maxWidth: '200px' }}
                    >
                      {/* Category label pill */}
                      <div className={`${cfg.label} text-white text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wide`}>
                        {drink.category ?? 'Other'}
                      </div>

                      {/* Large rectangular image - constrained to prevent overflow */}
                      <div className="w-full flex-1 min-h-0 max-h-[55%] rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-stone-100 mb-2">
                        {!imgErrors.has(drink.drinkid) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getDrinkImagePath(drink.name)}
                            alt={drink.name}
                            className="w-full h-full object-cover"
                            onError={() => handleImgError(drink.drinkid)}
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-200 flex items-center justify-center text-stone-400 text-4xl">
                            ☕
                          </div>
                        )}
                      </div>

                      {/* Drink name - always visible */}
                      <p className="text-lg font-bold text-[#2A2A2A] text-center leading-tight mb-1 line-clamp-2 shrink-0">
                        {drink.name}
                      </p>

                      {/* Price - always visible */}
                      <p className={`text-xl font-bold ${cfg.text} shrink-0`}>
                        ${Number(drink.cost).toFixed(2)}
                      </p>
                    </div>
                  );
                })}

                {/* Duplicate for seamless loop */}
                {orderedDrinks.map(drink => {
                  const cfg = getCatConfig(drink.category);
                  return (
                    <div
                      key={`${drink.drinkid}-b`}
                      className={`shrink-0 h-full flex flex-col items-center justify-center ${cfg.bg} ${cfg.border} border-4 rounded-3xl px-6 py-4`}
                      style={{ minWidth: '200px', maxWidth: '200px' }}
                    >
                      {/* Category label pill */}
                      <div className={`${cfg.label} text-white text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-wide`}>
                        {drink.category ?? 'Other'}
                      </div>

                      {/* Large rectangular image - constrained to prevent overflow */}
                      <div className="w-full flex-1 min-h-0 max-h-[55%] rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-stone-100 mb-2">
                        {!imgErrors.has(drink.drinkid) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getDrinkImagePath(drink.name)}
                            alt={drink.name}
                            className="w-full h-full object-cover"
                            onError={() => handleImgError(drink.drinkid)}
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-200 flex items-center justify-center text-stone-400 text-4xl">
                            ☕
                          </div>
                        )}
                      </div>

                      {/* Drink name - always visible */}
                      <p className="text-lg font-bold text-[#2A2A2A] text-center leading-tight mb-1 line-clamp-2 shrink-0">
                        {drink.name}
                      </p>

                      {/* Price - always visible */}
                      <p className={`text-xl font-bold ${cfg.text} shrink-0`}>
                        ${Number(drink.cost).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Toppings scrolling strip - filter out sugar, hot, ice */}
            {(() => {
              const filteredToppings = toppings.filter(t =>
                !['sugar', 'hot', 'ice'].includes(t.name.toLowerCase())
              );
              return filteredToppings.length > 0 && (
              <section className="shrink-0 py-2 border-t border-stone-200 bg-white/50 min-h-[70px]">
                <div className="flex items-center gap-2 mb-1 px-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500 shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
                    Add-Ons &amp; Toppings
                  </h2>
                </div>

                <div className="overflow-hidden max-h-[55px]">
                  <div className="toppings-track flex gap-3 px-4" style={{ width: 'max-content' }}>
                    {/* First copy */}
                    {filteredToppings.map(topping => (
                      <div key={`${topping.toppingid}-a`} className="shrink-0 rounded-xl border border-teal-200 bg-white px-3 py-1.5 flex flex-col gap-0.5 min-w-[90px]">
                        <span className="font-semibold text-xs text-[#2A2A2A] leading-tight">{topping.name}</span>
                        <span className="text-xs font-bold text-teal-600">+${Number(topping.price).toFixed(2)}</span>
                      </div>
                    ))}
                    {/* Duplicate for seamless loop */}
                    {filteredToppings.map(topping => (
                      <div key={`${topping.toppingid}-b`} className="shrink-0 rounded-xl border border-teal-200 bg-white px-3 py-1.5 flex flex-col gap-0.5 min-w-[90px]">
                        <span className="font-semibold text-xs text-[#2A2A2A] leading-tight">{topping.name}</span>
                        <span className="text-xs font-bold text-teal-600">+${Number(topping.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              );
            })()}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="shrink-0 text-center py-2 text-stone-400 text-xs tracking-[0.3em] uppercase border-t border-stone-200">
        Prices subject to change · Tax not included
      </footer>

    </div>
  );
}
