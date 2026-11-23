import React, { useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { Download, ShoppingBag, Calendar, DollarSign, PackageCheck, Layers } from 'lucide-react';

export const DaywiseAndShoppingView: React.FC = () => {
  const { requisitionSummary } = useKitchen();
  const [subView, setSubView] = useState<'shopping' | 'daywise'>('shopping');

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Day-Wise Demand & Consolidated Shopping Requisition
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calculates exact ingredient usage for each day across Breakfast, Lunch, and Dinner, deducts current stock, and generates a procurement shopping sheet.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSubView('shopping')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subView === 'shopping'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Consolidated Shopping List ({requisitionSummary.shoppingList.length})
            </button>
            <button
              onClick={() => setSubView('daywise')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                subView === 'daywise'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Day-by-Day Itemized Usage
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Period Menu Cost</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            ₹{requisitionSummary.totalMenuCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-xs text-slate-500">Gross 15-day value</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Net To Procure / Purchase</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{requisitionSummary.totalNetProcurementCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-xs text-slate-500">After deducting on-hand stock</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Items Requiring Purchase</span>
          <div className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
            {requisitionSummary.shoppingList.filter((i) => i.netToPurchase > 0).length} of{' '}
            {requisitionSummary.shoppingList.length} Items
          </div>
          <span className="text-xs text-slate-500">Remainder covered in inventory</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Operational Span</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            15 Days
          </div>
          <span className="text-xs text-slate-500">{requisitionSummary.startDate} to {requisitionSummary.endDate}</span>
        </div>
      </div>

      {/* SubView 1: Shopping Requisition Sheet (Stock Deducted) */}
      {subView === 'shopping' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                {requisitionSummary.shoppingList.map((item) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubView 2: Day-by-Day Itemized Usage */}
      {subView === 'daywise' && (
        <div className="space-y-4">
          {requisitionSummary.dailyRequirements.map((day) => (
            <div
              key={day.dayNumber}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
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
                <div className="text-right">
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
        </div>
      )}
    </div>
  );
};
