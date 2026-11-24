import React, { useState, useMemo } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { useAuth } from '../../context/AuthContext';
import { AuditCategory, AuditActionType } from '../../types/audit';
import {
  History,
  X,
  Search,
  RefreshCw,
  Package,
  Layers,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Pagination } from '../common/Pagination';

interface AuditHistoryModalProps {
  initialCategory?: AuditCategory;
  onClose: () => void;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  initialCategory,
  onClose,
}) => {
  const { currentCenter } = useAuth();
  const { auditLogs, refreshAuditLogs } = useKitchen();

  const [activeCategory, setActiveCategory] = useState<AuditCategory | 'all'>(
    initialCategory || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuditLogs();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Filter logs by category and search
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      // Category filter
      if (activeCategory !== 'all' && log.category !== activeCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = log.performedByName.toLowerCase().includes(query);
        const matchesEntity = log.entityName.toLowerCase().includes(query);
        const matchesSummary = log.details.summary.toLowerCase().includes(query);
        const matchesNotes = log.details.notes?.toLowerCase().includes(query) || false;
        return matchesName || matchesEntity || matchesSummary || matchesNotes;
      }

      return true;
    });
  }, [auditLogs, activeCategory, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Counts by category
  const counts = useMemo(() => {
    const stockCount = auditLogs.filter((l) => l.category === 'stock').length;
    const menuCount = auditLogs.filter((l) => l.category === 'menu_planner').length;
    const recipeCount = auditLogs.filter((l) => l.category === 'recipe').length;
    return {
      all: auditLogs.length,
      stock: stockCount,
      menu_planner: menuCount,
      recipe: recipeCount,
    };
  }, [auditLogs]);

  const getActionBadge = (actionType: AuditActionType) => {
    switch (actionType) {
      case 'STOCK_ADD':
        return {
          label: 'Stock Added',
          classes: 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          icon: Package,
        };
      case 'STOCK_PURCHASE':
        return {
          label: 'Purchase Received',
          classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: RefreshCw,
        };
      case 'STOCK_COUNT_UPDATE':
      case 'STOCK_PRICE_UPDATE':
        return {
          label: 'Stock Adjusted',
          classes: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
          icon: Package,
        };
      case 'RECIPE_CREATE':
        return {
          label: 'Recipe Created',
          classes: 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: Layers,
        };
      case 'RECIPE_UPDATE':
        return {
          label: 'Recipe Updated',
          classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          icon: Layers,
        };
      case 'RECIPE_DELETE':
        return {
          label: 'Recipe Deleted',
          classes: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          icon: AlertTriangle,
        };
      case 'MENU_PLAN_SAVE':
        return {
          label: 'Menu Plan Modified',
          classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          icon: Flame,
        };
      case 'MENU_PLAN_APPROVE':
        return {
          label: 'Maker-Checker Approved',
          classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-extrabold',
          icon: CheckCircle2,
        };
      case 'MENU_PLAN_REJECT':
        return {
          label: 'Plan Rejected',
          classes: 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-extrabold',
          icon: AlertTriangle,
        };
      default:
        return {
          label: actionType,
          classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          icon: History,
        };
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto overscroll-contain animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 space-y-5 my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Audit Trail & Activity Log
                </h2>
                <span className="flex items-center space-x-1 px-2.5 py-0.5 bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold rounded-lg border border-orange-200 dark:border-orange-800">
                  <Building2 className="w-3 h-3" />
                  <span>{currentCenter.name}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Center-specific revision history for stock adjustments, weighted average purchases, recipe additions, and Maker-Checker menu approvals.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold">
            <button
              onClick={() => {
                setActiveCategory('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeCategory === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => {
                setActiveCategory('stock');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 ${
                activeCategory === 'stock'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Stock ({counts.stock})</span>
            </button>
            <button
              onClick={() => {
                setActiveCategory('menu_planner');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 ${
                activeCategory === 'menu_planner'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Menu Planner ({counts.menu_planner})</span>
            </button>
            <button
              onClick={() => {
                setActiveCategory('recipe');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 ${
                activeCategory === 'recipe'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Recipes ({counts.recipe})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search devotee or item..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Audit Log Timeline Entries */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {paginatedLogs.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
              <History className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                No Audit History Found
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No entries match your search query.'
                  : 'Activity for stock additions, weighted price updates, recipes, and menu approvals will automatically appear here.'}
              </p>
            </div>
          ) : (
            paginatedLogs.map((log) => {
              const badge = getActionBadge(log.actionType);
              const BadgeIcon = badge.icon;

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-shadow space-y-2.5"
                >
                  {/* Top Metadata Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center space-x-2.5">
                      {/* Avatar initial */}
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                        {log.performedByName ? log.performedByName.charAt(0).toUpperCase() : 'D'}
                      </div>
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {log.performedByName}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                            log.performedByRole === 'sadmin'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : log.performedByRole === 'admin'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {log.performedByRole}
                        </span>
                        <span className="text-slate-400">&bull;</span>
                        <span
                          className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${badge.classes}`}
                        >
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 dark:text-slate-500 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                  </div>

                  {/* Description / Summary */}
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium pl-9">
                    {log.details.summary}
                  </p>

                  {/* Notes / Financial or Stock Metrics if available */}
                  {(log.details.notes || log.details.totalCost || log.details.quantity) && (
                    <div className="ml-9 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                      {log.details.totalCost && (
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">Total Purchase Cost:</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            ₹{log.details.totalCost.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {log.details.notes && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 italic">
                          &ldquo;{log.details.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {filteredLogs.length > pageSize && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredLogs.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 8, 15, 25]}
            />
          </div>
        )}
      </div>
    </div>
  );
};
