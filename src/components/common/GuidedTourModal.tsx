import React, { useMemo, useState } from 'react';
import {
  ChefHat,
  Flame,
  Layers,
  ShoppingBag,
  Package,
  Calendar,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { NavTab } from '../layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useModalClose } from '../../hooks/useModalClose';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onTourTabChange?: (tab: NavTab | null) => void;
}

interface TourStep {
  id: string;
  badge: string;
  title: string;
  description: string;
  tips: string[];
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  tab?: NavTab;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onTourTabChange,
}) => {
  const { currentUser, currentCenter, isAdmin, isSAdmin } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);

  useModalClose(isOpen, onClose);

  const steps: TourStep[] = useMemo(() => {
    const base: TourStep[] = [
      {
        id: 'welcome',
        badge: 'Welcome',
        title: `Hare Krishna, ${currentUser.name || 'Devotee'}!`,
        description: `Welcome to ${currentCenter?.name || 'Ponda Kitchen ERP'}. This quick 1-minute tour walks you through planning Prasadam menus, managing recipes, tracking stock, and viewing Vaishnava fasting dates.`,
        tips: [
          'Everything is scoped to your assigned Kitchen Center.',
          'You can replay this tour anytime using the "?" button in the top bar.',
        ],
        icon: ChefHat,
        accentClass: 'from-orange-500 to-amber-500',
        tab: 'menu_planner',
      },
      {
        id: 'menu_planner',
        badge: 'Step 1 • Planning',
        title: '15-Day Menu Planner',
        description:
          'Pick any Start Date to automatically calculate a 2-week cycle and auto-fill menus, including Ekadashi fasting rules and Brahmacari Ashram meals.',
        tips: [
          'Click "+ Add Dish" or "Auto-Rotate Ashram" to customize any meal.',
          'Click "Update" when ready to save changes and record them in the Audit Trail.',
        ],
        icon: Flame,
        accentClass: 'from-orange-500 to-rose-500',
        tab: 'menu_planner',
      },
      {
        id: 'recipes_patterns',
        badge: 'Step 2 • Recipes',
        title: 'Recipes & Meal Patterns',
        description:
          'Create and edit Vaishnava recipes with Base Yield in per person, piece, litre, or kg—even before stock is added—and bundle dishes into reusable Meal Patterns.',
        tips: [
          'Tag recipes as Normal, Ekadashi, or Fasting for automatic calendar compliance.',
          'Custom ingredients automatically create 0-stock items so shopping lists stay accurate.',
        ],
        icon: Layers,
        accentClass: 'from-amber-500 to-orange-500',
        tab: 'recipes_patterns',
      },
      {
        id: 'daywise_shopping',
        badge: 'Step 3 • Procurement',
        title: 'Day-wise & Shopping List',
        description:
          'Automatically calculates exact daily ingredient requirements, per-plate costs, and net quantities to buy after deducting your current stock.',
        tips: [
          'Switch between "Shopping List" and "Daily Usage & Costs" anytime.',
          'Export a clean Purchase Order (CSV) with one click.',
        ],
        icon: ShoppingBag,
        accentClass: 'from-emerald-500 to-teal-500',
        tab: 'daywise_shopping',
      },
      {
        id: 'stock',
        badge: 'Step 4 • Inventory',
        title: 'Stock & Price Adjuster',
        description:
          'Monitor inventory value, spot Low / Out-of-Stock items, inline-adjust physical counts, and record new purchases with automatic Moving Weighted Average pricing.',
        tips: [
          'Click "Purchase" on any item row to pre-fill and preview the new average price live.',
          'Click the Low Stock or Missing Price KPI cards at the top to filter immediately.',
        ],
        icon: Package,
        accentClass: 'from-teal-500 to-cyan-500',
        tab: 'stock',
      },
      {
        id: 'vaishnava_calendar',
        badge: 'Step 5 • Calendar',
        title: 'Vaishnava Calendar',
        description:
          'View Ekadashi dates, Parana break-fast windows, and Vaishnava Acharya appearance/disappearance days powered by the GCAL engine.',
        tips: [
          'Ekadashi days automatically enforce Ekadashi-only Prasadam in the Menu Planner.',
        ],
        icon: Calendar,
        accentClass: 'from-purple-500 to-indigo-500',
        tab: 'vaishnava_calendar',
      },
    ];

    if (isAdmin && !isSAdmin) {
      base.push({
        id: 'admin',
        badge: 'Admin Tools',
        title: 'Center Cost Analytics & Devotees',
        description:
          'Inspect monthly and previous-day kitchen costs, export cost ledgers, manage devotee Admin roles in your center, or request new centers.',
        tips: [
          'Use the "Yesterday", "Last 7 Days", or "Pick Date" filters to audit past costs.',
        ],
        icon: UserCheck,
        accentClass: 'from-indigo-500 to-purple-500',
        tab: 'admin_users',
      });
    } else if (isSAdmin) {
      base.push({
        id: 'sadmin',
        badge: 'Super Admin HQ',
        title: 'Center-Wise Analytics & Governance',
        description:
          'Compare 15-day menu costs and stock valuations across all ISKCON centers, approve new center requests, and manage cross-center Admins.',
        tips: [
          'Use the Center switcher in the top bar to inspect any center directly.',
        ],
        icon: ShieldCheck,
        accentClass: 'from-purple-600 to-indigo-600',
        tab: 'sadmin_dashboard',
      });
    }

    return base;
  }, [currentUser.name, currentCenter?.name, isAdmin, isSAdmin]);

  if (!isOpen) return null;

  const currentStep = steps[stepIndex] || steps[0];
  const Icon = currentStep.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const goToStep = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, nextIdx));
    setStepIndex(clamped);
    const targetTab = steps[clamped]?.tab || null;
    if (targetTab) {
      onNavigateTab(targetTab);
    }
    onTourTabChange?.(targetTab);
  };

  const handleClose = () => {
    onTourTabChange?.(null);
    onClose();
  };

  const handleFinish = () => {
    setStepIndex(0);
    onTourTabChange?.(null);
    onNavigateTab('menu_planner');
    onClose();
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[400px] z-50 animate-fade-in pointer-events-auto">
      <div className="relative w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.28)] border-x border-slate-200/90 dark:border-slate-700/90 border-t-2 border-t-orange-500 border-b-2 border-b-indigo-500/60 p-5 space-y-3.5">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close guided tour"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3 pr-6">
          <div
            className={`p-2.5 rounded-2xl bg-gradient-to-tr ${currentStep.accentClass} text-white shadow-lg flex-shrink-0`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <span className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
              <Sparkles className="w-3 h-3" />
              <span>{currentStep.badge}</span>
            </span>
            <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {currentStep.title}
            </h2>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Key Tips */}
        <div className="bg-slate-50/90 dark:bg-slate-800/70 rounded-2xl p-3 border-l-4 border-l-orange-500 space-y-1.5">
          {currentStep.tips.map((tip, i) => (
            <div key={i} className="flex items-start space-x-2 text-[11px] text-slate-700 dark:text-slate-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center space-x-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === stepIndex
                    ? 'w-5 bg-orange-500'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-orange-300'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Step {stepIndex + 1} of {steps.length}
          </span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1.5"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => goToStep(stepIndex - 1)}
                className="modern-btn-secondary"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={handleFinish}
                className="modern-btn-primary bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-600/80 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Get Started</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                className="modern-btn-primary bg-gradient-to-b from-orange-500 to-orange-600 text-white"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
