'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Drink, Topping, CartItem, CartItemTopping, DrinkCustomization, lineTotal, lineTotalDiscounted } from '@/types';
import { HAPPY_HOUR_START, HAPPY_HOUR_END, HAPPY_HOUR_DISCOUNT_PCT } from '@/lib/happyHour';

const DEFAULT_CUSTOMIZATION: DrinkCustomization = {
  hot: 'No',
  sweetness: '100%',
  ice: 'Normal',
};
const HOT_OPTIONS: DrinkCustomization['hot'][] = ['Yes', 'No'];
const SWEETNESS_OPTIONS: DrinkCustomization['sweetness'][] = ['0%', '25%', '50%', '75%', '100%'];
const ICE_OPTIONS: DrinkCustomization['ice'][] = ['None', 'Less', 'Normal', 'More'];
const PAYMENT_OPTIONS = ['Cash', 'Credit'] as const;
type PaymentMethod = (typeof PAYMENT_OPTIONS)[number];
const HIDDEN_CUSTOMIZATION_TOPPINGS = new Set(['hot', 'sugar', 'ice']);
const DISCOUNT = 1 - HAPPY_HOUR_DISCOUNT_PCT / 100; // e.g. 0.80 for 20% off

export default function CustomerPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customizing, setCustomizing] = useState<Drink | null>(null);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [showUpsell, setShowUpsell] = useState(false);

  // --- Happy hour: computed purely client-side, rechecked every minute ---
  const [isHappyHour, setIsHappyHour] = useState(false);
  useEffect(() => {
    const check = () => {
      const h = new Date().getHours();
      setIsHappyHour(h >= HAPPY_HOUR_START && h < HAPPY_HOUR_END);
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  const discountMultiplier = isHappyHour ? DISCOUNT : 1;

  useEffect(() => {
    fetch('/api/drinks').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setDrinks(data);
      else console.error('Drinks API error:', data);
    });
    fetch('/api/toppings').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setToppings(data);
      else console.error('Toppings API error:', data);
    });
  }, []);

  const categories = ['All', ...Array.from(new Set(drinks.map(d => d.category || 'Other')))];

  const categoryCardColors: Record<string, string> = {
    'Fruity':   'bg-pink-50 border-pink-200 hover:bg-pink-100',
    'Milk Tea': 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    'Other':    'bg-gray-50 border-gray-200 hover:bg-gray-100',
  };

  const filteredDrinks = selectedCategory === 'All'
    ? drinks
    : drinks.filter(d => (d.category || 'Other') === selectedCategory);

  const cartTotal = cart.reduce((sum, item) => sum + lineTotalDiscounted(item, discountMultiplier), 0);
  const cartFullPrice = cart.reduce((sum, item) => sum + lineTotal(item), 0);
  const cartSavings = cartFullPrice - cartTotal;

  const addToCart = useCallback((
    drink: Drink,
    quantity: number,
    selectedToppings: CartItemTopping[],
    customization: DrinkCustomization
  ) => {
    setCart(prev => [...prev, { drink, quantity, toppings: selectedToppings, customization }]);
    setCustomizing(null);
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const placeOrder = async (tip: number) => {
    if (cart.length === 0) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, tip }),
      });
      if (res.ok) {
        setCart([]);
        setOrderPlaced(true);
        setTimeout(() => setOrderPlaced(false), 3000);
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  const checkout = () => {
    if (cart.length === 0) return;
    setShowUpsell(true);
  };

  return (
    <div className={`flex h-screen text-black transition-colors duration-500 ${isHappyHour ? 'bg-amber-50' : 'bg-[#f5efe6]'}`}>
      <Link
        href="/"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-200 sm:bottom-6 sm:left-6"
      >
        Back to Home
      </Link>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header — always shows the happy hour schedule */}
        <header className={`border-b px-6 py-4 flex items-center justify-between transition-colors duration-500 ${isHappyHour ? 'bg-amber-400 border-amber-500' : 'bg-white'}`}>
          <h1 className={`text-2xl font-bold ${isHappyHour ? 'text-amber-950' : ''}`}>Order Here</h1>
          <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full border ${
            isHappyHour
              ? 'bg-amber-900 text-amber-100 border-amber-900 animate-pulse'
              : 'bg-white text-amber-700 border-amber-300'
          }`}>
            <span>🧋</span>
            <span>
              {isHappyHour
                ? `Happy Hour — ${HAPPY_HOUR_DISCOUNT_PCT}% OFF NOW!`
                : `Happy Hour 6–8 PM · ${HAPPY_HOUR_DISCOUNT_PCT}% off`}
            </span>
          </div>
        </header>

        {/* Big active banner */}
        {isHappyHour && (
          <div className="bg-amber-400 border-b border-amber-500 px-6 py-3 text-center">
            <p className="text-amber-950 font-bold text-lg tracking-wide">
              Happy Hour is ON! All drinks {HAPPY_HOUR_DISCOUNT_PCT}% off until 8 PM
            </p>
            <p className="text-amber-800 text-sm">Discounted prices shown below</p>
          </div>
        )}

        {/* Category tabs */}
        <div className={`flex gap-2 px-6 py-3 border-b overflow-x-auto ${isHappyHour ? 'bg-amber-50 border-amber-200' : ''}`}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${
                selectedCategory === cat
                  ? isHappyHour ? 'bg-amber-700 text-white' : 'bg-black text-white'
                  : isHappyHour ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Drink grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredDrinks.map(drink => (
              <div
                key={drink.drinkid}
                className={`border rounded-xl p-4 text-left aspect-square flex flex-col justify-between relative transition-all ${
                  isHappyHour
                    ? 'bg-amber-100 border-amber-400 hover:bg-amber-200 shadow-md'
                    : categoryCardColors[drink.category || 'Other'] || categoryCardColors['Other']
                }`}
              >
                {isHappyHour && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-tight">
                    -{HAPPY_HOUR_DISCOUNT_PCT}%
                  </span>
                )}
                <span className="font-medium pr-8">{drink.name}</span>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    {isHappyHour ? (
                      <>
                        <span className="text-xs text-gray-500 line-through">${Number(drink.cost).toFixed(2)}</span>
                        <span className="text-base font-bold text-amber-800">${(Number(drink.cost) * DISCOUNT).toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="text-gray-600">${Number(drink.cost).toFixed(2)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setCustomizing(drink)}
                    className={`drink-add-btn w-8 h-8 rounded-full text-white text-lg flex items-center justify-center ${
                      isHappyHour ? 'bg-amber-700 hover:bg-amber-800' : 'bg-black hover:bg-gray-800'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filteredDrinks.length === 0 && (
            <p className="text-gray-400 text-center mt-12">No drinks found.</p>
          )}
        </div>
      </div>

      {/* Cart sidebar */}
      <div className={`w-80 border-l flex flex-col transition-colors duration-500 ${isHappyHour ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
        <div className={`px-4 py-4 border-b flex items-center justify-between ${isHappyHour ? 'border-amber-300' : ''}`}>
          <h2 className="text-lg font-bold">Your Order</h2>
          <ChatToggle />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-8">Your cart is empty.</p>
          )}
          {cart.map((item, i) => (
            <div key={i} className={`border rounded p-3 ${isHappyHour ? 'bg-white border-amber-200' : 'bg-white border-gray-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{item.drink.name} x{item.quantity}</p>
                  <p className="text-xs text-gray-500">
                    Hot: {item.customization.hot} | Sweetness: {item.customization.sweetness} | Ice: {item.customization.ice}
                  </p>
                  {item.toppings.filter(t => t.amount > 0).map(t => (
                    <p key={t.toppingid} className="text-xs text-gray-500">
                      + {t.name} x{t.amount}
                    </p>
                  ))}
                </div>
                <button
                  onClick={() => removeFromCart(i)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Remove
                </button>
              </div>
              {isHappyHour ? (
                <div className="flex justify-end items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 line-through">${lineTotal(item).toFixed(2)}</span>
                  <span className="text-sm font-bold text-amber-700">${lineTotalDiscounted(item, DISCOUNT).toFixed(2)}</span>
                </div>
              ) : (
                <p className="text-sm text-right mt-1">${lineTotal(item).toFixed(2)}</p>
              )}
            </div>
          ))}
        </div>

        <div className={`border-t p-4 ${isHappyHour ? 'border-amber-300' : ''}`}>
          {/* Savings callout */}
          {isHappyHour && cart.length > 0 && cartSavings > 0 && (
            <div className="mb-3 bg-amber-400 rounded-lg px-3 py-2 flex justify-between items-center">
              <span className="text-amber-950 text-sm font-semibold">You save</span>
              <span className="text-amber-950 font-bold">${cartSavings.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between mb-3">
            <span className="font-bold">Total</span>
            <span className={`font-bold ${isHappyHour && cart.length > 0 ? 'text-amber-700 text-lg' : ''}`}>
              ${cartTotal.toFixed(2)}
            </span>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Payment</label>
            <div className="customization-slider">
              {PAYMENT_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPaymentMethod(option)}
                  aria-pressed={paymentMethod === option}
                  className={`customization-option ${paymentMethod === option ? 'customization-option-active' : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className={`w-full py-3 text-white rounded font-medium disabled:opacity-40 ${
              isHappyHour ? 'bg-amber-700 hover:bg-amber-800' : 'bg-black hover:bg-gray-800'
            }`}
          >
            Place Order
          </button>
          {orderPlaced && (
            <p className="text-green-600 text-center text-sm mt-2">Order placed successfully! Payment: {paymentMethod}</p>
          )}
        </div>
      </div>

      {/* Customization modal */}
      {customizing && (
        <CustomizeModal
          drink={customizing}
          toppings={toppings}
          isHappyHour={isHappyHour}
          onAdd={addToCart}
          onClose={() => setCustomizing(null)}
        />
      )}

      {/* Upsell modal */}
      {showUpsell && (
        <UpsellModal
          drinks={drinks}
          cart={cart}
          isHappyHour={isHappyHour}
          onAddDrink={(drink) => setCart(prev => [...prev, { drink, quantity: 1, toppings: [], customization: DEFAULT_CUSTOMIZATION }])}
          onConfirm={(tip) => { setShowUpsell(false); placeOrder(tip); }}
          onClose={() => setShowUpsell(false)}
        />
      )}
    </div>
  );
}

// ─── Customize Modal ─────────────────────────────────────────────────────────

function CustomizeModal({
  drink,
  toppings,
  isHappyHour,
  onAdd,
  onClose,
}: {
  drink: Drink;
  toppings: Topping[];
  isHappyHour: boolean;
  onAdd: (drink: Drink, qty: number, toppings: CartItemTopping[], customization: DrinkCustomization) => void;
  onClose: () => void;
}) {
  const selectableToppings = toppings.filter(
    topping => !HIDDEN_CUSTOMIZATION_TOPPINGS.has(topping.name.trim().toLowerCase())
  );
  const [quantity, setQuantity] = useState(1);
  const [toppingAmounts, setToppingAmounts] = useState<Record<number, number>>({});
  const [hot, setHot] = useState<DrinkCustomization['hot']>(DEFAULT_CUSTOMIZATION.hot);
  const [sweetness, setSweetness] = useState<DrinkCustomization['sweetness']>(DEFAULT_CUSTOMIZATION.sweetness);
  const [ice, setIce] = useState<DrinkCustomization['ice']>(DEFAULT_CUSTOMIZATION.ice);
  const iceDisabled = hot === 'Yes';

  const setToppingAmount = (id: number, amount: number) => {
    setToppingAmounts(prev => ({ ...prev, [id]: Math.max(0, Math.min(10, amount)) }));
  };

  const handleAdd = () => {
    const selected: CartItemTopping[] = selectableToppings
      .filter(t => (toppingAmounts[t.toppingid] || 0) > 0)
      .map(t => ({
        toppingid: t.toppingid,
        name: t.name,
        price: Number(t.price),
        amount: toppingAmounts[t.toppingid],
      }));
    onAdd(drink, quantity, selected, { hot, sweetness, ice });
  };

  const toppingCost = selectableToppings.reduce(
    (sum, t) => sum + Number(t.price) * (toppingAmounts[t.toppingid] || 0),
    0
  );
  const drinkCost = isHappyHour ? Number(drink.cost) * DISCOUNT : Number(drink.cost);
  const itemTotal = (drinkCost + toppingCost) * quantity;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div className={`px-5 py-4 border-b ${isHappyHour ? 'bg-amber-50 border-amber-200' : ''}`}>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">{drink.name}</h3>
            {isHappyHour && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                -{HAPPY_HOUR_DISCOUNT_PCT}%
              </span>
            )}
          </div>
          {isHappyHour ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-400 line-through">${Number(drink.cost).toFixed(2)}</span>
              <span className="text-lg font-bold text-amber-700">${(Number(drink.cost) * DISCOUNT).toFixed(2)}</span>
              <span className="text-xs text-amber-600">Happy Hour price</span>
            </div>
          ) : (
            <p className="text-gray-600 mt-0.5">${Number(drink.cost).toFixed(2)}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-10 h-10 border rounded flex items-center justify-center text-lg"
              >
                -
              </button>
              <span className="text-lg w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(20, q + 1))}
                className="w-10 h-10 border rounded flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Hot Drink?</label>
              <div className="customization-slider">
                {HOT_OPTIONS.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setHot(option);
                      if (option === 'Yes') setIce('None');
                    }}
                    aria-pressed={hot === option}
                    className={`customization-option ${hot === option ? 'customization-option-active' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sweetness</label>
              <div className="customization-slider">
                {SWEETNESS_OPTIONS.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSweetness(option)}
                    aria-pressed={sweetness === option}
                    className={`customization-option ${sweetness === option ? 'customization-option-active' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${iceDisabled ? 'text-gray-400' : ''}`}>Ice</label>
              <div className="customization-slider">
                {ICE_OPTIONS.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => { if (!iceDisabled) setIce(option); }}
                    disabled={iceDisabled}
                    aria-pressed={ice === option}
                    className={`customization-option ${ice === option ? 'customization-option-active' : ''} ${iceDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toppings */}
          {selectableToppings.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Toppings</label>
              <div className="space-y-2">
                {selectableToppings.map(t => (
                  <div key={t.toppingid} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">{t.name}</span>
                      <span className="text-xs text-gray-500 ml-2">(+${Number(t.price).toFixed(2)})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setToppingAmount(t.toppingid, (toppingAmounts[t.toppingid] || 0) - 1)}
                        className="w-8 h-8 border rounded text-sm"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{toppingAmounts[t.toppingid] || 0}</span>
                      <button
                        onClick={() => setToppingAmount(t.toppingid, (toppingAmounts[t.toppingid] || 0) + 1)}
                        className="w-8 h-8 border rounded text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`border-t px-5 py-4 flex items-center justify-between ${isHappyHour ? 'bg-amber-50 border-amber-200' : ''}`}>
          <span className={`font-bold text-lg ${isHappyHour ? 'text-amber-700' : ''}`}>${itemTotal.toFixed(2)}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className={`px-4 py-2 text-white rounded ${isHappyHour ? 'bg-amber-700 hover:bg-amber-800' : 'bg-black hover:bg-gray-800'}`}
            >
              Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upsell Modal ─────────────────────────────────────────────────────────────

function UpsellModal({
  drinks,
  cart,
  isHappyHour,
  onAddDrink,
  onConfirm,
  onClose,
}: {
  drinks: Drink[];
  cart: CartItem[];
  isHappyHour: boolean;
  onAddDrink: (drink: Drink) => void;
  onConfirm: (tipAmount: number) => void;
  onClose: () => void;
}) {
  const cartDrinkIds = new Set(cart.map(i => i.drink.drinkid));
  const suggestions = drinks.filter(d => !cartDrinkIds.has(d.drinkid)).slice(0, 3);
  const [added, setAdded] = useState<Set<number>>(new Set());

  const discountMult = isHappyHour ? DISCOUNT : 1;
  const subtotal = cart.reduce((sum, item) => sum + lineTotalDiscounted(item, discountMult), 0);
  const TIP_PRESETS = [0, 15, 20, 25] as const;
  const [tipPct, setTipPct] = useState<number | null>(20);
  const [customTip, setCustomTip] = useState('');

  const tipAmount = customTip !== '' ? Math.max(0, parseFloat(customTip) || 0) : (subtotal * (tipPct ?? 0)) / 100;

  const handleAdd = (drink: Drink) => {
    onAddDrink(drink);
    setAdded(prev => new Set(prev).add(drink.drinkid));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-bold">Before you go...</h3>
          <p className="text-sm text-gray-500 mt-0.5">Want to add anything else to your order?</p>
        </div>

        <div className="p-4 space-y-2">
          {suggestions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">You got it all!</p>
          )}
          {suggestions.map(drink => (
            <div key={drink.drinkid} className="flex items-center justify-between border rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{drink.name}</p>
                {isHappyHour ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 line-through">${Number(drink.cost).toFixed(2)}</span>
                    <span className="text-xs font-bold text-amber-700">${(Number(drink.cost) * DISCOUNT).toFixed(2)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">${Number(drink.cost).toFixed(2)}</p>
                )}
              </div>
              <button
                onClick={() => handleAdd(drink)}
                disabled={added.has(drink.drinkid)}
                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors disabled:bg-green-100 disabled:text-green-700 bg-black text-white hover:bg-gray-800 disabled:cursor-default"
              >
                {added.has(drink.drinkid) ? 'Added!' : '+ Add'}
              </button>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 mt-1 px-4 pb-3">
          <p className="text-sm font-medium mb-2">Add a tip</p>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {TIP_PRESETS.map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => { setTipPct(pct); setCustomTip(''); }}
                className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                  tipPct === pct && customTip === ''
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pct === 0 ? 'No tip' : `${pct}%`}
                {pct !== 0 && <><br /><span className="font-normal opacity-70">${(subtotal * pct / 100).toFixed(2)}</span></>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500 whitespace-nowrap">Custom $</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={customTip}
              onChange={e => { setCustomTip(e.target.value); setTipPct(null); }}
              className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Tip</span><span>${tipAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold mt-1">
            <span>Total</span><span>${(subtotal + tipAmount).toFixed(2)}</span>
          </div>
        </div>

        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Keep browsing
          </button>
          <button
            onClick={() => onConfirm(tipAmount)}
            className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

function ChatToggle() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium hover:bg-gray-800 transition"
        aria-label="Toggle AI chat"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        AI Chat
      </button>
      {open && (
        <div className="fixed top-12 right-4 z-50 w-80 h-[28rem] bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-black text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="font-semibold text-sm">AI Chat Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
          </div>
          <ChatMessages />
        </div>
      )}
    </>
  );
}

function ChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hi! I can help you with our menu, recommendations, toppings, or allergen info. Ask me anything!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Sorry, something went wrong.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't connect. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-black'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-400">Typing...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-2 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask a question..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-40 hover:bg-gray-800"
        >
          Send
        </button>
      </div>
    </>
  );
}
