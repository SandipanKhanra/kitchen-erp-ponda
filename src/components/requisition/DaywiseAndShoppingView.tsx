import React, { useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { Download, ShoppingBag, Calendar, DollarSign, PackageCheck, Layers, Search } from 'lucide-react';
import { Pagination } from '../common/Pagination';

export const DaywiseAndShoppingView: React.FC = () => {
  const { requisitionSummary } = useKitchen();
  const [subView, setSubView] = useState<'shopping' | 'daywise'>('shopping');
  const [searchQuery, setSearchQuery] = useState('');
  const [shoppingPage, setShoppingPage] = useState(1);
  const [shoppingPageSize, setShoppingPageSize] = useState(10);
  const [dayPage, setDayPage] = useState(1);
  const [dayPageSize, setDayPageSize] = useState(5);

  const handleExportCSV = () => {
    const headers = ['Category,Item Name,Brand,Total Needed,Current Stock,Net To Purchase,Measure,Unit Price (INR),Estimated Cost (INR)'];
    const rows = requisitionSummary.shoppingList.map((item) =>
      `"${item.category}","${item.name}","${item.brand}",${item.totalPeriodDemand},${item.currentStock},${item.netToPurchase},"${item.measureIndex}",${item.currentPrice},${item.estimatedPurchaseCost}`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `iskcon_kitchen_requisition_${requisitionSummary.startDate}_to_${requisitionSummary.endDate}.csv`);
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
            Calculates exact ingredient usage for each day across Breakfast, Lunch, and Dinner, deducts current stock, and generates a procurement shopping sheet.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => {
                setSubView('shopping');
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all ${
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
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subView === 'daywise'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daily Usage ({requisitionSummary.dailyRequirements.length} Days)
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
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
          <span className="text-[11px] text-slate-500">Gross 15-day value</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Net To Procure</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{requisitionSummary.totalNetProcurementCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500">After deducting stock</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Items To Purchase</span>
          <div className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
            {requisitionSummary.shoppingList.filter((i) => i.netToPurchase > 0).length} of{' '}
            {requisitionSummary.shoppingList.length}
          </div>
          <span className="text-[11px] text-slate-500">In Shopping Sheet</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Operational Span</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            15 Days
          </div>
          <span className="text-[11px] text-slate-500">{requisitionSummary.startDate} to {requisitionSummary.endDate}</span>
        </div>
      </div>

      {/* SubView 1: Shopping Requisition Sheet (Stock Deducted) */}
      {subView === 'shopping' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-500">
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
            <div className="overflow-x-auto">
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
                        <td className="px-6 py-3.5 text-slate-500">
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
                        <td className="px-6 py-3.5 font-mono text-slate-500">₹{item.currentPrice.toFixed(2)}</td>
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

      {/* SubView 2: Day-by-Day Itemized Usage */}
      {subView === 'daywise' && (
        <div className="space-y-4">
          {paginatedDays.map((day) => (
            <div
              key={day.dayNumber}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-700 pb-3 gap-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 text-xs font-black px-2 py-0.5 rounded">
                    DAY {day.dayNumber}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{day.date}</span>
                  {day.isEkadashi && (
                    <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-300">
                      ✨ {day.occasionName || 'Ekadashi'}
                    </span>
                  )}
                </div>
                <div className="sm:text-right">
                  <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    Day Total: ₹{day.dayTotalCost.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400">{day.totalHeadcount} Total Meals Served</span>
                </div>
              </div>

              {/* Ingredients consumed on this day */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {day.ingredients.map((ing) => (
                  <div
                    key={ing.ingredientId}
                    className="bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white truncate max-w-[120px]">{ing.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {ing.requiredQty} {ing.measureIndex}
                      </div>
                    </div>
                    <span className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">₹{ing.cost.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

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
