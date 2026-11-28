import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ChefHat, X, Sun, Moon } from 'lucide-react';
import { useKitchen } from '../../context/KitchenContext';
import { useToast } from '../../context/ToastContext';
import { useModalClose } from '../../hooks/useModalClose';

interface AuthViewProps {
  initialTab?: 'login' | 'signup';
  onClose?: () => void;
  isModal?: boolean;
  onTabChange?: (tab: 'login' | 'signup') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialTab = 'login',
  onClose,
  isModal = false,
  onTabChange,
}) => {
  const { theme, toggleTheme } = useKitchen();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);

  // Detect email verification redirect (?verified=1) and switch to Login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') {
      setActiveTab('login');
      onTabChange?.('login');
      showToast('Email verified! Your registration is complete. Please sign in.', 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleTabSwitch = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Sync tab whenever initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Close on Escape key or mobile Back button
  useModalClose(Boolean(isModal && onClose), () => onClose?.());

  const containerClasses = isModal
    ? 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto overscroll-contain'
    : 'w-full flex items-center justify-center py-6 sm:py-10 px-3 sm:px-4';

  const cardClasses =
    'relative w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border-x border-slate-200/70 dark:border-slate-800/70 border-t-2 border-t-orange-500/80 border-b-2 border-b-indigo-500/45 p-5 sm:p-7 transition-all my-auto';

  return (
    <div
      className={containerClasses}
      onClick={isModal ? onClose : undefined}
    >
      <div
        className={cardClasses}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Ambient Effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Actions (Theme Toggle & Close) */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle Dark / Light Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Header Branding */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xl shadow-orange-500/25 mb-2.5">
            <ChefHat className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="flex items-center justify-center">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Ponda Kitchen ERP
            </h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-5 border border-slate-200/50 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'login'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Devotee Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'signup'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            New Registration
          </button>
        </div>

        {/* Active Tab Form */}
        {activeTab === 'login' ? (
          <LoginForm
            onSwitchToSignup={() => handleTabSwitch('signup')}
            onSuccess={onClose}
          />
        ) : (
          <SignupForm
            onSwitchToLogin={() => handleTabSwitch('login')}
            onSuccess={onClose}
          />
        )}
      </div>
    </div>
  );
};
