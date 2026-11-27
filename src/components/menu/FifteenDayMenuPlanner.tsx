import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKitchen } from '../../context/KitchenContext';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  Calendar as CalendarIcon,
  Sparkles,
  Info,
  Clock,
  History,
  Plus,
  Trash2,
  X,
  Copy,
  Layers,
  Utensils,
  Search,
  RotateCcw,
  ChevronDown,
  Save,
  MessageCircle,
} from 'lucide-react';
import { MealType, Recipe, MenuPattern, Occasion } from '../../types/recipe';
import { FifteenDayMenuPlan } from '../../types/menu';
import { sanitizeNumericChange } from '../../utils/numberInput';
import { generateAshramWeeklyRotation, generateFull15DayMenuFromStartDate, formatDateISO } from '../../core/rotationEngine';
import { resolveCenterLocation } from '../../core/gaurabdaCalendarEngine';
import { formatDateDDMMYYYY } from '../../utils/formatters';
import { useModalClose } from '../../hooks/useModalClose';

export type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'brahmacariBreakfast' | 'brahmacariLunch';

const getMealSlotTitle = (key: MealSlotKey | null) => {
  if (!key) return '';
  switch (key) {
    case 'breakfast':
      return 'General Breakfast';
    case 'brahmacariBreakfast':
      return 'Brahmacari Ashram Breakfast';
    case 'lunch':
      return 'General Lunch';
    case 'brahmacariLunch':
      return 'Brahmacari Ashram Lunch';
    case 'dinner':
      return 'Dinner';
  }
};

export const FifteenDayMenuPlanner: React.FC = () => {
  const { currentUser, currentCenter, isAdmin, isSAdmin, allUsers } = useAuth();
  const { showToast } = useToast();
  const {
    activeMenuPlan,
    saveMenuPlan,
    approveMenuPlan,
    rejectMenuPlan,
    canApproveActiveMenu,
    repetitionCheck,
    openAuditModal,
    recipes,
    recipeMap,
    patterns,
  } = useKitchen();

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Day Editing State
  const [addDishModalMeal, setAddDishModalMeal] = useState<MealSlotKey | null>(null);
  useModalClose(Boolean(addDishModalMeal), () => setAddDishModalMeal(null));
  const [dishModalTab, setDishModalTab] = useState<'recipes' | 'patterns'>('recipes');
  const [dishSearch, setDishSearch] = useState('');
  const [dishOccasionFilter, setDishOccasionFilter] = useState<'all' | 'Ashram' | Occasion>('all');
  const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);

  const activeDay = activeMenuPlan.days[selectedDay] || {
    dayNumber: selectedDay,
    date: formatDateISO(new Date()),
    isEkadashi: false,
    breakfast: { recipeIds: [], headcount: 100 },
    brahmacariBreakfast: { recipeIds: [], headcount: 20 },
    lunch: { recipeIds: [], headcount: 150 },
    brahmacariLunch: { recipeIds: [], headcount: 20 },
    dinner: { recipeIds: [], headcount: 110 },
  };

  const applyMenuDraft = (updatedPlan: FifteenDayMenuPlan) => {
    saveMenuPlan(updatedPlan, { recordAudit: false });
    setHasUnsavedChanges(true);
  };

  const handleStartDateChange = (newStartDate: string) => {
    if (!newStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)) return;
    const year = Number(newStartDate.slice(0, 4));
    if (year < 2000) return;
    const centerLocation = resolveCenterLocation(currentCenter);
    const generated = generateFull15DayMenuFromStartDate(newStartDate, recipes, activeMenuPlan, centerLocation);
    saveMenuPlan(generated, { recordAudit: false });
    setHasUnsavedChanges(true);
    showToast(
      `Calculated 2-week cycle (${formatDateDDMMYYYY(generated.startDate)} to ${formatDateDDMMYYYY(generated.endDate)}) and auto-filled menus! Click "Update" to save.`,
      'info'
    );
  };

  const handleCommitUpdate = async () => {
    setIsUpdating(true);
    try {
      await saveMenuPlan(activeMenuPlan, { recordAudit: true });
      setHasUnsavedChanges(false);
      showToast('15-Day Menu Plan updated & recorded in Audit Trail!', 'success');
    } catch (err) {
      console.error('[FifteenDayMenuPlanner] Failed to update menu plan:', err);
      showToast('Failed to save menu plan to Firestore. Please try again.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApprove = async () => {
    const res = await approveMenuPlan(activeMenuPlan.id);
    if (res.success) {
      showToast('15-Day Menu Plan successfully approved by Admin!', 'success');
    } else {
      showToast(res.error || 'Could not approve menu plan.', 'error');
    }
  };

  // Remove a single recipe from meal slot
  const handleRemoveRecipeFromMeal = (mealKey: MealSlotKey, recipeId: string) => {
    const slot = activeDay[mealKey] || { recipeIds: [], headcount: 20 };
    const updatedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      days: {
        ...activeMenuPlan.days,
        [selectedDay]: {
          ...activeDay,
          [mealKey]: {
            ...slot,
            recipeIds: (slot.recipeIds || []).filter((id) => id !== recipeId),
          },
        },
      },
    };
    applyMenuDraft(updatedPlan);
  };

  // Add a recipe to meal slot
  const handleAddRecipeToMeal = (mealKey: MealSlotKey, recipeId: string) => {
    const slot = activeDay[mealKey] || { recipeIds: [], headcount: 20 };
    if ((slot.recipeIds || []).includes(recipeId)) return;

    const updatedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      days: {
        ...activeMenuPlan.days,
        [selectedDay]: {
          ...activeDay,
          [mealKey]: {
            ...slot,
            recipeIds: [...(slot.recipeIds || []), recipeId],
          },
        },
      },
    };
    applyMenuDraft(updatedPlan);
  };

  // Apply a predefined pattern to meal slot
  const handleApplyPatternToMeal = (mealKey: MealSlotKey, pattern: MenuPattern) => {
    const slot = activeDay[mealKey] || { recipeIds: [], headcount: 20 };
    const combinedIds = Array.from(new Set([...(slot.recipeIds || []), ...pattern.recipeIds]));

    const updatedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      days: {
        ...activeMenuPlan.days,
        [selectedDay]: {
          ...activeDay,
          [mealKey]: {
            ...slot,
            recipeIds: combinedIds,
          },
        },
      },
    };
    applyMenuDraft(updatedPlan);
    setAddDishModalMeal(null);
  };

  // Copy entire menu from another day into current day
  const handleCopyFromDay = (sourceDayNum: number) => {
    const sourceDay = activeMenuPlan.days[sourceDayNum];
    if (!sourceDay) return;

    const updatedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      days: {
        ...activeMenuPlan.days,
        [selectedDay]: {
          ...activeDay,
          breakfast: { ...sourceDay.breakfast, headcount: activeDay.breakfast.headcount },
          lunch: { ...sourceDay.lunch, headcount: activeDay.lunch.headcount },
          dinner: { ...sourceDay.dinner, headcount: activeDay.dinner.headcount },
          brahmacariBreakfast: sourceDay.brahmacariBreakfast
            ? {
                ...sourceDay.brahmacariBreakfast,
                headcount: activeDay.brahmacariBreakfast?.headcount ?? sourceDay.brahmacariBreakfast.headcount,
              }
            : activeDay.brahmacariBreakfast,
          brahmacariLunch: sourceDay.brahmacariLunch
            ? {
                ...sourceDay.brahmacariLunch,
                headcount: activeDay.brahmacariLunch?.headcount ?? sourceDay.brahmacariLunch.headcount,
              }
            : activeDay.brahmacariLunch,
        },
      },
    };
    applyMenuDraft(updatedPlan);
    setIsCopyDropdownOpen(false);
  };

  // Clear all dishes for this day
  const handleClearDay = () => {
    if (!window.confirm(`Clear all dishes assigned to Day ${selectedDay}?`)) return;
    const updatedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      days: {
        ...activeMenuPlan.days,
        [selectedDay]: {
          ...activeDay,
          breakfast: { ...activeDay.breakfast, recipeIds: [] },
          lunch: { ...activeDay.lunch, recipeIds: [] },
          dinner: { ...activeDay.dinner, recipeIds: [] },
          brahmacariBreakfast: activeDay.brahmacariBreakfast
            ? { ...activeDay.brahmacariBreakfast, recipeIds: [] }
            : undefined,
          brahmacariLunch: activeDay.brahmacariLunch
            ? { ...activeDay.brahmacariLunch, recipeIds: [] }
            : undefined,
        },
      },
    };
    applyMenuDraft(updatedPlan);
  };

  // Toggle Ekadashi flag for this day
  const handleToggleEkadashi = () => {
    const nextState = !activeDay.isEkadashi;
    const updatedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      days: {
        ...activeMenuPlan.days,
        [selectedDay]: {
          ...activeDay,
          isEkadashi: nextState,
          occasionTitle: nextState ? 'Ekadashi Fasting Day' : undefined,
        },
      },
    };
    applyMenuDraft(updatedPlan);
  };

  // Automatically apply 7-day weekly rotation for Brahmacari Ashram meals
  const handleAutoRotateAshram = () => {
    const ashramRecipes = recipes.filter((r) => r.type === 'Ashram' || r.isAshramSpecific);
    if (ashramRecipes.length === 0) {
      showToast('No Ashram recipes found. Please add Ashram recipes in the Recipes & Patterns tab first.', 'warning');
      return;
    }

    if (!window.confirm('Apply a 7-day weekly rotation for Brahmacari Ashram meals across all 15 days?')) {
      return;
    }

    const isEkadashiMap: Record<number, boolean> = {};
    for (let d = 1; d <= 15; d++) {
      isEkadashiMap[d] = !!activeMenuPlan.days[d]?.isEkadashi;
    }

    const rotation = generateAshramWeeklyRotation(ashramRecipes, isEkadashiMap);
    const updatedDays = { ...activeMenuPlan.days };

    for (let d = 1; d <= 15; d++) {
      const existing = updatedDays[d] || {
        dayNumber: d,
        date: formatDateISO(new Date()),
        isEkadashi: false,
        breakfast: { recipeIds: [], headcount: 100 },
        lunch: { recipeIds: [], headcount: 150 },
        dinner: { recipeIds: [], headcount: 110 },
      };

      updatedDays[d] = {
        ...existing,
        brahmacariBreakfast: {
          recipeIds: rotation[d]?.breakfastRecipeIds || [],
          headcount: existing.brahmacariBreakfast?.headcount ?? 20,
        },
        brahmacariLunch: {
          recipeIds: rotation[d]?.lunchRecipeIds || [],
          headcount: existing.brahmacariLunch?.headcount ?? 20,
        },
      };
    }

    const updatedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      days: updatedDays,
    };

    applyMenuDraft(updatedPlan);
    setHasUnsavedChanges(true);
    showToast('Applied 7-day weekly rotation for Brahmacari Ashram meals! Click "Update" to save.', 'info');
  };

  // Filter recipes for Add Dish dialog
  const filteredModalRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (dishOccasionFilter === 'Ashram') {
        if (r.type !== 'Ashram' && !r.isAshramSpecific) return false;
      } else if (dishOccasionFilter !== 'all' && r.occasion !== dishOccasionFilter) {
        return false;
      }
      if (dishSearch.trim()) {
        const q = dishSearch.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          r.occasion.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [recipes, dishOccasionFilter, dishSearch]);

  const isPending = activeMenuPlan.status === 'pending_approval';
  const isApproved = activeMenuPlan.status === 'approved';
  const isSelfCreated = activeMenuPlan.createdBy === currentUser.uid;

  const displayApprovedByName = useMemo(() => {
    if (!activeMenuPlan.approvedByName) return '';
    const approverUid = activeMenuPlan.approvedBy;
    const approverUser =
      allUsers?.find((u) => u.uid === approverUid) ||
      (currentUser.uid === approverUid ? currentUser : null);
    if (
      approverUser?.role === 'sadmin' ||
      activeMenuPlan.approvedByName.toLowerCase().includes('sandipan')
    ) {
      return activeMenuPlan.approvedByName.replace(/\(Admin\)/i, '(Super Admin)');
    }
    return activeMenuPlan.approvedByName;
  }, [activeMenuPlan.approvedByName, activeMenuPlan.approvedBy, allUsers, currentUser]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Maker-Checker Approval Status */}
      <div
        className={`p-5 rounded-3xl transition-all backdrop-blur-md ${
          isApproved
            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-x border-emerald-200/80 dark:border-emerald-800/70 border-t-2 border-t-emerald-500 border-b-2 border-b-teal-500/50'
            : isPending
            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-x border-amber-200/80 dark:border-amber-800/70 border-t-2 border-t-amber-500 border-b-2 border-b-orange-500/50'
            : 'modern-card'
        }`}
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    : isPending
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                }`}
              >
                {activeMenuPlan.status.replace('_', ' ').toUpperCase()}
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {activeMenuPlan.title}
              </h2>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap gap-2 items-center">
              <span>
                Created by: <strong>{activeMenuPlan.createdByName || 'Pending Update'}</strong>
              </span>
              {activeMenuPlan.approvedByName && (
                <span>
                  &bull; Approved by: <strong className="text-emerald-600 dark:text-emerald-400">{displayApprovedByName}</strong>
                </span>
              )}
            </div>

            {/* Start Date Selector -> Auto-Calculates 2 Weeks & Fills Menus */}
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center space-x-2 bg-white/80 dark:bg-slate-900/70 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <CalendarIcon className="w-3.5 h-3.5 text-orange-500" />
                <label htmlFor="cycle-start-date" className="font-bold text-slate-600 dark:text-slate-300">
                  Start Date:
                </label>
                <input
                  id="cycle-start-date"
                  type="date"
                  value={activeMenuPlan.startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                />
              </div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                2-Week Span: <strong className="text-slate-800 dark:text-slate-200">{formatDateDDMMYYYY(activeMenuPlan.startDate)}</strong> to{' '}
                <strong className="text-slate-800 dark:text-slate-200">{formatDateDDMMYYYY(activeMenuPlan.endDate)}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleStartDateChange(activeMenuPlan.startDate || formatDateISO(new Date()))}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-orange-100/90 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 font-bold border-y border-orange-200 dark:border-orange-800 border-l-2 border-l-orange-500 border-r-2 border-r-amber-500/60 transition"
                title="Recalculate 2 weeks from start date and auto-fill menus"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fill 2 Weeks</span>
              </button>
            </div>
          </div>

          {/* Maker-Checker Action Buttons & Audit Trail */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleCommitUpdate}
              disabled={isUpdating}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold modern-btn-primary ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-orange-500/25 ring-2 ring-orange-300 dark:ring-orange-700'
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white shadow-slate-900/15'
              } disabled:opacity-60`}
              title="Save changes to Firestore and record in Audit Trail"
            >
              {isUpdating ? <LoadingSpinner size="xs" /> : <Save className="w-4 h-4" />}
              <span>{isUpdating ? 'Updating...' : hasUnsavedChanges ? 'Update*' : 'Update'}</span>
            </button>

            <button
              onClick={() => openAuditModal('menu_planner')}
              className="flex items-center space-x-1.5 modern-btn-secondary text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl font-bold hover:bg-slate-100/90 dark:hover:bg-slate-800/90 shadow-sm"
              title="View revision and Maker-Checker approval history"
            >
              <History className="w-4 h-4 text-orange-500" />
              <span>Audit History</span>
            </button>

            {isPending && isSelfCreated && !isSAdmin && (
              <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 px-3 py-2 rounded-xl border border-amber-300">
                <Info className="w-4 h-4 text-amber-600" />
                <span className="font-semibold">
                  Under <strong>Maker-Checker policy</strong>, another admin must review and approve.
                </span>
              </div>
            )}

            {isPending && !isSAdmin && (() => {
              const baseUrl =
                typeof window !== 'undefined'
                  ? window.location.origin
                  : 'https://iskcon-ponda-kitchen-erp.web.app';
              const waMessage = [
                '🙏 *Hare Krishna!*',
                '*15-Day Prasadam Menu — Approval Request*',
                '',
                `🏛️ *Center:* ${currentCenter?.name || 'ISKCON Center'}`,
                `📋 *Menu Plan:* ${activeMenuPlan.title}`,
                `📅 *Cycle:* ${formatDateDDMMYYYY(activeMenuPlan.startDate)} to ${formatDateDDMMYYYY(activeMenuPlan.endDate)}`,
                `👤 *Updated By:* ${currentUser.name}`,
                '⏳ *Status:* Pending Admin Approval',
                '',
                '_Under Maker-Checker policy, another Center Admin must review and approve this menu before it is locked._',
                '',
                '🔗 *Review & Approve Menu:*',
                `${baseUrl}/menu-planner`,
                '',
                '🏠 *Open Kitchen ERP:*',
                `${baseUrl}/`,
              ].join('\n');

              return (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(waMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition"
                  title="Send formatted approval request to Center Admins via WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Notify via WhatsApp</span>
                </a>
              );
            })()}

            {isPending && canApproveActiveMenu && (
              <button
                onClick={handleApprove}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve 15-Day Menu</span>
              </button>
            )}

            {isApproved && (
              <span className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-900/60 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>Live & Approved</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Repetition Validator Alert */}
      {!repetitionCheck.isValid && (
        <div className="bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl text-xs space-y-1.5 text-rose-800 dark:text-rose-300">
          <div className="flex items-center space-x-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Repetition Rule Warning: Dishes repeating across 15 days</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
            {repetitionCheck.violations.slice(0, 3).map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 15-Day Cycle Grid Selector */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 uppercase">Select Day (1 — 15)</span>
          <span className="text-slate-400 dark:text-slate-500">Fixed 3 Meals &bull; Ekadashi Auto-Guarded</span>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {Array.from({ length: 15 }, (_, i) => i + 1).map((dayNum) => {
            const day = activeMenuPlan.days[dayNum];
            const isSelected = selectedDay === dayNum;
            const isEkadashi = day?.isEkadashi;

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDay(dayNum)}
                className={`flex-1 min-w-[52px] sm:min-w-[60px] py-2.5 rounded-xl font-black text-xs transition-all flex flex-col items-center relative ${
                  isSelected
                    ? isEkadashi
                      ? 'bg-gradient-to-tr from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/30 scale-105 ring-2 ring-purple-300 dark:ring-purple-700'
                      : 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-105'
                    : isEkadashi
                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className={`text-[10px] font-bold ${isSelected ? 'opacity-95' : 'opacity-75'}`}>D{dayNum}</span>
                {day?.date && (
                  <span className={`text-[9px] font-semibold leading-tight mt-0.5 ${isSelected ? 'opacity-95' : 'opacity-70'}`}>
                    {formatDateDDMMYYYY(day.date).slice(0, 5)}
                  </span>
                )}
                {isEkadashi && (
                  <span
                    className={`text-[8px] font-black uppercase mt-0.5 px-1 rounded ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    Ekadashi
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Day Detail & Full Day Menu Editor */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        {/* Day Header with Edit Day Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-xs font-black px-2.5 py-1 rounded-md">
                DAY {selectedDay}
              </span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                Date: {formatDateDDMMYYYY(activeDay.date)}
              </h3>
              {activeDay.isEkadashi && (
                <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black px-2.5 py-1 rounded-full border border-purple-300 dark:border-purple-800">
                  ✨ {activeDay.occasionTitle || 'Ekadashi Fasting Day'}
                </span>
              )}
            </div>
            {activeDay.isEkadashi && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                ISKCON Vaishnava Rule Enforced: Strictly grain-free menus (Sama rice, Sabudana, Paneer, Fruit, Milk only).
              </p>
            )}
          </div>

          {/* Day Menu Editing Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Ekadashi */}
            <button
              onClick={handleToggleEkadashi}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                activeDay.isEkadashi
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
              title="Toggle Ekadashi status for this day"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{activeDay.isEkadashi ? 'Ekadashi Active' : 'Mark Ekadashi'}</span>
            </button>

            {/* Copy from Another Day Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700"
                title="Copy all meals from another day"
              >
                <Copy className="w-3.5 h-3.5 text-blue-500" />
                <span>Copy From...</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isCopyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-30 max-h-56 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Select Source Day
                  </div>
                  {Array.from({ length: 15 }, (_, i) => i + 1)
                    .filter((d) => d !== selectedDay)
                    .map((d) => (
                      <button
                        key={d}
                        onClick={() => handleCopyFromDay(d)}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 font-medium"
                      >
                        Copy from Day {d}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Auto-Rotate Ashram Menu (Weekly Cycle) */}
            <button
              onClick={handleAutoRotateAshram}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-bold transition border border-amber-300 dark:border-amber-800 shadow-sm"
              title="Apply 7-day weekly rotation for Brahmacari Ashram meals across all 15 days"
            >
              <span>🕉️</span>
              <span>Rotate Ashram (Weekly)</span>
            </button>

            {/* Clear Day Dishes */}
            <button
              onClick={handleClearDay}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition"
              title="Clear all dishes from this day"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Day</span>
            </button>
          </div>
        </div>

        {/* 3 Meals: Breakfast, Lunch, Dinner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['breakfast', 'lunch', 'dinner'] as const).map((mealKey) => {
            const slot = activeDay[mealKey];
            const title = mealKey.toUpperCase();
            const ashramSlotKey =
              mealKey === 'breakfast'
                ? 'brahmacariBreakfast'
                : mealKey === 'lunch'
                ? 'brahmacariLunch'
                : null;
            const ashramSlot = ashramSlotKey
              ? activeDay[ashramSlotKey] || { recipeIds: [], headcount: 20 }
              : null;

            return (
              <div
                key={mealKey}
                className="bg-slate-50/70 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Meal Header & Pax */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      General {title}
                    </span>
                    <div className="flex items-center space-x-1.5 text-xs">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-800 dark:text-white">{slot.headcount} Pax</span>
                    </div>
                  </div>

                  {/* Headcount Input */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Headcount for General {title}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={slot.headcount === 0 ? '' : slot.headcount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const { numValue } = sanitizeNumericChange(e, false);
                        const updatedPlan = {
                          ...activeMenuPlan,
                          days: {
                            ...activeMenuPlan.days,
                            [selectedDay]: {
                              ...activeDay,
                              [mealKey]: { ...slot, headcount: numValue },
                            },
                          },
                        };
                        applyMenuDraft(updatedPlan);
                      }}
                      className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Assigned Recipes List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Assigned Dishes ({slot.recipeIds.length}):
                      </span>
                    </div>

                    <div className="space-y-2">
                      {slot.recipeIds.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                          No dishes assigned yet.
                        </div>
                      ) : (
                        slot.recipeIds.map((rId) => {
                          const recipe = recipeMap.get(rId);
                          const isNonEkadashiOnEkadashi =
                            activeDay.isEkadashi && recipe?.occasion === 'Normal';

                          return (
                            <div
                              key={rId}
                              className={`p-2.5 rounded-xl border text-xs flex justify-between items-center transition ${
                                isNonEkadashiOnEkadashi
                                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="min-w-0 flex-1 mr-2">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {recipe?.name || 'Recipe'}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 flex-wrap">
                                  <span
                                    className={`font-semibold ${
                                      recipe?.occasion === 'Ekadashi'
                                        ? 'text-purple-600 dark:text-purple-400'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {recipe?.occasion || 'Normal'}
                                  </span>
                                  <span>&bull;</span>
                                  <span>{recipe?.type || 'Dish'}</span>
                                  {isNonEkadashiOnEkadashi && (
                                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                                      ⚠️ Non-Ekadashi Grain
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => handleRemoveRecipeFromMeal(mealKey, rId)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex-shrink-0"
                                title="Remove dish from this meal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Meal Slot Action Buttons: Add Dish & Apply Pattern */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <button
                      onClick={() => {
                        setAddDishModalMeal(mealKey);
                        setDishModalTab('recipes');
                        setDishSearch('');
                      }}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-dashed border-orange-300 dark:border-orange-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Dish to General {title}</span>
                    </button>

                    {patterns.length > 0 && (
                      <button
                        onClick={() => {
                          setAddDishModalMeal(mealKey);
                          setDishModalTab('patterns');
                          setDishSearch('');
                        }}
                        className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-semibold transition flex items-center justify-center space-x-1"
                      >
                        <Layers className="w-3 h-3 text-purple-500" />
                        <span>Apply Menu Pattern</span>
                      </button>
                    )}
                  </div>

                  {/* Dedicated Brahmacari Ashram Section for Breakfast & Lunch */}
                  {ashramSlotKey && ashramSlot && (
                    <div className="pt-4 mt-3 border-t-2 border-dashed border-amber-300 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl p-3.5 space-y-3">
                      {/* Ashram Header & Pax */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm">🕉️</span>
                          <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                            Brahmacari Ashram {mealKey === 'breakfast' ? 'Breakfast' : 'Lunch'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                          <Users className="w-3.5 h-3.5" />
                          <span>{ashramSlot.headcount} Monks</span>
                        </div>
                      </div>

                      {/* Ashram Headcount Input */}
                      <div>
                        <label className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                          Ashram Headcount (Pax)
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={ashramSlot.headcount === 0 ? '' : ashramSlot.headcount}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const { numValue } = sanitizeNumericChange(e, false);
                            const updatedPlan = {
                              ...activeMenuPlan,
                              days: {
                                ...activeMenuPlan.days,
                                [selectedDay]: {
                                  ...activeDay,
                                  [ashramSlotKey]: { ...ashramSlot, headcount: numValue },
                                },
                              },
                            };
                            applyMenuDraft(updatedPlan);
                          }}
                          className="w-full mt-1 p-2 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      {/* Ashram Assigned Dishes List */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                            Ashram Dishes ({ashramSlot.recipeIds.length}):
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {ashramSlot.recipeIds.length === 0 ? (
                            <div className="p-3 rounded-xl border border-dashed border-amber-200 dark:border-amber-900/60 text-center text-xs text-amber-600/70 dark:text-amber-400/70 bg-white/60 dark:bg-slate-900/40">
                              No ashram dishes assigned.
                            </div>
                          ) : (
                            ashramSlot.recipeIds.map((rId) => {
                              const recipe = recipeMap.get(rId);
                              const isNonEkadashiOnEkadashi =
                                activeDay.isEkadashi && recipe?.occasion === 'Normal';

                              return (
                                <div
                                  key={rId}
                                  className={`p-2 rounded-xl border text-xs flex justify-between items-center transition ${
                                    isNonEkadashiOnEkadashi
                                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                                      : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/60'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 mr-2">
                                    <div className="font-bold text-slate-900 dark:text-white truncate">
                                      {recipe?.name || 'Recipe'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 flex-wrap">
                                      <span
                                        className={`font-semibold ${
                                          recipe?.occasion === 'Ekadashi'
                                            ? 'text-purple-600 dark:text-purple-400'
                                            : 'text-slate-500 dark:text-slate-400'
                                        }`}
                                      >
                                        {recipe?.occasion || 'Normal'}
                                      </span>
                                      <span>&bull;</span>
                                      <span>{recipe?.type || 'Dish'}</span>
                                      {isNonEkadashiOnEkadashi && (
                                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                                          ⚠️ Non-Ekadashi Grain
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleRemoveRecipeFromMeal(ashramSlotKey, rId)}
                                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex-shrink-0"
                                    title="Remove dish from ashram meal"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Ashram Slot Action Buttons */}
                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => {
                            setAddDishModalMeal(ashramSlotKey);
                            setDishModalTab('recipes');
                            setDishOccasionFilter('Ashram');
                            setDishSearch('');
                          }}
                          className="flex-1 py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Ashram Dish</span>
                        </button>

                        {patterns.length > 0 && (
                          <button
                            onClick={() => {
                              setAddDishModalMeal(ashramSlotKey);
                              setDishModalTab('patterns');
                              setDishSearch('');
                            }}
                            className="py-1.5 px-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-200 rounded-xl text-[11px] font-semibold transition flex items-center justify-center space-x-1"
                            title="Apply Pattern to Ashram"
                          >
                            <Layers className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                            <span>Pattern</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Dish Picker & Pattern Loader Modal */}
      {addDishModalMeal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
          onClick={() => setAddDishModalMeal(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-auto max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Add Dishes: Day {selectedDay} — {getMealSlotTitle(addDishModalMeal)}
                  </h3>
                  {activeDay.isEkadashi && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-300">
                      ✨ Ekadashi Day
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose individual Vaishnava recipes or load a pre-set meal pattern into this slot.
                </p>
              </div>

              <button
                onClick={() => setAddDishModalMeal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs: Recipes vs Patterns */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setDishModalTab('recipes')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    dishModalTab === 'recipes'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Individual Recipes ({recipes.length})
                </button>
                <button
                  onClick={() => setDishModalTab('patterns')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    dishModalTab === 'patterns'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Meal Patterns ({patterns.length})
                </button>
              </div>

              {dishModalTab === 'recipes' && (
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search dish name..."
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}
            </div>

            {/* Occasion Filter Chips (only for recipes tab) */}
            {dishModalTab === 'recipes' && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                {(['all', 'Ashram', 'Normal', 'Ekadashi', 'Fasting'] as const).map((occ) => (
                  <button
                    key={occ}
                    onClick={() => setDishOccasionFilter(occ)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${
                      dishOccasionFilter === occ
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {occ === 'all' ? 'All Occasions' : occ === 'Ashram' ? '🕉️ Ashram Specials' : occ}
                  </button>
                ))}
              </div>
            )}

            {/* List Body */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-96">
              {dishModalTab === 'recipes' ? (
                filteredModalRecipes.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No recipes found matching your search.
                  </div>
                ) : (
                  filteredModalRecipes.map((r) => {
                    const isAlreadyAdded = (activeDay[addDishModalMeal]?.recipeIds || []).includes(r.id);
                    const isGrainOnEkadashi = activeDay.isEkadashi && r.occasion === 'Normal';

                    return (
                      <div
                        key={r.id}
                        className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800 transition"
                      >
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                              {r.name}
                            </span>
                            {(r.type === 'Ashram' || r.isAshramSpecific) && (
                              <span className="text-[9px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-800">
                                🕉️ Ashram
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                r.occasion === 'Ekadashi'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {r.occasion}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-2">
                            <span>{r.type} &bull; {r.mealType}</span>
                            <span>&bull;</span>
                            <span>{r.ingredients.length} ingredients</span>
                            {isGrainOnEkadashi && (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">
                                ⚠️ Non-Ekadashi Grain
                              </span>
                            )}
                          </div>
                        </div>

                        {isAlreadyAdded ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddRecipeToMeal(addDishModalMeal, r.id)}
                            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )
              ) : patterns.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No meal patterns configured yet. Create patterns in the Recipes & Patterns tab.
                </div>
              ) : (
                patterns.map((pat) => (
                  <div
                    key={pat.id}
                    className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                        {pat.name}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {pat.description || `${pat.recipeIds.length} dishes included`}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {pat.recipeIds.map((rId) => {
                          const r = recipeMap.get(rId);
                          return (
                            <span
                              key={rId}
                              className="text-[9px] bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded"
                            >
                              {r?.name || 'Dish'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyPatternToMeal(addDishModalMeal, pat)}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex-shrink-0"
                    >
                      Apply Pattern
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setAddDishModalMeal(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
