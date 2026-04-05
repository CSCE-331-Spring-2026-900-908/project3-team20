'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Ingredient, Topping, MiscItem } from '@/types';

type AddType = 'ingredient' | 'topping' | 'misc';

export default function ManagerPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [miscItems, setMiscItems] = useState<MiscItem[]>([]);

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<AddType>('ingredient');
  const [addName, setAddName] = useState('');
  const [addQuantity, setAddQuantity] = useState(0);
  const [addCost, setAddCost] = useState('');
  const [addError, setAddError] = useState('');

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: AddType;
    id: number;
    name: string;
  } | null>(null);

  const fetchAll = () => {
    fetch('/api/ingredients').then(r => r.json()).then(d => { if (Array.isArray(d)) setIngredients(d); });
    fetch('/api/toppings').then(r => r.json()).then(d => { if (Array.isArray(d)) setToppings(d); });
    fetch('/api/misc').then(r => r.json()).then(d => { if (Array.isArray(d)) setMiscItems(d); });
  };

  useEffect(() => { fetchAll(); }, []);

  const openAdd = (type: AddType) => {
    setAddType(type);
    setAddName('');
    setAddQuantity(0);
    setAddCost('');
    setAddError('');
    setShowAddDialog(true);
  };

  const handleAdd = async () => {
    if (!addName.trim()) { setAddError('Name cannot be empty.'); return; }
    const costVal = parseFloat(addCost);
    if (isNaN(costVal) || costVal < 0) { setAddError('Cost/price must be a valid non-negative number.'); return; }

    const endpoints: Record<AddType, string> = {
      ingredient: '/api/ingredients',
      topping: '/api/toppings',
      misc: '/api/misc',
    };

    const body = addType === 'ingredient'
      ? { name: addName.trim(), totalquantity: addQuantity, cost: costVal }
      : { name: addName.trim(), totalquantity: addQuantity, price: costVal };

    const res = await fetch(endpoints[addType], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) { setAddError('Failed to add item.'); return; }
    setShowAddDialog(false);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const endpoints: Record<AddType, { url: string; key: string }> = {
      ingredient: { url: '/api/ingredients', key: 'ingredientid' },
      topping: { url: '/api/toppings', key: 'toppingid' },
      misc: { url: '/api/misc', key: 'anythingid' },
    };
    const { url, key } = endpoints[deleteTarget.type];
    await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: deleteTarget.id }),
    });
    setDeleteTarget(null);
    fetchAll();
  };

  const costLabel = addType === 'ingredient' ? 'Cost' : 'Price';

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <Link
        href="/"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-200"
      >
        Back to Home
      </Link>

      {/* Header */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50">
            Refresh
          </button>
          <button onClick={() => openAdd('ingredient')} className="px-4 py-2 text-sm rounded bg-amber-500 text-white hover:bg-amber-600">
            Add Ingredient
          </button>
          <button onClick={() => openAdd('topping')} className="px-4 py-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600">
            Add Topping
          </button>
          <button onClick={() => openAdd('misc')} className="px-4 py-2 text-sm rounded bg-emerald-500 text-white hover:bg-emerald-600">
            Add Misc
          </button>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Ingredients */}
        <section>
          <h2 className="text-lg font-bold mb-3">Ingredients</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {ingredients.map(ing => (
              <div
                key={ing.ingredientid}
                className="rounded-lg border-2 border-amber-400 bg-white p-4 flex flex-col gap-1 group relative"
              >
                <span className="font-bold text-sm">{ing.name}</span>
                <span className="text-gray-600 text-xs">Quantity: {ing.totalquantity}</span>
                <span className="text-gray-600 text-xs">Cost: ${Number(ing.cost).toFixed(2)}</span>
                <button
                  onClick={() => setDeleteTarget({ type: 'ingredient', id: ing.ingredientid, name: ing.name })}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 text-lg leading-none"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Toppings */}
        <section>
          <h2 className="text-lg font-bold mb-3">Toppings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {toppings.map(top => (
              <div
                key={top.toppingid}
                className="rounded-lg border-2 border-blue-400 bg-white p-4 flex flex-col gap-1 group relative"
              >
                <span className="font-bold text-sm">{top.name}</span>
                <span className="text-gray-600 text-xs">Quantity: {top.totalquantity}</span>
                <span className="text-gray-600 text-xs">Price: ${Number(top.price).toFixed(2)}</span>
                <button
                  onClick={() => setDeleteTarget({ type: 'topping', id: top.toppingid, name: top.name })}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 text-lg leading-none"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Misc */}
        <section>
          <h2 className="text-lg font-bold mb-3">Misc</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {miscItems.map(m => (
              <div
                key={m.anythingid}
                className="rounded-lg border-2 border-emerald-400 bg-white p-4 flex flex-col gap-1 group relative"
              >
                <span className="font-bold text-sm">{m.name}</span>
                <span className="text-gray-600 text-xs">Quantity: {m.totalquantity}</span>
                <span className="text-gray-600 text-xs">Price: ${Number(m.price).toFixed(2)}</span>
                <button
                  onClick={() => setDeleteTarget({ type: 'misc', id: m.anythingid, name: m.name })}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 text-lg leading-none"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">
              Add {addType === 'ingredient' ? 'Ingredient' : addType === 'topping' ? 'Topping' : 'Misc Item'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder={`${addType} name`}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={addQuantity}
                  onChange={e => setAddQuantity(parseInt(e.target.value) || 0)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{costLabel}</label>
                <input
                  type="text"
                  value={addCost}
                  onChange={e => setAddCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              {addError && <p className="text-red-500 text-sm">{addError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleAdd} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Delete {deleteTarget.type}</h3>
            <p className="text-sm text-gray-600 mb-5">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
