import React, { useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import {
  Download,
  ShoppingBag,
  Calendar,
  DollarSign,
  PackageCheck,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  Utensils,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Pagination } from '../common/Pagination';

export const DaywiseAndShoppingView: React.FC = () => {
  const { requisitionSummary } = useKitchen();
  const [subView, setSubView] = useState<'shopping' | 'daywise'>('shopping');
  const [searchQuery, setSearchQuery] = useState('');
  const [shoppingPage, setShoppingPage] = useState(1);
  const [shoppingPageSize, setShoppingPageSize] = useState(10);
  const [dayPage, setDayPage] = useState(1);
  const [dayPageSize, setDayPageSize] = useState(5);

  // Expanded individual item cost breakdown per recipe
  const [expandedRecipeIds, setExpandedRecipeIds] = useState<Record<string, boolean>>({});
  // Per-day view mode: 'recipes' (per-recipe cost breakdown) or 'items' (consolidated all items cost)
  const [dayViewMode, setDayViewMode] = useState<Record<number, 'recipes' | 'items'>>({});

  const toggleRecipeExpand = (key: string) => {
    setExpandedRecipeIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setDayMode = (dayNum: number, mode: 'recipes' | 'items') => {
    setDayViewMode((prev) => ({
      ...prev,
      [dayNum]: mode,
    }));
  };

  /**
   * Export the procurement / purchase order sheet for the market or vendors.
   * As requested: strictly excludes total need, current stock, unit price, and estimated cost.
   * Only includes essential purchase procurement columns: S.No., Category, Item Name, Brand, Quantity to Purchase, Unit.
   */
  const handleExportCSV = () => {
    const headers = ['S.No.,Category,Item Name,Brand,Quantity to Purchase,Unit'];
    const itemsToPurchase = requisitionSummary.shoppingList.filter((item) => item.netToPurchase > 0);
    const exportList = itemsToPurchase.length > 0 ? itemsToPurchase : requisitionSummary.shoppingList;

    const rows = exportList.map((item, idx) =>
      `"${idx + 1}","${item.category}","${item.name}","${item.brand || '-'}",${item.netToPurchase},"${item.measureIndex}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ponda_kitchen_purchase_order_${requisitionSummary.startDate}_to_${requisitionSummary.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredShopping = requisitionSummary.shoppingList.filter(
    (item) =>
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedShopping = filteredShopping.slice(
    (shoppingPage - 1) * shoppingPageSize,
    shoppingPage * shoppingPageSize
  );

  const paginatedDays = requisitionSummary.dailyRequirements.slice(
    (dayPage - 1) * dayPageSize,
    dayPage * dayPageSize
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Day-Wise Demand & Consolidated Shopping Requisition
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calculates exact ingredient usage and costs across Breakfast, Lunch, and Dinner with per-recipe and item-level cost breakdowns, and generates clean purchase procurement sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => {
                setSubView('shopping');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                subView === 'shopping'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Shopping List ({requisitionSummary.shoppingList.length})
            </button>
            <button
              onClick={() => {
                setSubView('daywise');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                subView === 'daywise'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Usage & Costs ({requisitionSummary.dailyRequirements.length} Days)
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
            title="Download purchase order list without internal stocks and prices"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Purchase Order (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Menu Cost</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            ₹{requisitionSummary.totalMenuCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Gross 15-day value</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Net To Procure</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{requisitionSummary.totalNetProcurementCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">After deducting stock</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Items To Purchase</span>
          <div className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
            {requisitionSummary.shoppingList.filter((i) => i.netToPurchase > 0).length} of{' '}
            {requisitionSummary.shoppingList.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">In Shopping Sheet</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Operational Span</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            15 Days
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {requisitionSummary.startDate} to {requisitionSummary.endDate}
          </span>
        </div>
      </div>

      {/* SubView 1: Shopping Requisition Sheet (Stock Deducted) */}
      {subView === 'shopping' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredShopping.length} items
            </span>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search shopping list..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShoppingPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto pb-1">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Total Period Demand</th>
                    <th className="px-6 py-4">Current Stock</th>
                    <th className="px-6 py-4">Net To Purchase</th>
                    <th className="px-6 py-4">Unit Rate</th>
                    <th className="px-6 py-4">Estimated Purchase Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {paginatedShopping.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                        No shopping items found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedShopping.map((item) => (
                      <tr key={item.ingredientId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="px-6 py-3.5">
                          <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">{item.name}</td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">{item.brand}</td>
                        <td className="px-6 py-3.5 text-slate-700 dark:text-slate-300 font-medium">
                          {item.totalPeriodDemand} {item.measureIndex}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400 font-medium">
                          {item.currentStock} {item.measureIndex}
                        </td>
                        <td className="px-6 py-3.5">
                          {item.netToPurchase > 0 ? (
                            <span className="font-extrabold text-orange-600 dark:text-orange-400">
                              {item.netToPurchase} {item.measureIndex}
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">Covered in Stock</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-500 dark:text-slate-400">₹{item.currentPrice.toFixed(2)}</td>
                        <td className="px-6 py-3.5 font-extrabold text-slate-900 dark:text-white">
                          {item.estimatedPurchaseCost > 0 ? `₹${item.estimatedPurchaseCost.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            currentPage={shoppingPage}
            totalItems={filteredShopping.length}
            pageSize={shoppingPageSize}
            onPageChange={setShoppingPage}
            onPageSizeChange={(size) => {
              setShoppingPageSize(size);
              setShoppingPage(1);
            }}
            pageSizeOptions={[5, 10, 20]}
          />
        </div>
      )}

      {/* SubView 2: Day-by-Day Itemized Usage & Cost Breakdown */}
      {subView === 'daywise' && (
        <div className="space-y-5">
          {paginatedDays.map((day) => {
            const currentMode = dayViewMode[day.dayNumber] || 'recipes';

            return (
              <div
                key={day.dayNumber}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 sm:p-6 shadow-sm space-y-4"
              >
                {/* Day Header with Cost Summary and View Switcher */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-700/80 pb-4 gap-3">
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 text-xs font-black px-2.5 py-1 rounded-md">
                        DAY {day.dayNumber}
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">
                        {day.date}
                      </span>
                      {day.isEkadashi && (
                        <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-300">
                          ✨ {day.occasionName || 'Ekadashi Fasting'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                      <span>{day.totalHeadcount} Total Meals Served</span>
                      <span>&bull;</span>
                      <span>Avg ₹{(day.costPerPerson || 0).toFixed(2)} / meal portion</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                    {/* View Switcher: Per-Recipe Cost vs Consolidated All Items Cost */}
                    <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-bold">
                      <button
                        onClick={() => setDayMode(day.dayNumber, 'recipes')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          currentMode === 'recipes'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Per-Recipe Cost ({day.recipes?.length || 0})
                      </button>
                      <button
                        onClick={() => setDayMode(day.dayNumber, 'items')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          currentMode === 'items'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        All Items Cost ({day.ingredients.length})
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Day Cost</div>
                      <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                        ₹{day.dayTotalCost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mode 1: Per-Recipe Cost with Option to Expand Individual Item Costs */}
                {currentMode === 'recipes' && (
                  <div className="space-y-3">
                    {(!day.recipes || day.recipes.length === 0) ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No recipes assigned for Day {day.dayNumber}. Use the 15-Day Menu Planner to assign dishes.
                      </div>
                    ) : (
                      day.recipes.map((rec, rIdx) => {
                        const recipeKey = `d${day.dayNumber}_r${rIdx}_${rec.recipeId}`;
                        const isExpanded = !!expandedRecipeIds[recipeKey];

                        return (
                          <div
                            key={recipeKey}
                            className="bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-4 space-y-3 transition"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                    rec.mealType === 'Breakfast'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                      : rec.mealType === 'Lunch'
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                  }`}
                                >
                                  {rec.mealType}
                                </span>
                                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                                  {rec.recipeName}
                                </h4>
                                <span className="text-[11px] text-slate-400 font-semibold">
                                  ({rec.headcount} Pax)
                                </span>
                              </div>

                              <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-right">
                                  <span className="text-xs font-black text-slate-900 dark:text-white">
                                    ₹{rec.recipeTotalCost.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block font-medium">
                                    ₹{rec.costPerPerson.toFixed(2)} / plate
                                  </span>
                                </div>

                                {/* Option to see individual item cost */}
                                <button
                                  onClick={() => toggleRecipeExpand(recipeKey)}
                                  className="flex items-center space-x-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition shadow-sm"
                                  title="View individual ingredients and cost breakdown for this recipe"
                                >
                                  <span>{isExpanded ? 'Hide Item Costs' : `View Item Costs (${rec.items.length})`}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Individual Item Cost Breakdown (Expanded View) */}
                            {isExpanded && (
                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 animate-fade-in">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                                  Itemized Ingredient Costs for {rec.recipeName} ({rec.headcount} Pax):
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100/70 dark:bg-slate-800/60">
                                      <tr>
                                        <th className="px-3 py-1.5 rounded-l-lg">Ingredient</th>
                                        <th className="px-3 py-1.5">Category</th>
                                        <th className="px-3 py-1.5">Quantity Used</th>
                                        <th className="px-3 py-1.5">Unit Rate (₹)</th>
                                        <th className="px-3 py-1.5 text-right rounded-r-lg">Total Cost (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {rec.items.map((ing) => (
                                        <tr key={ing.ingredientId} className="hover:bg-white/60 dark:hover:bg-slate-800/40">
                                          <td className="px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200">
                                            {ing.name}
                                          </td>
                                          <td className="px-3 py-1.5 text-[10px] text-slate-400">
                                            {ing.category}
                                          </td>
                                          <td className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-300">
                                            {ing.requiredQty} {ing.measureIndex}
                                          </td>
                                          <td className="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                                            ₹{ing.unitPrice.toFixed(2)} / {ing.measureIndex}
                                          </td>
                                          <td className="px-3 py-1.5 font-bold text-slate-900 dark:text-white text-right">
                                            ₹{ing.cost.toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Mode 2: Consolidated All Items Cost for the Day */}
                {currentMode === 'items' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100/70 dark:bg-slate-800/60">
                        <tr>
                          <th className="px-3 py-2 rounded-l-lg">Ingredient</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Total Day Quantity</th>
                          <th className="px-3 py-2">Unit Rate (₹)</th>
                          <th className="px-3 py-2 text-right rounded-r-lg">Day Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {day.ingredients.map((ing) => (
                          <tr key={ing.ingredientId} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                            <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">
                              {ing.name}
                            </td>
                            <td className="px-3 py-2 text-[10px] text-slate-400">
                              {ing.category}
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                              {ing.requiredQty} {ing.measureIndex}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                              ₹{ing.unitPrice.toFixed(2)} / {ing.measureIndex}
                            </td>
                            <td className="px-3 py-2 font-extrabold text-emerald-600 dark:text-emerald-400 text-right">
                              ₹{ing.cost.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          <Pagination
            currentPage={dayPage}
            totalItems={requisitionSummary.dailyRequirements.length}
            pageSize={dayPageSize}
            onPageChange={setDayPage}
            onPageSizeChange={(size) => {
              setDayPageSize(size);
              setDayPage(1);
            }}
            pageSizeOptions={[3, 5, 15]}
          />
        </div>
      )}
    </div>
  );
};
