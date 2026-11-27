import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKitchen } from '../../context/KitchenContext';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Layers, Utensils, Sparkles, Check, Edit3, Search, History, Building2 } from 'lucide-react';
import { Recipe, MenuPattern, Occasion, MealType, RecipeType, MeasurableIndex } from '../../types/recipe';
import { MEAL_TYPES } from '../../config/constants';
import { Pagination } from '../common/Pagination';
import { sanitizeNumericChange } from '../../utils/numberInput';

export const RecipeAndPatternManagement: React.FC = () => {
  const { currentCenter, isAdmin, isSAdmin } = useAuth();
  const { recipes, patterns, stockItems, saveRecipe, deleteRecipe, savePattern, deletePattern, addNewStockItem, openAuditModal } = useKitchen();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'recipes' | 'patterns'>('recipes');
  const [searchQuery, setSearchQuery] = useState('');
  const [recipePage, setRecipePage] = useState(1);
  const [recipePageSize, setRecipePageSize] = useState(6);
  const [patternPage, setPatternPage] = useState(1);
  const [patternPageSize, setPatternPageSize] = useState(6);

  // New Recipe Form state
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [occasion, setOccasion] = useState<Occasion>('Normal');
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [recipeType, setRecipeType] = useState<RecipeType>('Rice');
  const [isAshramSpecific, setIsAshramSpecific] = useState<boolean>(false);
  const [measurableIndex, setMeasurableIndex] = useState<MeasurableIndex>('per person');
  const [baseYield, setBaseYield] = useState<number>(10);
  const [prepTime, setPrepTime] = useState<number>(15);
  const [cookTime, setCookTime] = useState<number>(30);
  const [description, setDescription] = useState('');
  const [ingredientsList, setIngredientsList] = useState<Array<{ ingredientId: string; quantity: number; unit: string; customName?: string }>>([]);

  // New Pattern Form state (Only Admin)
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [patternMealType, setPatternMealType] = useState<MealType>('Lunch');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [patternDesc, setPatternDesc] = useState('');

  const handleAddIngredientToRecipe = () => {
    if (stockItems.length === 0) {
      setIngredientsList((prev) => [
        ...prev,
        {
          ingredientId: '__custom__',
          quantity: 1,
          unit: 'kg',
          customName: '',
        },
      ]);
      return;
    }
    const defaultStock = stockItems[0];
    setIngredientsList((prev) => [
      ...prev,
      {
        ingredientId: defaultStock.id,
        quantity: 1,
        unit: defaultStock.measureIndex || 'kg',
      },
    ]);
  };

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      showToast('Please provide a Recipe Name.', 'warning');
      return;
    }
    if (ingredientsList.length === 0) {
      showToast('Please click "+ Add Item" to add at least one ingredient.', 'warning');
      return;
    }
    for (const ing of ingredientsList) {
      if (ing.ingredientId === '__custom__' && !ing.customName?.trim()) {
        showToast('Please enter a name for every custom ingredient.', 'warning');
        return;
      }
    }

    try {
      const resolvedIngredients: Array<{ ingredientId: string; quantity: number; unit: string }> = [];
      for (const ing of ingredientsList) {
        if (ing.ingredientId === '__custom__') {
          const cleanName = (ing.customName || '').trim();
          const existing = stockItems.find(
            (s) => s.name.toLowerCase() === cleanName.toLowerCase()
          );
          if (existing) {
            resolvedIngredients.push({
              ingredientId: existing.id,
              quantity: ing.quantity,
              unit: ing.unit,
            });
          } else {
            const measureIndex =
              ing.unit === 'litre' || ing.unit === 'ml'
                ? 'litre'
                : ing.unit === 'piece'
                ? 'piece'
                : 'kg';
            const created = await addNewStockItem({
              name: cleanName,
              brand: 'Generic',
              category: 'Grocery',
              measureIndex,
              price: 0,
              currentStock: 0,
              reorderLevel: 10,
            });
            resolvedIngredients.push({
              ingredientId: created.id,
              quantity: ing.quantity,
              unit: ing.unit,
            });
          }
        } else {
          resolvedIngredients.push({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            unit: ing.unit,
          });
        }
      }

      const newRec: Recipe = {
        id: `rec_${Date.now()}`,
        centerId: currentCenter.id,
        name: recipeName.trim(),
        occasion,
        mealType,
        type: recipeType,
        measurableIndex,
        baseYield,
        prepTimeMinutes: prepTime,
        cookTimeMinutes: cookTime,
        description,
        isAshramSpecific: isAshramSpecific || recipeType === 'Ashram',
        ingredients: resolvedIngredients,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveRecipe(newRec);
      showToast(`Recipe "${newRec.name}" saved!`, 'success');
      setIsRecipeModalOpen(false);
      setRecipeName('');
      setDescription('');
      setIsAshramSpecific(false);
      setIngredientsList([]);
    } catch (err: any) {
      showToast(err?.message || 'Failed to save recipe. Please try again.', 'error');
    }
  };

  const handleSavePattern = async () => {
    if (!patternName || selectedRecipeIds.length === 0) {
      showToast('Please provide Pattern Name and select at least one recipe.', 'warning');
      return;
    }

    const newPat: MenuPattern = {
      id: `pat_${Date.now()}`,
      centerId: currentCenter.id,
      name: patternName,
      mealType: patternMealType,
      recipeIds: selectedRecipeIds,
      description: patternDesc,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePattern(newPat);
    setIsPatternModalOpen(false);
    setPatternName('');
    setSelectedRecipeIds([]);
  };

  const filteredRecipes = recipes.filter(
    (r) =>
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.occasion.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedRecipes = filteredRecipes.slice(
    (recipePage - 1) * recipePageSize,
    recipePage * recipePageSize
  );

  const filteredPatterns = patterns.filter(
    (p) =>
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.mealType.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedPatterns = filteredPatterns.slice(
    (patternPage - 1) * patternPageSize,
    patternPage * patternPageSize
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Recipes & Menu Patterns
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build Vaishnava recipes with strict occasion tagging (Normal, Ekadashi, Fasting) and create customizable meal patterns.
          </p>
        </div>

        {/* Tab switch, Audit History & Add buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'recipes'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Recipes ({recipes.length})
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'patterns'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Patterns ({patterns.length})
            </button>
          </div>

          <button
            onClick={() => openAuditModal('recipe')}
            className="flex items-center space-x-1.5 modern-btn-secondary text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-100/90 dark:hover:bg-slate-800/90 shadow-sm"
            title="View recipe audit trail"
          >
            <History className="w-3.5 h-3.5 text-purple-500" />
            <span>Audit History</span>
          </button>

          <button
            onClick={() => (activeTab === 'recipes' ? setIsRecipeModalOpen(true) : setIsPatternModalOpen(true))}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold modern-btn-primary shadow-orange-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === 'recipes' ? 'Add Recipe' : 'Create Pattern'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setRecipePage(1);
              setPatternPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      {/* View 1: Recipes */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedRecipes.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No recipes found matching your search.
              </div>
            ) : (
              paginatedRecipes.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            rec.occasion === 'Ekadashi'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : rec.occasion === 'Fasting'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {rec.occasion}
                        </span>
                        {(rec.type === 'Ashram' || rec.isAshramSpecific) && (
                          <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                            🕉️ Ashram
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                          {rec.type}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                          {rec.mealType}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1.5">{rec.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{rec.description}</p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>
                        Base Yield: <strong className="text-slate-700 dark:text-slate-300">{rec.baseYield} {rec.measurableIndex}</strong>
                      </span>
                      <span>{rec.ingredients.length} Ingredients</span>
                    </div>
                    {rec.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {rec.ingredients.slice(0, 4).map((ing, i) => {
                          const stockItem = stockItems.find((s) => s.id === ing.ingredientId);
                          return (
                            <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium">
                              {ing.quantity} {ing.unit} {stockItem?.name || 'Item'}
                            </span>
                          );
                        })}
                        {rec.ingredients.length > 4 && (
                          <span className="text-[10px] text-slate-400">+{rec.ingredients.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            currentPage={recipePage}
            totalItems={filteredRecipes.length}
            pageSize={recipePageSize}
            onPageChange={setRecipePage}
            onPageSizeChange={(size) => {
              setRecipePageSize(size);
              setRecipePage(1);
            }}
            pageSizeOptions={[6, 12, 18]}
          />
        </div>
      )}

      {/* View 2: Patterns (Only Admin) */}
      {activeTab === 'patterns' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paginatedPatterns.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No patterns found matching your search.
              </div>
            ) : (
              paginatedPatterns.map((pat) => (
                <div
                  key={pat.id}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded">
                        {pat.mealType} Pattern
                      </span>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1">
                        {pat.name}
                      </h3>
                    </div>
                    {(isAdmin || isSAdmin) && (
                      <button
                        onClick={() => deletePattern(pat.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">{pat.description}</p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Contains Recipes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {pat.recipeIds.map((rId) => {
                        const r = recipes.find((item) => item.id === rId);
                        return (
                          <span
                            key={rId}
                            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs px-2 py-1 rounded-lg font-medium"
                          >
                            {r?.name || 'Recipe'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            currentPage={patternPage}
            totalItems={filteredPatterns.length}
            pageSize={patternPageSize}
            onPageChange={setPatternPage}
            onPageSizeChange={(size) => {
              setPatternPageSize(size);
              setPatternPage(1);
            }}
            pageSizeOptions={[4, 6, 12]}
          />
        </div>
      )}

      {/* Modal: Add New Recipe */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Add New Recipe</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Recipe Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sabudana Kheer (Ekadashi)"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Occasion</label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value as Occasion)}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Ekadashi">Ekadashi</option>
                    <option value="Fasting">Fasting</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as MealType)}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Ashram Breakfast">Ashram Breakfast</option>
                    <option value="Ashram Lunch">Ashram Lunch</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Dish Type</label>
                  <select
                    value={recipeType}
                    onChange={(e) => {
                      const val = e.target.value as RecipeType;
                      setRecipeType(val);
                      if (val === 'Ashram') setIsAshramSpecific(true);
                    }}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  >
                    <option value="Ashram">🕉️ Ashram Special</option>
                    <option value="Rice">Rice</option>
                    <option value="Dal">Dal</option>
                    <option value="Curry">Curry</option>
                    <option value="Bread">Bread / Roti</option>
                    <option value="Snack">Snack</option>
                    <option value="Sweet">Sweet</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Salad">Salad</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Measure Index</label>
                  <select
                    value={measurableIndex}
                    onChange={(e) => setMeasurableIndex(e.target.value as MeasurableIndex)}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                  >
                    <option value="per person">per person</option>
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                  </select>
                </div>
              </div>

              {/* Dedicated Ashram Recipe Toggle */}
              <label className="flex items-center space-x-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAshramSpecific || recipeType === 'Ashram'}
                  onChange={(e) => setIsAshramSpecific(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                  🕉️ Dedicated for Brahmacari Ashram (Weekly Rotation)
                </span>
              </label>

              {/* Dynamic Ingredients List */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Ingredients List</span>
                  <button
                    type="button"
                    onClick={handleAddIngredientToRecipe}
                    className="px-3 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 font-bold transition"
                  >
                    + Add Item
                  </button>
                </div>

                {ingredientsList.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic py-1">
                    Click "+ Add Item" to add ingredients to this recipe.
                  </p>
                )}

                {ingredientsList.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    {ing.ingredientId === '__custom__' ? (
                      <div className="flex-1 min-w-[130px] flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Ingredient name (e.g. Basmati Rice)"
                          value={ing.customName || ''}
                          onChange={(e) => {
                            const copy = [...ingredientsList];
                            copy[idx].customName = e.target.value;
                            setIngredientsList(copy);
                          }}
                          className="w-full p-2 border border-orange-300 dark:border-orange-700 rounded-xl dark:bg-slate-900 dark:text-white text-xs"
                        />
                        {stockItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const copy = [...ingredientsList];
                              copy[idx].ingredientId = stockItems[0].id;
                              copy[idx].customName = undefined;
                              setIngredientsList(copy);
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:text-orange-500 px-1.5"
                            title="Switch to existing stock item"
                          >
                            List
                          </button>
                        )}
                      </div>
                    ) : (
                      <select
                        value={ing.ingredientId}
                        onChange={(e) => {
                          const copy = [...ingredientsList];
                          if (e.target.value === '__custom__') {
                            copy[idx].ingredientId = '__custom__';
                            copy[idx].customName = '';
                          } else {
                            const chosen = stockItems.find((s) => s.id === e.target.value);
                            copy[idx].ingredientId = e.target.value;
                            if (chosen && !copy[idx].unit) {
                              copy[idx].unit = chosen.measureIndex || 'kg';
                            }
                          }
                          setIngredientsList(copy);
                        }}
                        className="flex-1 min-w-[130px] p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white text-xs"
                      >
                        {stockItems.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.category})
                          </option>
                        ))}
                        <option value="__custom__">+ Type New Ingredient...</option>
                      </select>
                    )}

                    <input
                      type="number"
                      step={ing.unit === 'piece' ? '1' : 'any'}
                      min="0"
                      placeholder="0"
                      value={ing.quantity === 0 ? '' : ing.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const isPiece = ing.unit === 'piece';
                        const { numValue } = sanitizeNumericChange(e, !isPiece);
                        const copy = [...ingredientsList];
                        copy[idx].quantity = isPiece ? Math.round(numValue) : numValue;
                        setIngredientsList(copy);
                      }}
                      className="w-20 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white text-xs font-semibold"
                    />

                    {/* Choose measuring index individually whether kg, litre, g, ml, piece, etc. */}
                    <select
                      value={ing.unit || 'kg'}
                      onChange={(e) => {
                        const copy = [...ingredientsList];
                        const chosenUnit = e.target.value;
                        copy[idx].unit = chosenUnit;
                        if (chosenUnit === 'piece' && copy[idx].quantity) {
                          copy[idx].quantity = Math.round(copy[idx].quantity);
                        }
                        setIngredientsList(copy);
                      }}
                      className="w-24 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white text-xs font-bold cursor-pointer"
                      title="Measuring index for this ingredient (kg, litre, etc.)"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="litre">litre</option>
                      <option value="ml">ml</option>
                      <option value="piece">piece</option>
                      <option value="cup">cup</option>
                      <option value="tbsp">tbsp</option>
                      <option value="tsp">tsp</option>
                    </select>

                    <button
                      onClick={() => setIngredientsList(ingredientsList.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Remove ingredient"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3">
                <button
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecipe}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition"
                >
                  Save Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Pattern (Admin Only) */}
      {isPatternModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Create Menu Pattern</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Pattern Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pattern 1 - Jeera rice, dal, mix-veg, sweet rice"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Meal Slot</label>
                <select
                  value={patternMealType}
                  onChange={(e) => setPatternMealType(e.target.value as MealType)}
                  className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 dark:text-white"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Recipes</label>
                <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1">
                  {recipes.map((r) => (
                    <label key={r.id} className="flex items-center space-x-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRecipeIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRecipeIds([...selectedRecipeIds, r.id]);
                          else setSelectedRecipeIds(selectedRecipeIds.filter((id) => id !== r.id));
                        }}
                      />
                      <span className="text-slate-800 dark:text-white">{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3">
                <button
                  onClick={() => setIsPatternModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePattern}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition"
                >
                  Save Pattern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
