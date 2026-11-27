import React, { useMemo, useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateDDMMYYYY, sanitizeCsvCell } from '../../utils/formatters';
import {
  TrendingUp,
  Calendar,
  IndianRupee,
  Package,
  Users,
  Download,
  Filter,
  Sparkles,
} from 'lucide-react';

type DayRangeMode = 'month' | 'yesterday' | 'last7' | 'last15' | 'custom_date';

interface DailyCostRow {
  date: string;
  dayLabel: string;
  occasionName?: string;
  isEkadashi: boolean;
  headcount: number;
  menuCost: number;
  purchaseSpend: number;
  totalCost: number;
  topDishes: string[];
}

function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CenterCostAnalytics: React.FC = () => {
  const { requisitionSummary, stockItems, auditLogs, activeMenuPlan } = useKitchen();
  const { currentCenter, centerUsers } = useAuth();

  const currentYM = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Build list of selectable months from data + recent 6 months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    requisitionSummary.dailyRequirements.forEach((dr) => {
      if (dr.date && dr.date.length >= 7) set.add(dr.date.slice(0, 7));
    });
    auditLogs.forEach((log) => {
      if (log.timestamp && log.timestamp.length >= 7) set.add(log.timestamp.slice(0, 7));
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [requisitionSummary.dailyRequirements, auditLogs]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || currentYM
  );
  const [rangeMode, setRangeMode] = useState<DayRangeMode>('month');
  const [customDate, setCustomDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toISODate(d);
  });

  // Combine daily menu requirements + audit purchase logs by date
  const allDailyRows = useMemo(() => {
    const map = new Map<string, DailyCostRow>();

    requisitionSummary.dailyRequirements.forEach((dr) => {
      if (!dr.date) return;
      const topDishes = [...dr.recipes]
        .sort((a, b) => b.recipeTotalCost - a.recipeTotalCost)
        .slice(0, 3)
        .map((r) => r.recipeName);

      map.set(dr.date, {
        date: dr.date,
        dayLabel: `Day ${dr.dayNumber}`,
        occasionName: dr.occasionName,
        isEkadashi: dr.isEkadashi,
        headcount: dr.totalHeadcount,
        menuCost: dr.dayTotalCost,
        purchaseSpend: 0,
        totalCost: dr.dayTotalCost,
        topDishes,
      });
    });

    auditLogs.forEach((log) => {
      if (log.actionType !== 'STOCK_PURCHASE') return;
      const dateStr = log.timestamp.slice(0, 10);
      const spend = Number(log.details?.totalCost || 0);
      if (!dateStr || spend <= 0) return;

      const existing = map.get(dateStr);
      if (existing) {
        existing.purchaseSpend += spend;
        existing.totalCost = existing.menuCost + existing.purchaseSpend;
      } else {
        map.set(dateStr, {
          date: dateStr,
          dayLabel: 'Stock Purchase',
          isEkadashi: false,
          headcount: 0,
          menuCost: 0,
          purchaseSpend: spend,
          totalCost: spend,
          topDishes: [log.entityName],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [requisitionSummary.dailyRequirements, auditLogs]);

  // Monthly aggregates
  const monthRows = useMemo(
    () => allDailyRows.filter((r) => r.date.startsWith(selectedMonth)),
    [allDailyRows, selectedMonth]
  );

  // Filtered rows based on Previous Days / Month selection
  const filteredRows = useMemo(() => {
    const today = new Date();
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(today.getDate() - 1);
    const yesterdayISO = toISODate(yesterdayDate);

    if (rangeMode === 'yesterday') {
      return allDailyRows.filter((r) => r.date === yesterdayISO);
    }
    if (rangeMode === 'custom_date') {
      return allDailyRows.filter((r) => r.date === customDate);
    }
    if (rangeMode === 'last7' || rangeMode === 'last15') {
      const daysBack = rangeMode === 'last7' ? 7 : 15;
      const cutoff = new Date(today);
      cutoff.setDate(today.getDate() - daysBack);
      const cutoffISO = toISODate(cutoff);
      const todayISO = toISODate(today);
      return allDailyRows.filter((r) => r.date >= cutoffISO && r.date <= todayISO);
    }
    return monthRows;
  }, [allDailyRows, monthRows, rangeMode, customDate]);

  const chartRows = useMemo(
    () => [...filteredRows].sort((a, b) => a.date.localeCompare(b.date)),
    [filteredRows]
  );

  const maxDayCost = useMemo(
    () => Math.max(1, ...chartRows.map((r) => r.totalCost)),
    [chartRows]
  );

  const monthMenuCost = useMemo(
    () => monthRows.reduce((sum, r) => sum + r.menuCost, 0),
    [monthRows]
  );
  const monthPurchaseSpend = useMemo(
    () => monthRows.reduce((sum, r) => sum + r.purchaseSpend, 0),
    [monthRows]
  );
  const monthTotalCost = monthMenuCost + monthPurchaseSpend;
  const monthTotalHeadcount = useMemo(
    () => monthRows.reduce((sum, r) => sum + r.headcount, 0),
    [monthRows]
  );
  const avgDailyCost = monthRows.length > 0 ? monthTotalCost / monthRows.length : 0;
  const avgCostPerPlate = monthTotalHeadcount > 0 ? monthMenuCost / monthTotalHeadcount : 0;

  const totalStockAssetValue = useMemo(
    () => stockItems.reduce((sum, item) => sum + item.currentStock * item.price, 0),
    [stockItems]
  );

  // Category-wise stock asset breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    stockItems.forEach((item) => {
      const val = item.currentStock * item.price;
      map.set(item.category, (map.get(item.category) || 0) + val);
    });
    return Array.from(map.entries())
      .map(([category, value]) => ({
        category,
        value,
        percent: totalStockAssetValue > 0 ? (value / totalStockAssetValue) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [stockItems, totalStockAssetValue]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Day/Source', 'Occasion', 'Headcount', 'Menu Cost (INR)', 'Purchase Spend (INR)', 'Total Cost (INR)'];
    const lines = filteredRows.map((r) =>
      [
        sanitizeCsvCell(formatDateDDMMYYYY(r.date)),
        sanitizeCsvCell(r.dayLabel),
        sanitizeCsvCell(r.occasionName || (r.isEkadashi ? 'Ekadashi' : 'Normal')),
        r.headcount,
        r.menuCost.toFixed(2),
        r.purchaseSpend.toFixed(2),
        r.totalCost.toFixed(2),
      ].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentCenter.code || 'center'}_cost_analytics_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls Bar */}
      <div className="modern-card p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2 bg-slate-100/90 dark:bg-slate-800/90 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-orange-500" />
            <span className="font-bold text-slate-600 dark:text-slate-300">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setRangeMode('month');
              }}
              className="bg-transparent font-extrabold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {availableMonths.map((ym) => (
                <option key={ym} value={ym} className="dark:bg-slate-900">
                  {getMonthLabel(ym)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl">
            {(
              [
                { id: 'month', label: 'Full Month' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7', label: 'Last 7 Days' },
                { id: 'last15', label: 'Last 15 Days' },
                { id: 'custom_date', label: 'Pick Date' },
              ] as { id: DayRangeMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRangeMode(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                  rangeMode === opt.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {rangeMode === 'custom_date' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 modern-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Download className="w-3.5 h-3.5 text-emerald-500" />
          <span>Export Cost Report (CSV)</span>
        </button>
      </div>

      {/* Monthly KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="modern-card p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {getMonthLabel(selectedMonth)} Cost
            </span>
            <IndianRupee className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            ₹{monthTotalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Menu ₹{monthMenuCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })} + Purchases ₹
            {monthPurchaseSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-x border-slate-200/60 dark:border-slate-800/70 border-t-2 border-t-emerald-500/75 border-b-2 border-b-teal-500/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Daily Cost</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{avgDailyCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {monthRows.length} active days &bull; ₹{avgCostPerPlate.toFixed(1)}/plate
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-x border-slate-200/60 dark:border-slate-800/70 border-t-2 border-t-amber-500/75 border-b-2 border-b-rose-500/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Stock Asset Value</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
            ₹{totalStockAssetValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {stockItems.length} ingredients in {currentCenter.code}
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-x border-slate-200/60 dark:border-slate-800/70 border-t-2 border-t-indigo-500/75 border-b-2 border-b-purple-500/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Center Workforce</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {centerUsers.length} Devotees
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Plan: {activeMenuPlan.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Daily Cost Trend Bar Chart + Stock Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 modern-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>Daily Cost Trend</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Menu &amp; stock purchase costs across selected days
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {chartRows.length} day(s)
            </span>
          </div>

          {chartRows.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No cost records found for this date/month selection.
            </div>
          ) : (
            <div className="flex items-end gap-2 h-48 pt-4 overflow-x-auto pb-2">
              {chartRows.map((row) => {
                const heightPct = Math.max(8, Math.round((row.totalCost / maxDayCost) * 100));
                return (
                  <div
                    key={row.date}
                    className="flex-1 min-w-[32px] flex flex-col items-center justify-end h-full group"
                    title={`${formatDateDDMMYYYY(row.date)} (${row.dayLabel}): ₹${row.totalCost.toFixed(0)}`}
                  >
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      ₹{Math.round(row.totalCost).toLocaleString('en-IN')}
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full max-w-[34px] rounded-t-lg transition-all ${
                        row.isEkadashi
                          ? 'bg-gradient-to-t from-purple-600 to-fuchsia-400'
                          : 'bg-gradient-to-t from-orange-500 to-amber-400 group-hover:from-orange-600 group-hover:to-amber-500'
                      }`}
                    />
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 whitespace-nowrap">
                      {row.date.slice(8, 10)}/{row.date.slice(5, 7)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock Asset Breakdown by Category */}
        <div className="modern-card p-5 rounded-2xl space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Inventory Value by Category
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Current stock valuation distribution
            </p>
          </div>
          <div className="space-y-3">
            {categoryBreakdown.slice(0, 6).map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{cat.category}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{cat.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({cat.percent.toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                    style={{ width: `${Math.max(4, cat.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Previous Days & Monthly Cost Breakdown Table */}
      <div className="modern-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Daily &amp; Previous Days Cost Ledger
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Showing {filteredRows.length} record(s)
          </span>
        </div>

        {/* Mobile Stacked Cards (No Horizontal Scroll) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredRows.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-slate-400">
              No previous day cost entries found for the selected filter.
            </div>
          ) : (
            filteredRows.map((row) => (
              <div key={row.date} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatDateDDMMYYYY(row.date)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {row.dayLabel} {row.headcount > 0 ? `• ${row.headcount} plates` : ''}
                    </div>
                  </div>
                  {row.occasionName && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex-shrink-0">
                      {row.occasionName}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2 rounded-xl border-l-2 border-l-orange-500">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Menu</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      ₹{row.menuCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2 rounded-xl border-l-2 border-l-emerald-500">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Purchase</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{row.purchaseSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2 rounded-xl border-l-2 border-l-indigo-500">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Total</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      ₹{row.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {row.topDishes.length > 0 && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    <span className="font-semibold">Top:</span> {row.topDishes.join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-slate-50/90 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Day / Occasion</th>
                <th className="px-5 py-3.5">Headcount</th>
                <th className="px-5 py-3.5">Menu Cost</th>
                <th className="px-5 py-3.5">Purchase Spend</th>
                <th className="px-5 py-3.5">Total Day Cost</th>
                <th className="px-5 py-3.5">Top Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    No previous day cost entries found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatDateDDMMYYYY(row.date)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {row.dayLabel}
                      </span>
                      {row.occasionName && (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {row.occasionName}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-semibold">
                      {row.headcount > 0 ? `${row.headcount} plates` : '—'}
                    </td>
                    <td className="px-5 py-3 font-bold text-orange-600 dark:text-orange-400">
                      ₹{row.menuCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{row.purchaseSpend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 font-black text-slate-900 dark:text-white">
                      ₹{row.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                      {row.topDishes.join(', ') || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
