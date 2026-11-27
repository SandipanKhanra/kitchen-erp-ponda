import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 5000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (durationMs > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }
    },
    [dismissToast]
  );

  const contextValue = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toaster Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2.5 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
        {toasts.map((toast) => {
          const styles =
            toast.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/95 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 shadow-rose-500/15'
              : toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 shadow-emerald-500/15'
              : toast.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/95 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 shadow-amber-500/15'
              : 'bg-slate-50 dark:bg-slate-900/95 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-slate-500/15';

          const Icon =
            toast.type === 'error'
              ? AlertCircle
              : toast.type === 'success'
              ? CheckCircle2
              : toast.type === 'warning'
              ? AlertTriangle
              : Info;

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start space-x-2.5 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md text-xs font-semibold transition-all animate-fade-in ${styles}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="p-0.5 rounded-lg opacity-70 hover:opacity-100 transition"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
