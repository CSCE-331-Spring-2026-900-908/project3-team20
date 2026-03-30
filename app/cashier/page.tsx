'use client';

import { useState, useEffect, useCallback } from 'react';
import { Drink, Topping, CartItem, CartItemTopping, lineTotal } from '@/types';

export default function CashierPage() {
    const [drinks, setDrinks] = useState<Drink[]>([]);
    const [toppings, setToppings] = useState<Topping[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customizing, setCustomizing] = useState<Drink | null>(null);
    const [employeeId, setEmployeeId] = useState<number | null>(null);
    const [employeeName, setEmployeeName] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [orderPlaced, setOrderPlaced] = useState(false);

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

    const addToCart = useCallback((drink: Drink, quantity: number, selectedToppings: CartItemTopping[]) => {
        setCart(prev => [...prev, { drink, quantity, toppings: selectedToppings }]);
        setCustomizing(null);
    }, []);

    const removeFromCart = useCallback((index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    }, []);

    const checkout = async () => {
        if (cart.length === 0) return;
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart, employeeId }),
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
        <div className="flex h-screen bg-white text-black">
            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="border-b px-6 py-4">
                    <h1 className="text-2xl font-bold">{employeeName || 'Cashier'}</h1>
                </header>

                {/* Category tabs */}
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

                {/* Drink grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredDrinks.map(drink => (
                            <button
                                key={drink.drinkid}
                                onClick={() => setCustomizing(drink)}
                                className={`rounded p-3 text-left flex flex-col justify-between border ${getCardColor(drink.category || 'other')}`}
                            >
                                <span className="font-medium text-sm">{drink.name}</span>
                                <span className="text-gray-500 text-xs mt-1">${Number(drink.cost).toFixed(2)}</span>
                            </button>
                        ))}
                    </div>
                    {filteredDrinks.length === 0 && (
                        <p className="text-gray-400 text-center mt-12">No drinks found.</p>
                    )}
                </div>
            </div>

            {/* Cart sidebar */}
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
                                    {item.toppings.filter(t => t.amount > 0).map(t => (
                                        <p key={t.toppingid} className="text-xs text-gray-500">
                                            + {t.name} x{t.amount}
                                        </p>
                                    ))}
                                </div>
                                <button onClick={() => removeFromCart(i)} className="text-red-500 text-xs hover:underline">
                                    Remove
                                </button>
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
                    <button
                        onClick={checkout}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-black text-white rounded font-medium disabled:opacity-40 hover:bg-gray-800"
                    >
                        Place Order
                    </button>
                    {orderPlaced && (
                        <p className="text-green-600 text-center text-sm mt-2">Order placed successfully!</p>
                    )}
                </div>
            </div>

            {/* Customization modal */}
            {customizing && (
                <CustomizeModal
                    drink={customizing}
                    toppings={toppings}
                    onAdd={addToCart}
                    onClose={() => setCustomizing(null)}
                />
            )}
        </div>
    );
}

function CustomizeModal({
    drink,
    toppings,
    onAdd,
    onClose,
}: {
    drink: Drink;
    toppings: Topping[];
    onAdd: (drink: Drink, qty: number, toppings: CartItemTopping[]) => void;
    onClose: () => void;
}) {
    const [quantity, setQuantity] = useState(1);
    const [toppingAmounts, setToppingAmounts] = useState<Record<number, number>>({});

    const setToppingAmount = (id: number, amount: number) => {
        setToppingAmounts(prev => ({ ...prev, [id]: Math.max(0, Math.min(10, amount)) }));
    };

    const handleAdd = () => {
        const selected: CartItemTopping[] = toppings
            .filter(t => (toppingAmounts[t.toppingid] || 0) > 0)
            .map(t => ({
                toppingid: t.toppingid,
                name: t.name,
                price: Number(t.price),
                amount: toppingAmounts[t.toppingid],
            }));
        onAdd(drink, quantity, selected);
    };

    const toppingCost = toppings.reduce(
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

                    {toppings.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Toppings</label>
                            <div className="space-y-2">
                                {toppings.map(t => (
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
                            Add to Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
