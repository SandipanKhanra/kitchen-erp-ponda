import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CenterStatus } from '../../types/center';
import { kitchenDbService } from '../../services/kitchenDbService';
import { calculateDayWiseAndShoppingRequirements } from '../../core/daywiseRequirementCalculator';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { sanitizeCsvCell } from '../../utils/formatters';
import {
  Building2,
  Users,
  IndianRupee,
  Package,
  RefreshCw,
  Download,
  BarChart3,
} from 'lucide-react';

interface CenterReportRow {
  centerId: string;
  centerName: string;
  centerCode: string;
  city: string;
  status: CenterStatus;
  devoteeCount: number;
  adminCount: number;
  recipeCount: number;
  stockItemCount: number;
  stockAssetValue: number;
  menuCost15Days: number;
  netToProcure: number;
  avgDailyCost: number;
  menuStatus: string;
  monthlyPurchaseSpend: number;
}

function getPlanStatusBadgeClass(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    case 'pending_approval':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
    default:
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
  }
}

export const SAdminCenterAnalytics: React.FC = () => {
  const { allCenters, allUsers } = useAuth();
  const [reports, setReports] = useState<CenterReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYM = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYM);

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return opts;
  }, []);

  const loadCenterReports = async () => {
    if (allCenters.length === 0) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await Promise.all(
        allCenters.map(async (center) => {
          const [stock, recipes, menuPlan, auditLogs] = await Promise.all([
            kitchenDbService.fetchCenterStock(center.id),
            kitchenDbService.fetchCenterRecipes(center.id),
            kitchenDbService.fetchCenterMenuPlan(center.id),
            kitchenDbService.fetchCenterAuditLogs(center.id, 100),
          ]);

          const stockMap = new Map(stock.map((s) => [s.id, s]));
          const recipeMap = new Map(recipes.map((r) => [r.id, r]));
          const reqSummary = calculateDayWiseAndShoppingRequirements(
            menuPlan,
            recipeMap,
            stockMap
          );

          const stockAssetValue = stock.reduce(
            (sum, item) => sum + item.currentStock * item.price,
            0
          );

          const centerUsers = allUsers.filter((u) => u.centerId === center.id);
          const adminCount = centerUsers.filter((u) => u.role === 'admin').length;

          const monthlyPurchaseSpend = auditLogs
            .filter(
              (l) =>
                l.actionType === 'STOCK_PURCHASE' &&
                l.timestamp.startsWith(selectedMonth)
            )
            .reduce((sum, l) => sum + Number(l.details?.totalCost || 0), 0);

          const activeDays = reqSummary.dailyRequirements.length || 15;

          return {
            centerId: center.id,
            centerName: center.name,
            centerCode: center.code,
            city: `${center.city}, ${center.state}`,
            status: center.status,
            devoteeCount: centerUsers.length,
            adminCount,
            recipeCount: recipes.length,
            stockItemCount: stock.length,
            stockAssetValue,
            menuCost15Days: reqSummary.totalMenuCost,
            netToProcure: reqSummary.totalNetProcurementCost,
            avgDailyCost: reqSummary.totalMenuCost / activeDays,
            menuStatus: menuPlan.status,
            monthlyPurchaseSpend,
          };
        })
      );
      setReports(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCenterReports();
  }, [allCenters, allUsers, selectedMonth]);

  const totals = useMemo(() => {
    return reports.reduce(
      (acc, r) => ({
        menuCost: acc.menuCost + r.menuCost15Days,
        netProcure: acc.netProcure + r.netToProcure,
        stockValue: acc.stockValue + r.stockAssetValue,
        purchases: acc.purchases + r.monthlyPurchaseSpend,
      }),
      { menuCost: 0, netProcure: 0, stockValue: 0, purchases: 0 }
    );
  }, [reports]);

  const maxCenterCost = useMemo(
    () => Math.max(1, ...reports.map((r) => Math.max(r.menuCost15Days, r.stockAssetValue))),
    [reports]
  );

  const handleExportCSV = () => {
    const headers = [
      'Center Name',
      'Code',
      'City',
      'Status',
      'Devotees',
      'Admins',
      'Recipes',
      'Stock Items',
      'Stock Asset Value (INR)',
      '15-Day Menu Cost (INR)',
      'Net To Procure (INR)',
      'Avg Daily Cost (INR)',
      `Purchases ${selectedMonth} (INR)`,
      'Menu Status',
    ];
    const lines = reports.map((r) =>
      [
        sanitizeCsvCell(r.centerName),
        sanitizeCsvCell(r.centerCode),
        sanitizeCsvCell(r.city),
        sanitizeCsvCell(r.status),
        r.devoteeCount,
        r.adminCount,
        r.recipeCount,
        r.stockItemCount,
        r.stockAssetValue.toFixed(2),
        r.menuCost15Days.toFixed(2),
        r.netToProcure.toFixed(2),
        r.avgDailyCost.toFixed(2),
        r.monthlyPurchaseSpend.toFixed(2),
        sanitizeCsvCell(r.menuStatus),
      ].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iskcon_sadmin_center_wise_report_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="modern-card p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-2 bg-slate-100/90 dark:bg-slate-800/90 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-600 dark:text-slate-300">Purchase Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-extrabold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {monthOptions.map((ym) => (
                <option key={ym} value={ym} className="dark:bg-slate-900">
                  {ym}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={loadCenterReports}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Report</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={reports.length === 0}
          className="flex items-center space-x-1.5 modern-btn-secondary px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-emerald-500" />
          <span>Export Center-Wise Report (CSV)</span>
        </button>
      </div>

      {/* Global Network KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="modern-card p-4 sm:p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Network Centers</span>
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {allCenters.length} Centers
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {allCenters.filter((c) => c.status === 'active').length} Active
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-x border-slate-200/60 dark:border-slate-800/70 border-t-2 border-t-orange-500/75 border-b-2 border-b-amber-500/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Combined 15-Day Cost</span>
            <IndianRupee className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
            ₹{totals.menuCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Net Procure: ₹{totals.netProcure.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-x border-slate-200/60 dark:border-slate-800/70 border-t-2 border-t-emerald-500/75 border-b-2 border-b-teal-500/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Network Stock Value</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totals.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Purchases ({selectedMonth}): ₹{totals.purchases.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border-x border-slate-200/60 dark:border-slate-800/70 border-t-2 border-t-indigo-500/75 border-b-2 border-b-purple-500/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Devotees</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {allUsers.length} Users
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {allUsers.filter((u) => u.role === 'admin').length} Center Admins
          </span>
        </div>
      </div>

      {loading ? (
        <div className="modern-card p-12 rounded-2xl flex flex-col items-center justify-center space-y-3">
          <LoadingSpinner size="md" className="text-purple-500" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Aggregating center-wise kitchen analytics...
          </span>
        </div>
      ) : (
        <>
          {/* Center-Wise Visual Comparison */}
          <div className="modern-card p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span>Center-Wise Menu Cost vs Stock Valuation</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Visual comparison across all registered ISKCON centers
                </p>
              </div>
              <div className="flex items-center space-x-3 text-[10px] font-bold">
                <span className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block" />
                  <span>15-Day Menu Cost</span>
                </span>
                <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span>Stock Asset Value</span>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.centerId} className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {r.centerName}{' '}
                      <span className="text-[10px] font-mono text-slate-400">({r.centerCode})</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Menu: ₹{r.menuCost15Days.toLocaleString('en-IN', { maximumFractionDigits: 0 })} &bull; Stock: ₹
                      {r.stockAssetValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                        style={{
                          width: `${Math.max(2, (r.menuCost15Days / maxCenterCost) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        style={{
                          width: `${Math.max(2, (r.stockAssetValue / maxCenterCost) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Center-Wise Report Table */}
          <div className="modern-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Center-Wise Operational &amp; Financial Report
              </h3>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {reports.length} center(s)
              </span>
            </div>

            {/* Mobile & Small Screen Stacked Cards (No Horizontal Scroll) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {reports.map((r) => (
                <div key={r.centerId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {r.centerName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {r.centerCode} &bull; {r.city}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          r.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {r.status}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getPlanStatusBadgeClass(
                          r.menuStatus
                        )}`}
                      >
                        {r.menuStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2.5 rounded-xl border-l-2 border-l-orange-500">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">15-Day Cost</span>
                      <span className="font-black text-orange-600 dark:text-orange-400">
                        ₹{r.menuCost15Days.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2.5 rounded-xl border-l-2 border-l-emerald-500">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Stock Value</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        ₹{r.stockAssetValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2.5 rounded-xl border-l-2 border-l-indigo-500">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Procure</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        ₹{r.netToProcure.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="bg-slate-50/90 dark:bg-slate-800/60 p-2.5 rounded-xl border-l-2 border-l-amber-500">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Avg / Day</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        ₹{r.avgDailyCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>
                      Workforce: <strong className="text-slate-700 dark:text-slate-200">{r.devoteeCount}</strong> ({r.adminCount} Admin)
                    </span>
                    <span>
                      Recipes: <strong className="text-slate-700 dark:text-slate-200">{r.recipeCount}</strong> &bull; Stock: <strong className="text-slate-700 dark:text-slate-200">{r.stockItemCount}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[820px]">
                <thead className="bg-slate-50/90 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Center</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Workforce</th>
                    <th className="px-5 py-3.5">Recipes / Stock</th>
                    <th className="px-5 py-3.5">Stock Value</th>
                    <th className="px-5 py-3.5">15-Day Cost</th>
                    <th className="px-5 py-3.5">Net Procure</th>
                    <th className="px-5 py-3.5">Avg / Day</th>
                    <th className="px-5 py-3.5">Plan Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reports.map((r) => (
                    <tr key={r.centerId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{r.centerName}</div>
                        <div className="text-[10px] text-slate-400">
                          {r.centerCode} &bull; {r.city}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            r.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-semibold">
                        {r.devoteeCount} ({r.adminCount} Admin)
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                        {r.recipeCount} / {r.stockItemCount}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{r.stockAssetValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-orange-600 dark:text-orange-400">
                        ₹{r.menuCost15Days.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        ₹{r.netToProcure.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        ₹{r.avgDailyCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${getPlanStatusBadgeClass(
                            r.menuStatus
                          )}`}
                        >
                          {r.menuStatus.replace('_', ' ')}
                        </span>
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
