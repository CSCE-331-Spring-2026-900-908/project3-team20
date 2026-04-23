'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Ingredient, Topping, MiscItem } from '@/types';
import EmployeeManager from '@/app/components/EmployeeManager';

type Drink = {
  drinkid: number;
  name: string;
  cost: number;
  category: string;
};

type RecipeRow = {
  ingredientid: number;
  amount: number;
};

type AddType = 'ingredient' | 'topping' | 'misc';
type ManagerView = 'inventory' | 'menu' | 'employees' | 'reports';
type ReportRow = Record<string, string | number>;

function ReportTable({
  title,
  rows,
  columns,
}: {
  title: string;
  rows: ReportRow[];
  columns: { key: string; label: string; format?: 'currency' | 'hour' | 'date' }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_ROWS = 5;
  const visibleRows = expanded ? rows : rows.slice(0, PREVIEW_ROWS);

  const fmt = (val: string | number, format?: 'currency' | 'hour' | 'date') => {
    if (format === 'currency') return `$${Number(val).toFixed(2)}`;
    if (format === 'date') return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (format === 'hour') {
      const h = Number(val);
      return h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    }
    return String(val);
  };

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-gray-400 text-sm">No data.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {columns.map(col => (
                    <th key={col.key} className="px-4 py-2.5 text-left font-medium text-gray-600">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {visibleRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-2.5 text-gray-800">
                        {fmt(row[col.key], col.format)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > PREVIEW_ROWS && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-2 text-sm text-gray-500 hover:text-black hover:underline"
            >
              {expanded ? 'Show less' : `Show all ${rows.length} rows`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

type XReportData = {
  alreadyRun?: boolean;
  date: string;
  generatedAt: string;
  totalOrders: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  hourlyBreakdown: { hour: number; order_count: number; total_sales: number }[];
};

type ZReportData = {
  alreadyRun: boolean;
  date: string;
  generatedAt?: string;
  totalOrders?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  totalProfit?: number;
  tax?: number;
  totalWithTax?: number;
  employees?: { name: string; order_count: number }[];
};


export default function ManagerPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [miscItems, setMiscItems] = useState<MiscItem[]>([]);
  const [view, setView] = useState<ManagerView>('inventory');
  const [showXReport, setShowXReport] = useState(false);
  const [showCustomReport, setShowCustomReport] = useState(false);
  const [xReportData, setXReportData] = useState<XReportData | null>(null);
  const [xReportLoading, setXReportLoading] = useState(false);

  const [showZReport, setShowZReport] = useState(false);
  const [zReportData, setZReportData] = useState<ZReportData | null>(null);
  const [zReportLoading, setZReportLoading] = useState(false);

  const [reports, setReports] = useState<{
    weekly: ReportRow[];
    peakDays: ReportRow[];
    hourly: ReportRow[];
    menuInventory: ReportRow[];
  }>({ weekly: [], peakDays: [], hourly: [], menuInventory: [] });
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);

  const [customReportData, setCustomReportData] = useState<{
    startDate: string;
    endDate: string;
    totalOrders: number;
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    dailyBreakdown: { date: string; order_count: number; total_sales: number }[];
  } | null>(null);
  const [customReportLoading, setCustomReportLoading] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customReportError, setCustomReportError] = useState('');

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [showAddDrinkDialog, setShowAddDrinkDialog] = useState(false);
  const [addDrinkName, setAddDrinkName] = useState('');
  const [addDrinkCost, setAddDrinkCost] = useState('');
  const [addDrinkError, setAddDrinkError] = useState('');
  const [deleteDrinkTarget, setDeleteDrinkTarget] = useState<Drink | null>(null);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([{ ingredientid: 0, amount: 0 }]);


  const fetchReports = async () => {
    setReportsLoading(true);
    const [weekly, peakDays, hourly, menuInventory] = await Promise.all([
      fetch('/api/reports/weekly-sales').then(r => r.json()),
      fetch('/api/reports/peak-days').then(r => r.json()),
      fetch('/api/reports/hourly-sales').then(r => r.json()),
      fetch('/api/reports/menu-inventory').then(r => r.json()),
    ]);
    setReports({ weekly, peakDays, hourly, menuInventory });
    setReportsLoaded(true);
    setReportsLoading(false);
  };

  const fetchXReport = async () => {
    setXReportLoading(true);
    const res = await fetch('/api/reports/x-report');
    const data = await res.json();
    setXReportData(data);
    setXReportLoading(false);
    setShowXReport(true);
  };

  const fetchZReport = async () => {
    setZReportLoading(true);
    const res = await fetch('/api/reports/z-report');
    const data = await res.json();
    setZReportData(data);
    setZReportLoading(false);
    setShowZReport(true);
  };

  const fetchCustomReport = async () => {
    if (!customStartDate || !customEndDate) { setCustomReportError('Please select both dates.'); return; }
    if (customStartDate > customEndDate) { setCustomReportError('Start date must be before end date.'); return; }
    setCustomReportError('');
    setCustomReportLoading(true);
    const res = await fetch(`/api/reports/custom-report?start=${customStartDate}&end=${customEndDate}`);
    const data = await res.json();
    setCustomReportData(data);
    setCustomReportLoading(false);
  };

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addType, setAddType] = useState<AddType>('ingredient');
  const [addName, setAddName] = useState('');
  const [addQuantity, setAddQuantity] = useState(0);
  const [addCost, setAddCost] = useState('');
  const [addError, setAddError] = useState('');

  // Edit/reorder dialog state
  const [editTarget, setEditTarget] = useState<{
    type: AddType;
    id: number;
    name: string;
    currentQty: number;
  } | null>(null);
  const [editQuantity, setEditQuantity] = useState('');

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

  const fetchDrinks = () => {
    fetch('/api/drinks').then(r => r.json()).then(d => { if (Array.isArray(d)) setDrinks(d); });
  };

  useEffect(() => { fetchAll(); fetchDrinks(); }, []);



  const handleAddDrink = async () => {
    if (!addDrinkName.trim()) { setAddDrinkError('Name cannot be empty.'); return; }
    const costVal = parseFloat(addDrinkCost);
    if (isNaN(costVal) || costVal < 0) { setAddDrinkError('Cost must be a valid non-negative number.'); return; }
    if (recipeRows.some(r => r.ingredientid === 0 || r.amount <= 0)) {
      setAddDrinkError('All recipe rows must have an ingredient and amount greater than 0.');
      return;
    }

    const res = await fetch('/api/drinks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addDrinkName.trim(),
        cost: costVal,
        recipes: recipeRows,
      }),
    });
    if (!res.ok) { setAddDrinkError('Failed to add drink.'); return; }
    setShowAddDrinkDialog(false);
    setAddDrinkName('');
    setAddDrinkCost('');
    setRecipeRows([{ ingredientid: 0, amount: 0 }]);
    fetchDrinks();
  };

  const handleDeleteDrink = async () => {
    if (!deleteDrinkTarget) return;
    await fetch('/api/drinks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drinkid: deleteDrinkTarget.drinkid }),
    });
    setDeleteDrinkTarget(null);
    fetchDrinks();
  };

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

  const openEdit = (type: AddType, id: number, name: string, currentQty: number) => {
    setEditTarget({ type, id, name, currentQty });
    setEditQuantity(String(currentQty));
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    const qty = parseInt(editQuantity) || 0;
    const delta = qty - editTarget.currentQty;
    if (delta === 0) { setEditTarget(null); return; }

    const endpoints: Record<AddType, { url: string; key: string }> = {
      ingredient: { url: '/api/ingredients', key: 'ingredientid' },
      topping: { url: '/api/toppings', key: 'toppingid' },
      misc: { url: '/api/misc', key: 'anythingid' },
    };
    const { url, key } = endpoints[editTarget.type];
    await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: editTarget.id, delta }),
    });
    setEditTarget(null);
    fetchAll();
  };

  const costLabel = addType === 'ingredient' ? 'Cost' : 'Price';
  const visibleToppings = toppings.filter(top => top.name.trim().toLowerCase() !== 'hot');
  const handleViewChange = (nextView: ManagerView) => {
    setView(nextView);
    if (nextView === 'reports' && !reportsLoaded) {
      void fetchReports();
    }
  };

  return (
    <main className="min-h-full bg-gray-50 text-black">
      <Link
        href="/"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-200"
      >
        Back to Home
      </Link>

      {/* Header */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Manager</h1>
          <div className="flex gap-1">
            {(['inventory', 'menu', 'employees', 'reports'] as const).map(v => (
              <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-4 py-1.5 rounded-full text-sm border transition-colors capitalize ${
                  view === v ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300 hover:bg-gray-100'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {view === 'inventory' && (
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
        )}
        {view === 'menu' && (
          <button
            onClick={() => { setAddDrinkName(''); setAddDrinkCost(''); setAddDrinkError(''); setShowAddDrinkDialog(true); }}
            className="px-4 py-2 text-sm rounded bg-rose-500 text-white hover:bg-rose-600"
          >
            Add Drink
          </button>
        )}
        {view === 'reports' && (
          <div className="flex gap-2">
            <button
              onClick={fetchXReport}
              className="px-4 py-2 text-sm rounded bg-purple-500 text-white hover:bg-purple-600"
            >
              X Report
            </button>
            <button
              onClick={fetchZReport}
              className="px-4 py-2 text-sm rounded bg-purple-500 text-white hover:bg-purple-600"
            >
              Z Report
            </button>
            <button
              onClick={() => setShowCustomReport(true)}
              className="px-4 py-2 text-sm rounded bg-purple-500 text-white hover:bg-purple-600"
            >
              Custom Report
            </button>
          </div>
        )}
      </header>
      {view === 'inventory' && (
        <div className="p-6 space-y-8">
          {/* Ingredients */}
          <section>
            <h2 className="text-lg font-bold mb-3">Ingredients</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {ingredients.map(ing => {
                const isLow = ing.totalquantity < 100;
                return (
                  <div
                    key={ing.ingredientid}
                    onClick={() => openEdit('ingredient', ing.ingredientid, ing.name, ing.totalquantity)}
                    className={`rounded-lg border-2 border-amber-400 p-4 flex flex-col gap-1 group relative cursor-pointer hover:shadow-md transition ${isLow ? 'bg-red-50' : 'bg-white'}`}
                  >
                    {isLow && (
                      <span className="absolute top-1 right-1 z-10 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        LOW STOCK
                      </span>
                    )}
                    <span className="font-bold text-sm">{ing.name}</span>
                    <span className={`text-xs ${isLow ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>Quantity: {ing.totalquantity}</span>
                    <span className="text-gray-600 text-xs">Cost: ${Number(ing.cost).toFixed(2)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'ingredient', id: ing.ingredientid, name: ing.name }); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 text-lg leading-none"
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Toppings */}
          <section>
            <h2 className="text-lg font-bold mb-3">Toppings</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {visibleToppings.map(top => {
                const isLow = top.totalquantity < 100;
                return (
                  <div
                    key={top.toppingid}
                    onClick={() => openEdit('topping', top.toppingid, top.name, top.totalquantity)}
                    className={`rounded-lg border-2 border-blue-400 p-4 flex flex-col gap-1 group relative cursor-pointer hover:shadow-md transition ${isLow ? 'bg-red-50' : 'bg-white'}`}
                  >
                    {isLow && (
                      <span className="absolute top-1 right-1 z-10 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        LOW STOCK
                      </span>
                    )}
                    <span className="font-bold text-sm">{top.name}</span>
                    <span className={`text-xs ${isLow ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>Quantity: {top.totalquantity}</span>
                    <span className="text-gray-600 text-xs">Price: ${Number(top.price).toFixed(2)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'topping', id: top.toppingid, name: top.name }); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 text-lg leading-none"
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Misc */}
          <section>
            <h2 className="text-lg font-bold mb-3">Misc</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {miscItems.map(m => {
                const isLow = m.totalquantity < 100;
                return (
                  <div
                    key={m.anythingid}
                    onClick={() => openEdit('misc', m.anythingid, m.name, m.totalquantity)}
                    className={`rounded-lg border-2 border-emerald-400 p-4 flex flex-col gap-1 group relative cursor-pointer hover:shadow-md transition ${isLow ? 'bg-red-50' : 'bg-white'}`}
                  >
                    {isLow && (
                      <span className="absolute top-1 right-1 z-10 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        LOW STOCK
                      </span>
                    )}
                    <span className="font-bold text-sm">{m.name}</span>
                    <span className={`text-xs ${isLow ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>Quantity: {m.totalquantity}</span>
                    <span className="text-gray-600 text-xs">Price: ${Number(m.price).toFixed(2)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'misc', id: m.anythingid, name: m.name }); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-600 text-lg leading-none"
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
      {view === 'menu' && (
        <div className="p-6 space-y-8">
          <section>
            <h2 className="text-lg font-bold mb-3">Menu</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {drinks.map(drink => (
                <div
                  key={drink.drinkid}
                  className="rounded-lg border-2 border-rose-400 p-4 flex flex-col gap-1 group relative bg-white hover:shadow-md transition"
                >
                  <span className="font-bold text-sm">{drink.name}</span>
                  <span className="text-gray-600 text-xs">Cost: ${Number(drink.cost).toFixed(2)}</span>
                  <button
                    onClick={() => setDeleteDrinkTarget(drink)}
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
      )}
      {view === 'employees' && <EmployeeManager />}
      {view === 'reports' && (
        <div className="p-6 space-y-4">
          <div className="flex justify-end">
            <button
              onClick={fetchReports}
              disabled={reportsLoading}
              className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {reportsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <ReportTable
              title="Weekly Sales History"
              rows={reports.weekly}
              columns={[
                { key: 'week', label: 'Week', format: 'date' },
                { key: 'orders_in_week', label: 'Orders' },
              ]}
            />
            <ReportTable
              title="Peak Sales Days"
              rows={reports.peakDays}
              columns={[
                { key: 'date', label: 'Date', format: 'date' },
                { key: 'daily_sales', label: 'Sales', format: 'currency' },
              ]}
            />
            <ReportTable
              title="Hourly Sales"
              rows={reports.hourly}
              columns={[
                { key: 'hour', label: 'Hour', format: 'hour' },
                { key: 'order_count', label: 'Orders' },
                { key: 'total_sales', label: 'Sales', format: 'currency' },
              ]}
            />
            <ReportTable
              title="Menu Item Ingredient Count"
              rows={reports.menuInventory}
              columns={[
                { key: 'drink_name', label: 'Drink' },
                { key: 'ingredient_count', label: 'Ingredients' },
              ]}
            />
          </div>
        </div>
      )}
      {showAddDrinkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Add Drink</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={addDrinkName} onChange={e => setAddDrinkName(e.target.value)}
                  placeholder="drink name" className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                <input type="text" value={addDrinkCost} onChange={e => setAddDrinkCost(e.target.value)}
                  placeholder="0.00" className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipe</label>
                <div className="space-y-2">
                  {recipeRows.map((row, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={row.ingredientid}
                        onChange={e => {
                          const updated = [...recipeRows];
                          updated[i].ingredientid = parseInt(e.target.value);
                          setRecipeRows(updated);
                        }}
                        className="flex-1 border rounded px-2 py-1.5 text-sm"
                      >
                        <option value={0}>Select ingredient</option>
                        {ingredients.map(ing => (
                          <option key={ing.ingredientid} value={ing.ingredientid}>{ing.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        placeholder="amount"
                        value={row.amount || ''}
                        onChange={e => {
                          const updated = [...recipeRows];
                          updated[i].amount = parseFloat(e.target.value) || 0;
                          setRecipeRows(updated);
                        }}
                        className="w-20 border rounded px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => setRecipeRows(recipeRows.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-lg leading-none"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setRecipeRows([...recipeRows, { ingredientid: 0, amount: 0 }])}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    + Add ingredient
                  </button>
                </div>
              </div>
              {addDrinkError && <p className="text-red-500 text-sm">{addDrinkError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAddDrinkDialog(false)} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddDrink} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>
            </div>
          </div>
        </div>
      )}
      {deleteDrinkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Delete Drink</h3>
            <p className="text-sm text-gray-600 mb-5">Are you sure you want to delete <strong>{deleteDrinkTarget.name}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteDrinkTarget(null)} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteDrink} className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Edit Quantity Dialog */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-1">Update Quantity</h3>
            <p className="text-sm text-gray-500 mb-4">{editTarget.name}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min={0}
                max={100000}
                value={editQuantity}
                onChange={e => setEditQuantity(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              {(parseInt(editQuantity) || 0) !== editTarget.currentQty && (
                <p className="text-xs text-gray-400 mt-1">
                  Change: {(parseInt(editQuantity) || 0) - editTarget.currentQty > 0 ? '+' : ''}{(parseInt(editQuantity) || 0) - editTarget.currentQty}
                </p>
              )}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => {
                  setEditTarget(null);
                  setDeleteTarget({ type: editTarget.type, id: editTarget.id, name: editTarget.name });
                }}
                className="px-4 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleEditSave} className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
                  Save
                </button>
              </div>
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
    
      {showXReport && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowXReport(false)}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold">X Report</h3>
              {xReportData && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {xReportData.date} — generated at {xReportData.generatedAt}
                </p>
              )}
            </div>
            <button onClick={() => setShowXReport(false)} className="text-gray-400 hover:text-black text-xl leading-none">&times;</button>
          </div>

          {xReportLoading && <p className="text-sm text-gray-400 text-center py-8">Loading...</p>}
          
          {!xReportLoading && xReportData?.alreadyRun && (
            <p className="text-sm text-gray-500 text-center py-6">
              Z report has already been run for today. No X report data available.
            </p>
          )}

          {!xReportLoading && xReportData && !xReportData.alreadyRun && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Orders', value: String(xReportData.totalOrders) },
                  { label: 'Total Revenue', value: `$${Number(xReportData.totalRevenue).toFixed(2)}` },
                  { label: 'Total Expenses', value: `$${Number(xReportData.totalExpenses).toFixed(2)}` },
                  { label: 'Total Profit', value: `$${Number(xReportData.totalProfit).toFixed(2)}` },
                ].map(stat => (
                  <div key={stat.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Sales by Hour</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Hour</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Orders</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {xReportData.hourlyBreakdown.map((row, i) => {
                        const h = row.hour;
                        const label =
                          h === 0 ? '12 AM' :
                          h < 12 ? `${h} AM` :
                          h === 12 ? '12 PM' :
                          `${h - 12} PM`;

                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{label}</td>
                            <td className="px-4 py-2">{row.order_count}</td>
                            <td className="px-4 py-2">
                              ${Number(row.total_sales).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}

                      {xReportData.hourlyBreakdown.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-gray-400 text-sm">
                            No orders today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end mt-5">
            <button onClick={() => setShowXReport(false)} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    {showCustomReport && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCustomReport(false)}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold">Custom Report</h3>
            <button onClick={() => { setShowCustomReport(false); setCustomReportData(null); }} className="text-gray-400 hover:text-black text-xl leading-none">&times;</button>
          </div>

          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchCustomReport}
                disabled={customReportLoading}
                className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {customReportLoading ? 'Loading...' : 'Generate'}
              </button>
            </div>
          </div>

          {customReportError && <p className="text-red-500 text-sm mb-3">{customReportError}</p>}

          {customReportData && !customReportLoading && (
            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Orders', value: String(customReportData.totalOrders) },
                  { label: 'Total Revenue', value: `$${Number(customReportData.totalRevenue).toFixed(2)}` },
                  { label: 'Total Expenses', value: `$${Number(customReportData.totalExpenses).toFixed(2)}` },
                  { label: 'Total Profit', value: `$${Number(customReportData.totalProfit).toFixed(2)}` },
                ].map(stat => (
                  <div key={stat.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{stat.label}</p>
                    <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Sales by Day</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Orders</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {customReportData.dailyBreakdown.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td className="px-4 py-2">{row.order_count}</td>
                          <td className="px-4 py-2">${Number(row.total_sales).toFixed(2)}</td>
                        </tr>
                      ))}
                      {customReportData.dailyBreakdown.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400 text-sm">No orders in this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button onClick={() => { setShowCustomReport(false); setCustomReportData(null); }} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    {showZReport && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowZReport(false)}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold">Z Report</h3>
              {zReportData && !zReportData.alreadyRun && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {zReportData.date && new Date(zReportData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — generated at {zReportData.generatedAt}
                </p>
              )}
            </div>
            <button onClick={() => setShowZReport(false)} className="text-gray-400 hover:text-black text-xl leading-none">&times;</button>
          </div>

          {zReportLoading && <p className="text-sm text-gray-400 text-center py-8">Loading...</p>}

          {zReportData && !zReportLoading && (
            <>
              {zReportData.alreadyRun ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Z report has already been run for today. Come back tomorrow.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Orders', value: String(zReportData.totalOrders) },
                      { label: 'Total Revenue', value: `$${Number(zReportData.totalRevenue).toFixed(2)}` },
                      { label: 'Tax (8.25%)', value: `$${Number(zReportData.tax).toFixed(2)}` },
                      { label: 'Revenue + Tax', value: `$${Number(zReportData.totalWithTax).toFixed(2)}` },
                      { label: 'Total Expenses', value: `$${Number(zReportData.totalExpenses).toFixed(2)}` },
                      { label: 'Total Profit', value: `$${Number(zReportData.totalProfit).toFixed(2)}` },
                    ].map(stat => (
                      <div key={stat.label} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">{stat.label}</p>
                        <p className="text-lg font-bold mt-0.5">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Employees</h4>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-gray-600">Employee</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-600">Orders Processed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {zReportData.employees?.map((emp, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2">{emp.name}</td>
                              <td className="px-4 py-2">{emp.order_count}</td>
                            </tr>
                          ))}
                          {zReportData.employees?.length === 0 && (
                            <tr><td colSpan={2} className="px-4 py-4 text-center text-gray-400 text-sm">No orders today.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 text-center pt-2 border-t">
                    This Z report has been recorded. Totals have been reset for the next business day.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end mt-5">
            <button onClick={() => setShowZReport(false)} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </main>
  );
}



