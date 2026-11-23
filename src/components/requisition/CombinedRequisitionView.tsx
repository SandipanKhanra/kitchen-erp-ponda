import React, { useState, useMemo } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { ShoppingBag, Download, Calendar, DollarSign, PackageCheck, AlertCircle } from 'lucide-react';
import { formatDateISO } from '../../core/rotationEngine';

export const CombinedRequisitionView: React.FC = () => {
  const { generateRequisition } = useKitchen();

  // Default to upcoming 15-day window
  const [startDateStr, setStartDateStr] = useState<string>(formatDateISO(new Date()));
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatDateISO(d);
  });

  const requisition = useMemo(() => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return null;
    }
    return generateRequisition(start, end);
  }, [startDateStr, endDateStr, generateRequisition]);

  const handleExportCSV = () => {
    if (!requisition) return;

    const headers = ['Category,Ingredient,Total Needed,Current Stock,Net To Purchase,Unit,Rate (INR),Estimated Cost (INR)'];
    const rows = requisition.items.map((item) =>
      `"${item.category}","${item.name}",${item.totalNeeded},${item.currentStock},${item.toPurchase},"${item.baseUnit}",${item.unitRate},${item.estimatedCost}`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `procurement_requisition_${requisition.startDate}_to_${requisition.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Period Requisition Sheet</h1>
          <p className="text-sm text-slate-500">
            Feature 7: Combines grocery requirements for the entire period, deducts current stock, and projects net purchase cost.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={!requisition || requisition.items.length === 0}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-emerald-600/20 text-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Requisition (CSV)</span>
        </button>
      </div>

      {/* Date Range Selector Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">From Date:</span>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">To Date:</span>
            <input
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-semibold"
            />
          </div>
        </div>

        {requisition && (
          <div className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200">
            Period Span: {requisition.totalDays} Days of Meals
          </div>
        )}
      </div>

      {requisition && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Net Purchase Cost</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                ₹{requisition.totalEstimatedCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <span className="text-xs text-slate-500">After subtracting on-hand stock</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Distinct Items Demanded</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {requisition.items.length} Ingredients
              </div>
              <span className="text-xs text-slate-500">Normalized across recipes</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Items Requiring Procurement</span>
              <div className="text-2xl font-black text-orange-600 mt-1">
                {requisition.items.filter((i) => i.toPurchase > 0).length} Items to Buy
              </div>
              <span className="text-xs text-slate-500">
                {requisition.items.filter((i) => i.toPurchase === 0).length} already in stock
              </span>
            </div>
          </div>

          {/* Aggregated Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Ingredient Name</th>
                    <th className="px-6 py-4">Total Period Demand</th>
                    <th className="px-6 py-4">Current Stock</th>
                    <th className="px-6 py-4">Net To Purchase</th>
                    <th className="px-6 py-4">Unit Rate</th>
                    <th className="px-6 py-4">Estimated Purchase Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {requisition.items.map((item) => (
                    <tr key={item.ingredientId} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 text-slate-500 font-medium">{item.category}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-900">{item.name}</td>
                      <td className="px-6 py-3.5 text-slate-700">
                        {item.totalNeeded} {item.baseUnit}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {item.currentStock} {item.baseUnit}
                      </td>
                      <td className="px-6 py-3.5">
                        {item.toPurchase > 0 ? (
                          <span className="font-extrabold text-orange-600">
                            {item.toPurchase} {item.baseUnit}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Covered in Stock</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-slate-500">₹{item.unitRate.toFixed(2)}</td>
                      <td className="px-6 py-3.5 font-black text-slate-900">
                        {item.estimatedCost > 0 ? `₹${item.estimatedCost.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
