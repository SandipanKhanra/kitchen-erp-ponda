import React, { useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { Plus, Search, AlertCircle, Edit3, Check, DollarSign, Package } from 'lucide-react';
import { Ingredient, IngredientCategory, BaseUnit } from '../../types/ingredient';
import { BASE_UNITS, INGREDIENT_CATEGORIES } from '../../config/constants';

export const IngredientManagement: React.FC = () => {
  const { ingredients, updateIngredientRate, updateIngredientStock } = useKitchen();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState<string>('');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStock, setTempStock] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Ingredient Form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<IngredientCategory>('Grains & Pulses');
  const [newUnit, setNewUnit] = useState<BaseUnit>('kg');
  const [newRate, setNewRate] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);
  const [newReorder, setNewReorder] = useState<number>(10);
  const [newSupplier, setNewSupplier] = useState('');

  const filtered = ingredients.filter((ing) => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || ing.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSaveRate = async (id: string) => {
    const parsed = parseFloat(tempRate);
    if (!isNaN(parsed) && parsed >= 0) {
      await updateIngredientRate(id, parsed);
    }
    setEditingRateId(null);
  };

  const handleSaveStock = async (id: string) => {
    const parsed = parseFloat(tempStock);
    if (!isNaN(parsed) && parsed >= 0) {
      await updateIngredientStock(id, parsed);
    }
    setEditingStockId(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Ingredients & Inventory</h1>
          <p className="text-sm text-slate-500">
            Edit live market rates (Feature 2) and manage on-hand stock counts (Feature 3).
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold shadow-md shadow-orange-500/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Ingredient</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Items ({ingredients.length})
          </button>
          {INGREDIENT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Ingredient Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4">Rate (₹ / Unit)</th>
                <th className="px-6 py-4">Current Stock</th>
                <th className="px-6 py-4">Stock Status</th>
                <th className="px-6 py-4">Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ing) => {
                const isLowStock = ing.currentStock <= ing.reorderLevel;
                const isEditingRate = editingRateId === ing.id;
                const isEditingStock = editingStockId === ing.id;

                return (
                  <tr key={ing.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{ing.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-md font-medium">
                        {ing.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-500">{ing.baseUnit}</td>

                    {/* Feature 2: Rate Edit */}
                    <td className="px-6 py-4">
                      {isEditingRate ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={tempRate}
                            onChange={(e) => setTempRate(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRate(ing.id)}
                            autoFocus
                            className="w-24 px-2 py-1 text-xs border border-orange-400 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <button
                            onClick={() => handleSaveRate(ing.id)}
                            className="bg-emerald-500 text-white p-1 rounded-md hover:bg-emerald-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingRateId(ing.id);
                            setTempRate(String(ing.currentRate));
                          }}
                          className="group flex items-center space-x-1 cursor-pointer font-bold text-slate-900 hover:text-orange-600"
                        >
                          <span>₹{ing.currentRate.toFixed(2)}</span>
                          <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>

                    {/* Feature 3: Stock Edit */}
                    <td className="px-6 py-4">
                      {isEditingStock ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={tempStock}
                            onChange={(e) => setTempStock(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveStock(ing.id)}
                            autoFocus
                            className="w-24 px-2 py-1 text-xs border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleSaveStock(ing.id)}
                            className="bg-blue-500 text-white p-1 rounded-md hover:bg-blue-600"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingStockId(ing.id);
                            setTempStock(String(ing.currentStock));
                          }}
                          className="group flex items-center space-x-1 cursor-pointer font-medium text-slate-800 hover:text-blue-600"
                        >
                          <span>
                            {ing.currentStock} {ing.baseUnit}
                          </span>
                          <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {isLowStock ? (
                        <span className="inline-flex items-center text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Low Stock ({ing.currentStock}/{ing.reorderLevel})
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          Sufficient
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{ing.supplier || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Ingredient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Add New Master Ingredient</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2">
                <label className="font-semibold text-slate-700">Ingredient Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cardamom Pods (Elaichi)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as IngredientCategory)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Base Unit</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value as BaseUnit)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  {BASE_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Current Rate (₹ / unit)</label>
                <input
                  type="number"
                  value={newRate}
                  onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Opening Stock</label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Reorder Alert Level</label>
                <input
                  type="number"
                  value={newReorder}
                  onChange={(e) => setNewReorder(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Supplier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Annapurna Traders"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newName) return;
                  const newIng: Ingredient = {
                    id: `ing_${Date.now()}`,
                    name: newName,
                    category: newCategory,
                    baseUnit: newUnit,
                    currentRate: newRate,
                    currentStock: newStock,
                    reorderLevel: newReorder,
                    supplier: newSupplier,
                    updatedAt: new Date().toISOString(),
                  };
                  await updateIngredientRate(newIng.id, newIng.currentRate);
                  setIsModalOpen(false);
                  setNewName('');
                }}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-orange-500/20"
              >
                Save Ingredient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
