import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKitchen } from '../../context/KitchenContext';
import { Plus, Trash2, Layers, Utensils, Sparkles, Check, Edit3, Search } from 'lucide-react';
import { Recipe, MenuPattern, Occasion, MealType, RecipeType, MeasurableIndex } from '../../types/recipe';
import { MEAL_TYPES } from '../../config/constants';
import { Pagination } from '../common/Pagination';

export const RecipeAndPatternManagement: React.FC = () => {
  const { isAdmin, isSAdmin } = useAuth();
  const { recipes, patterns, stockItems, saveRecipe, deleteRecipe, savePattern, deletePattern } = useKitchen();

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
  const [measurableIndex, setMeasurableIndex] = useState<MeasurableIndex>('per person');
  const [baseYield, setBaseYield] = useState<number>(10);
  const [prepTime, setPrepTime] = useState<number>(15);
  const [cookTime, setCookTime] = useState<number>(30);
  const [description, setDescription] = useState('');
  const [ingredientsList, setIngredientsList] = useState<Array<{ ingredientId: string; quantity: number; unit: string }>>([]);

  // New Pattern Form state (Only Admin)
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [patternMealType, setPatternMealType] = useState<MealType>('Lunch');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [patternDesc, setPatternDesc] = useState('');

  const handleAddIngredientToRecipe = () => {
    if (stockItems.length === 0) return;
    setIngredientsList((prev) => [
      ...prev,
      {
        ingredientId: stockItems[0].id,
        quantity: 1,
        unit: stockItems[0].measureIndex,
      },
    ]);
  };

  const handleSaveRecipe = async () => {
    if (!recipeName || ingredientsList.length === 0) {
      alert('Please provide Recipe Name and at least one ingredient.');
      return;
    }

    const newRec: Recipe = {
      id: `rec_${Date.now()}`,
      centerId: 'center_ponda',
      name: recipeName,
      occasion,
      mealType,
      type: recipeType,
      measurableIndex,
      baseYield,
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      description,
      ingredients: ingredientsList,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveRecipe(newRec);
    setIsRecipeModalOpen(false);
    setRecipeName('');
    setIngredientsList([]);
  };

  const handleSavePattern = async () => {
    if (!patternName || selectedRecipeIds.length === 0) {
      alert('Please provide Pattern Name and select at least one recipe.');
      return;
    }

    const newPat: MenuPattern = {
      id: `pat_${Date.now()}`,
      centerId: 'center_ponda',
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

        {/* Tab switch & Add buttons */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'recipes'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Recipes ({recipes.length})
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'patterns'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Patterns ({patterns.length})
            </button>
          </div>

          {(isAdmin || isSAdmin) && (
            <button
              onClick={() => (activeTab === 'recipes' ? setIsRecipeModalOpen(true) : setIsPatternModalOpen(true))}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-orange-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeTab === 'recipes' ? 'Add Recipe' : 'Create Pattern (Admin)'}</span>
            </button>
          )}
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
                      <div className="flex items-center space-x-1.5">
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
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                          {rec.mealType}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1.5">{rec.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{rec.description}</p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex justify-between items-center text-xs text-slate-500">
                    <span>
                      Index: <strong className="text-slate-700 dark:text-slate-300">{rec.measurableIndex}</strong>
                    </span>
                    <span>{rec.ingredients.length} Ingredients</span>
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

              <div className="grid grid-cols-3 gap-2">
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

              {/* Dynamic Ingredients List */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Ingredients List</span>
                  <button
                    onClick={handleAddIngredientToRecipe}
                    className="text-orange-500 font-bold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                {ingredientsList.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      value={ing.ingredientId}
                      onChange={(e) => {
                        const copy = [...ingredientsList];
                        copy[idx].ingredientId = e.target.value;
                        setIngredientsList(copy);
                      }}
                      className="flex-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white text-xs"
                    >
                      {stockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      value={ing.quantity}
                      onChange={(e) => {
                        const copy = [...ingredientsList];
                        copy[idx].quantity = parseFloat(e.target.value) || 0;
                        setIngredientsList(copy);
                      }}
                      className="w-20 p-2 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-slate-900 dark:text-white text-xs"
                    />

                    <button
                      onClick={() => setIngredientsList(ingredientsList.filter((_, i) => i !== idx))}
                      className="text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecipe}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold"
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

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  onClick={() => setIsPatternModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePattern}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold"
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
