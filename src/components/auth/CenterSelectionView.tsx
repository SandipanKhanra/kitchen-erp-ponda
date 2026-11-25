import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKitchen } from '../../context/KitchenContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Building2, CheckCircle2, MapPin, LogOut, Sun, Moon, Search, ArrowRight } from 'lucide-react';

export const CenterSelectionView: React.FC = () => {
  const { currentUser, availableCenters, completeCenterSelection, logout } = useAuth();
  const { theme, toggleTheme } = useKitchen();
  const { showToast } = useToast();

  const [selectedCenterId, setSelectedCenterId] = useState<string>(
    availableCenters[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCenters = availableCenters.filter(
    (c) =>
      !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const chosen = availableCenters.find((c) => c.id === selectedCenterId);
    if (!chosen) {
      setError('Please select a kitchen center to continue.');
      return;
    }

    setSubmitting(true);
    try {
      await completeCenterSelection(chosen.id, chosen.name);
      showToast(`Welcome to ${chosen.name}!`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to save your center selection. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-6 sm:py-10 px-3 sm:px-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 transition-all">
        {/* Glow Ambient Effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Actions */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle Dark / Light Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-14 h-14 rounded-2xl mx-auto mb-3 border-2 border-orange-400 shadow-lg object-cover"
            />
          ) : (
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xl shadow-orange-500/25 mb-3">
              <Building2 className="w-7 h-7" />
            </div>
          )}

          <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            Hare Krishna, {currentUser.name}
          </p>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Choose Your Kitchen Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Select the ISKCON center you serve in to personalize your stock, recipes, and 15-day menu planner.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-4">
          {availableCenters.length > 4 && (
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search center by name or city..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
              />
            </div>
          )}

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {filteredCenters.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No active centers match your search.
              </div>
            ) : (
              filteredCenters.map((center) => {
                const isSelected = selectedCenterId === center.id;
                return (
                  <button
                    key={center.id}
                    type="button"
                    onClick={() => setSelectedCenterId(center.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-orange-50/90 dark:bg-orange-950/40 border-orange-500 shadow-sm ring-2 ring-orange-500/20'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {center.code}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {center.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                        <span>
                          {center.city}, {center.state}, {center.country}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                        isSelected
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedCenterId}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="xs" />
                <span>Setting up your workspace...</span>
              </>
            ) : (
              <>
                <span>Confirm Center &amp; Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
