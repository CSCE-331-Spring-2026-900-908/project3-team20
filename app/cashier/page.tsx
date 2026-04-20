'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Drink, Topping, CartItem, CartItemTopping, DrinkCustomization, lineTotal } from '@/types';

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

export default function CashierPage() {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customizing, setCustomizing] = useState<Drink | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [employeeName, setEmployeeName] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [showUpsell, setShowUpsell] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

    useEffect(() => {
        const storedEmployeeId = localStorage.getItem('employeeId');
        const name = localStorage.getItem('employeeName');
        if (storedEmployeeId) {
            const parsedEmployeeId = Number(storedEmployeeId);
            if (!Number.isNaN(parsedEmployeeId)) setEmployeeId(parsedEmployeeId);
        }
        if (name) setEmployeeName(name);

        fetch('/api/drinks').then(r => r.json()).then(data => {
            if (Array.isArray(data)) setDrinks(data);
            else console.error('Drinks API error:', data);
        });
        fetch('/api/toppings').then(r => r.json()).then(data => {
            if (Array.isArray(data)) setToppings(data);
            else console.error('Toppings API error:', data);
        });
    }, []);

    const cartTotal = cart.reduce((sum, item) => sum + lineTotal(item), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const addToCart = useCallback((
        drink: Drink,
        quantity: number,
        selectedToppings: CartItemTopping[],
        customization: DrinkCustomization
    ) => {
        if (editingIndex !== null) {
            setCart(prev => prev.map((item, i) =>
                i === editingIndex ? { drink, quantity, toppings: selectedToppings, customization } : item
            ));
            setEditingIndex(null);
        } else {
            setCart(prev => [...prev, { drink, quantity, toppings: selectedToppings, customization }]);
        }
        setCustomizing(null);
    }, [editingIndex]);

    const editItem = useCallback((index: number) => {
        setEditingIndex(index);
        setCustomizing(cart[index].drink);
    }, [cart]);

    const removeFromCart = useCallback((index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    }, []);

    const placeOrder = async (tip: number) => {
        if (cart.length === 0) return;
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart, employeeId, tip }),
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

    const categoryColors: Record<string, string> = {
        'fruity':   'bg-pink-100 border-pink-300 hover:bg-pink-200',
        'milk tea': 'bg-amber-100 border-amber-300 hover:bg-amber-200',
        'other':    'bg-gray-100  border-gray-300  hover:bg-gray-200',
    };

    const getCardColor = (category: string) =>
        categoryColors[category.toLowerCase()] || categoryColors['other'];

    const clearCart = () => setCart([]);

    const categories = ['All', ...Array.from(new Set(drinks.map(d => d.category || 'Other')))];
    const filteredDrinks = selectedCategory === 'All'
        ? drinks
        : drinks.filter(d => (d.category || 'Other') === selectedCategory);

    return (
        <div className="flex h-full bg-white text-black">
            <Link
                href="/"
                className="fixed bottom-4 left-4 z-50 inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-200 sm:bottom-6 sm:left-6"
            >
                Back to Home
            </Link>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="border-b px-6 py-4">
                    <h1 className="text-2xl font-bold">{employeeName || 'Cashier'}</h1>
                </header>

                <div className="flex gap-2 px-6 pt-4 flex-wrap">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                                selectedCategory === cat
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-black border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredDrinks.map(drink => (
                            <div
                                key={drink.drinkid}
                                className={`rounded p-3 text-left flex flex-col justify-between relative border ${getCardColor(drink.category || 'other')}`}
                            >
                                <span className="font-medium text-sm">{drink.name}</span>
                                <div className="flex justify-between items-end mt-1">
                                    <span className="text-gray-500 text-xs">${Number(drink.cost).toFixed(2)}</span>
                                    <button
                                        onClick={() => setCustomizing(drink)}
                                        className="drink-add-btn w-8 h-8 rounded-full bg-black text-white text-lg flex items-center justify-center hover:bg-gray-800"
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

            <div className="w-80 border-l flex flex-col bg-gray-50">
                <div className="px-4 py-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">Order Summary {cartCount > 0 && `(${cartCount})`}</h2>
                    {cart.length > 0 && (
                        <button onClick={clearCart} className="text-red-500 text-sm hover:underline">
                            Clear All
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 && (
                        <p className="text-gray-400 text-sm text-center mt-8">No items added yet.</p>
                    )}
                    {cart.map((item, i) => (
                        <div key={i} className="bg-white border rounded p-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-sm">{item.drink.name} x{item.quantity}</p>
                                    <p className="text-xs text-gray-500">
                                        Hot: {item.customization.hot} | Sweetness: {item.customization.sweetness} | Ice: {item.customization.ice}
                                    </p>
                                    {item.toppings.filter(t => t.amount > 0).map(t => (
                                        <p key={t.toppingid} className="text-xs text-gray-500">
                                            + {t.name} x{t.amount}
                                        </p>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <button onClick={() => editItem(i)} className="text-blue-500 text-xs hover:underline">
                                        Edit
                                    </button>
                                    <button onClick={() => removeFromCart(i)} className="text-red-500 text-xs hover:underline">
                                        Remove
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-right mt-1">${lineTotal(item).toFixed(2)}</p>
                        </div>
                    ))}
                </div>

                <div className="border-t p-4">
                    <div className="flex justify-between mb-3">
                        <span className="font-bold">Total</span>
                        <span className="font-bold">${cartTotal.toFixed(2)}</span>
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
                        className="w-full py-3 bg-black text-white rounded font-medium disabled:opacity-40 hover:bg-gray-800"
                    >
                        Place Order
                    </button>
                    {orderPlaced && (
                        <p className="text-green-600 text-center text-sm mt-2">Order placed successfully! Payment: {paymentMethod}</p>
                    )}
                </div>
            </div>

            {customizing && (
                <CustomizeModal
                    drink={customizing}
                    toppings={toppings}
                    onAdd={addToCart}
                    onClose={() => { setCustomizing(null); setEditingIndex(null); }}
                    initialQuantity={editingIndex !== null ? cart[editingIndex].quantity : 1}
                    initialToppings={editingIndex !== null ? cart[editingIndex].toppings : []}
                    initialCustomization={editingIndex !== null ? cart[editingIndex].customization : DEFAULT_CUSTOMIZATION}
                />
            )}

            {showUpsell && (
                <UpsellModal
                    drinks={drinks}
                    cart={cart}
                    onAddDrink={(drink) => setCart(prev => [...prev, { drink, quantity: 1, toppings: [], customization: DEFAULT_CUSTOMIZATION }])}
                    onConfirm={(tip) => { setShowUpsell(false); placeOrder(tip); }}
                    onClose={() => setShowUpsell(false)}
                />
            )}
        </div>
    );
}

function UpsellModal({
    drinks,
    cart,
    onAddDrink,
    onConfirm,
    onClose,
}: {
    drinks: Drink[];
    cart: CartItem[];
    onAddDrink: (drink: Drink) => void;
    onConfirm: (tipAmount: number) => void;
    onClose: () => void;
}) {
    const cartDrinkIds = new Set(cart.map(i => i.drink.drinkid));
    const suggestions = drinks.filter(d => !cartDrinkIds.has(d.drinkid)).slice(0, 3);
    const [added, setAdded] = useState<Set<number>>(new Set());
    const subtotal = cart.reduce((sum, item) => sum + lineTotal(item), 0);
    const TIP_PRESETS = [0, 15, 20, 25] as const;
    const [tipPct, setTipPct] = useState<number | null>(20);
    const [customTip, setCustomTip] = useState('');

    const tipAmount = customTip !== ''? Math.max(0, parseFloat(customTip) || 0) : (subtotal * (tipPct ?? 0)) / 100;

    const handleAdd = (drink: Drink) => {
        onAddDrink(drink);
        setAdded(prev => new Set(prev).add(drink.drinkid));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b">
                    <h3 className="text-lg font-bold">Before you go...</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Want to add anything else to the order?</p>
                </div>

                <div className="p-4 space-y-2">
                    {suggestions.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-2">Order looks complete!</p>
                    )}
                    {suggestions.map(drink => (
                        <div key={drink.drinkid} className="flex items-center justify-between border rounded-lg px-3 py-2">
                            <div>
                                <p className="text-sm font-medium">{drink.name}</p>
                                <p className="text-xs text-gray-500">${Number(drink.cost).toFixed(2)}</p>
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

function CustomizeModal({
    drink,
    toppings,
    onAdd,
    onClose,
    initialQuantity = 1,
    initialToppings = [],
    initialCustomization = DEFAULT_CUSTOMIZATION,
}: {
    drink: Drink;
    toppings: Topping[];
    onAdd: (drink: Drink, qty: number, toppings: CartItemTopping[], customization: DrinkCustomization) => void;
    onClose: () => void;
    initialQuantity?: number;
    initialToppings?: CartItemTopping[];
    initialCustomization?: DrinkCustomization;
}) {
    const selectableToppings = toppings.filter(
        topping => !HIDDEN_CUSTOMIZATION_TOPPINGS.has(topping.name.trim().toLowerCase())
    );
    const [quantity, setQuantity] = useState(initialQuantity);
    const [toppingAmounts, setToppingAmounts] = useState<Record<number, number>>(
        Object.fromEntries(initialToppings.map(t => [t.toppingid, t.amount]))
    );
    const [hot, setHot] = useState<DrinkCustomization['hot']>(initialCustomization.hot);
    const [sweetness, setSweetness] = useState<DrinkCustomization['sweetness']>(initialCustomization.sweetness);
    const [ice, setIce] = useState<DrinkCustomization['ice']>(
        initialCustomization.hot === 'Yes' ? 'None' : initialCustomization.ice
    );
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
    const itemTotal = (Number(drink.cost) + toppingCost) * quantity;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b">
                    <h3 className="text-lg font-bold">{drink.name}</h3>
                    <p className="text-gray-500">${Number(drink.cost).toFixed(2)}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                                            if (option === 'Yes') {
                                                setIce('None');
                                            }
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
                                        onClick={() => {
                                            if (!iceDisabled) {
                                                setIce(option);
                                            }
                                        }}
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

                <div className="border-t px-5 py-4 flex items-center justify-between">
                    <span className="font-bold">${itemTotal.toFixed(2)}</span>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 border rounded text-sm">
                            Cancel
                        </button>
                        <button onClick={handleAdd} className="px-4 py-2 bg-black text-white rounded text-sm">
                            {initialQuantity !== 1 || initialToppings.length > 0 || initialCustomization.hot !== DEFAULT_CUSTOMIZATION.hot || initialCustomization.sweetness !== DEFAULT_CUSTOMIZATION.sweetness || initialCustomization.ice !== DEFAULT_CUSTOMIZATION.ice ? 'Update Order' : 'Add to Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
