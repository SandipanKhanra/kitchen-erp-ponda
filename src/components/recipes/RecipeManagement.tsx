import React, { useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { Plus, Trash2, Utensils, Users, Clock, DollarSign, Sparkles } from 'lucide-react';
import { Recipe, RecipeIngredient, MealType } from '../../types/recipe';
import { BaseUnit } from '../../types/ingredient';
import { MEAL_TYPES, BASE_UNITS } from '../../config/constants';
import { scaleRecipeForHeadcount } from '../../core/patternScaler';

export const RecipeManagement: React.FC = () => {
  const { recipes, ingredients, ingredientMap, getRecipeCost, saveRecipe, deleteRecipe } = useKitchen();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(recipes[0] || null);
  const [simulationHeadcount, setSimulationHeadcount] = useState<number>(100);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New Recipe State (Feature 5)
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MealType>('Lunch');
  const [baseYield, setBaseYield] = useState<number>(10);
  const [prepTime, setPrepTime] = useState<number>(15);
  const [cookTime, setCookTime] = useState<number>(30);
  const [description, setDescription] = useState('');
  const [newIngredients, setNewIngredients] = useState<RecipeIngredient[]>([]);

  const handleAddIngredientRow = () => {
    if (ingredients.length === 0) return;
    setNewIngredients((prev) => [
      ...prev,
      {
        ingredientId: ingredients[0].id,
        quantity: 1,
        unit: ingredients[0].baseUnit,
        wastagePercent: 0,
      },
    ]);
  };

  const handleSaveRecipe = async () => {
    if (!name || newIngredients.length === 0) {
      alert('Please provide a recipe name and at least one ingredient.');
      return;
    }

    const recipe: Recipe = {
      id: `rec_${Date.now()}`,
      name,
      category,
      baseYield,
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      description,
      ingredients: newIngredients,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveRecipe(recipe);
    setSelectedRecipe(recipe);
    setIsCreatingNew(false);
    setName('');
    setNewIngredients([]);
  };

  const activeCost = selectedRecipe ? getRecipeCost(selectedRecipe) : null;
  const scaledItems = selectedRecipe ? scaleRecipeForHeadcount(selectedRecipe, simulationHeadcount) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Recipe Formulas & Cost Patterns</h1>
          <p className="text-sm text-slate-500">
            Features 1, 5 & 8: Define recipe patterns, auto-calculate portions and live ingredient cost.
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreatingNew(true);
            setSelectedRecipe(null);
          }}
          className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-semibold shadow-md shadow-orange-500/20 text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Recipe</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Recipe List */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Recipes Catalog ({recipes.length})
          </h2>
          <div className="space-y-2">
            {recipes.map((rec) => {
              const cost = getRecipeCost(rec);
              const isSelected = selectedRecipe?.id === rec.id && !isCreatingNew;
              return (
                <div
                  key={rec.id}
                  onClick={() => {
                    setSelectedRecipe(rec);
                    setIsCreatingNew(false);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50/70 border-orange-400 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{rec.name}</h3>
                      <span className="inline-block mt-1 bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                        {rec.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-600">
                        ₹{cost.costPerPortion.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">per portion</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-xs text-slate-500 space-x-3">
                    <span className="flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Base Yield: {rec.baseYield}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {rec.prepTimeMinutes + rec.cookTimeMinutes} mins
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Recipe Details OR Create Form */}
        <div className="lg:col-span-8">
          {isCreatingNew ? (
            /* Feature 5: Add New Recipe Form */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Define New Recipe Pattern</h2>
                  <p className="text-xs text-slate-500">
                    Define the base yield pattern. The system will automatically scale items for any headcount.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="font-bold text-slate-700">Recipe Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shahi Paneer Butter Masala"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Meal Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MealType)}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  >
                    {MEAL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Base Yield (Portions)</label>
                  <input
                    type="number"
                    value={baseYield}
                    onChange={(e) => setBaseYield(parseInt(e.target.value) || 10)}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Prep Time (Mins)</label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(parseInt(e.target.value) || 15)}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Cook Time (Mins)</label>
                  <input
                    type="number"
                    value={cookTime}
                    onChange={(e) => setCookTime(parseInt(e.target.value) || 30)}
                    className="w-full mt-1 p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Dynamic Ingredients Rows */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-sm">Ingredients Formula (Base Pattern)</h3>
                  <button
                    onClick={handleAddIngredientRow}
                    className="flex items-center space-x-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newIngredients.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                      <select
                        value={item.ingredientId}
                        onChange={(e) => {
                          const updated = [...newIngredients];
                          const selected = ingredientMap.get(e.target.value);
                          updated[idx] = {
                            ...updated[idx],
                            ingredientId: e.target.value,
                            unit: selected ? selected.baseUnit : 'kg',
                          };
                          setNewIngredients(updated);
                        }}
                        className="flex-1 p-2 border border-slate-200 rounded-lg bg-white"
                      >
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} (₹{ing.currentRate}/{ing.baseUnit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.01"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...newIngredients];
                          updated[idx] = { ...updated[idx], quantity: parseFloat(e.target.value) || 0 };
                          setNewIngredients(updated);
                        }}
                        className="w-20 p-2 border border-slate-200 rounded-lg bg-white"
                      />

                      <select
                        value={item.unit}
                        onChange={(e) => {
                          const updated = [...newIngredients];
                          updated[idx] = { ...updated[idx], unit: e.target.value as BaseUnit };
                          setNewIngredients(updated);
                        }}
                        className="w-20 p-2 border border-slate-200 rounded-lg bg-white"
                      >
                        {BASE_UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => setNewIngredients(newIngredients.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecipe}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20"
                >
                  Save Recipe Formula
                </button>
              </div>
            </div>
          ) : selectedRecipe && activeCost ? (
            /* Selected Recipe Detail & Pattern Simulator */
            <div className="space-y-6">
              {/* Cost Summary Banner (Feature 1) */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 rounded-3xl text-white shadow-lg shadow-orange-500/10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-md">
                      {selectedRecipe.category}
                    </span>
                    <h2 className="text-2xl font-black mt-2">{selectedRecipe.name}</h2>
                    <p className="text-xs text-orange-100 mt-1">{selectedRecipe.description}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-right">
                    <span className="text-xs font-medium text-orange-100">Cost Per Portion</span>
                    <div className="text-3xl font-extrabold mt-0.5">₹{activeCost.costPerPortion.toFixed(2)}</div>
                    <span className="text-[10px] text-orange-200">
                      Total Base (Yield: {selectedRecipe.baseYield}): ₹{activeCost.totalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feature 8: Automatic Headcount Pattern Scaler Simulator */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Feature 8: Dynamic Pattern Scaler</h3>
                      <p className="text-xs text-slate-500">
                        Adjust headcount to see automated bulk ingredient and cost calculations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-600">Simulate Guests:</span>
                    <input
                      type="number"
                      value={simulationHeadcount}
                      onChange={(e) => setSimulationHeadcount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-2.5 py-1 text-sm font-bold border border-slate-300 rounded-lg text-center"
                    />
                  </div>
                </div>

                {/* Scaled Preview Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Target Headcount</span>
                    <div className="text-lg font-black text-slate-900">{simulationHeadcount} Pax</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Scale Factor</span>
                    <div className="text-lg font-black text-orange-600">
                      {(simulationHeadcount / selectedRecipe.baseYield).toFixed(1)}x
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Projected Total Cost</span>
                    <div className="text-lg font-black text-emerald-600">
                      ₹{(activeCost.costPerPortion * simulationHeadcount).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cost Per Guest</span>
                    <div className="text-lg font-black text-slate-900">
                      ₹{activeCost.costPerPortion.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ingredients Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm">Itemized Ingredient Formula & Live Market Cost</h3>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Ingredient</th>
                      <th className="px-6 py-3">Base Formula (10 Pax)</th>
                      <th className="px-6 py-3">Scaled Required ({simulationHeadcount} Pax)</th>
                      <th className="px-6 py-3">Unit Market Rate</th>
                      <th className="px-6 py-3">Line Cost (Scaled)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeCost.breakdown.map((item, idx) => {
                      const scaled = scaledItems[idx];
                      const scaleMultiplier = simulationHeadcount / selectedRecipe.baseYield;
                      const scaledLineCost = item.lineCost * scaleMultiplier;

                      return (
                        <tr key={item.ingredientId} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-bold text-slate-900">{item.ingredientName}</td>
                          <td className="px-6 py-3.5 text-slate-600">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-6 py-3.5 font-bold text-orange-600">
                            {scaled ? `${scaled.quantity} ${scaled.unit}` : '—'}
                          </td>
                          <td className="px-6 py-3.5 text-slate-500 font-mono">₹{item.unitRate.toFixed(2)}</td>
                          <td className="px-6 py-3.5 font-bold text-emerald-600">₹{scaledLineCost.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              Select a recipe on the left or create a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
