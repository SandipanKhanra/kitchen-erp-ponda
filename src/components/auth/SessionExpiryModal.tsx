import React, { useState } from 'react';
import { Clock, RefreshCw, LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModalClose } from '../../hooks/useModalClose';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const SessionExpiryModal: React.FC = () => {
  const {
    showSessionWarning,
    sessionMinutesLeft,
    extendSession,
    dismissSessionWarning,
    logout,
  } = useAuth();
  const [extending, setExtending] = useState(false);

  useModalClose(showSessionWarning, dismissSessionWarning);

  if (!showSessionWarning) return null;

  const handleExtend = async () => {
    setExtending(true);
    try {
      await extendSession();
    } finally {
      setExtending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={dismissSessionWarning}
    >
      <div
        className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border-x border-slate-200/80 dark:border-slate-800/80 border-t-2 border-t-amber-500 border-b-2 border-b-orange-500/60 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismissSessionWarning}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Dismiss session warning"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Session Expiring Soon
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {sessionMinutesLeft ?? 5} min left in your session
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          For your security, your session will automatically sign out when the timer reaches zero. Would you like to extend your session by another <strong>30 minutes</strong>?
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={logout}
            className="modern-btn-secondary text-rose-600 dark:text-rose-400"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <button
            type="button"
            onClick={handleExtend}
            disabled={extending}
            className="modern-btn-primary bg-gradient-to-b from-orange-500 to-orange-600 text-white disabled:opacity-60"
          >
            {extending ? <LoadingSpinner size="xs" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{extending ? 'Extending...' : 'Extend Session (+30 min)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
