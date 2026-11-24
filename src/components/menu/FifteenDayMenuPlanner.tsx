import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKitchen } from '../../context/KitchenContext';
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
} from 'lucide-react';
import { MealType } from '../../types/recipe';

export const FifteenDayMenuPlanner: React.FC = () => {
  const { currentUser, isAdmin, isSAdmin } = useAuth();
  const {
    activeMenuPlan,
    saveMenuPlan,
    approveMenuPlan,
    rejectMenuPlan,
    canApproveActiveMenu,
    repetitionCheck,
    recipes,
    recipeMap,
    patterns,
  } = useKitchen();

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  const activeDay = activeMenuPlan.days[selectedDay] || {
    dayNumber: selectedDay,
    date: '2026-11-20',
    isEkadashi: false,
    breakfast: { recipeIds: [], headcount: 100 },
    lunch: { recipeIds: [], headcount: 150 },
    dinner: { recipeIds: [], headcount: 110 },
  };

  const handleApprove = async () => {
    const res = await approveMenuPlan(activeMenuPlan.id);
    if (res.success) {
      setApprovalMessage('15-Day Menu Plan successfully approved by Admin!');
      setTimeout(() => setApprovalMessage(null), 4000);
    } else {
      alert(res.error);
    }
  };

  const isPending = activeMenuPlan.status === 'pending_approval';
  const isApproved = activeMenuPlan.status === 'approved';
  const isSelfCreated = activeMenuPlan.createdBy === currentUser.uid;

  return (
    <div className="space-y-6">
      {/* Top Banner: Maker-Checker Approval Status */}
      <div
        className={`p-5 rounded-3xl border transition-all ${
          isApproved
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
            : isPending
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 border-emerald-300'
                    : isPending
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 border-amber-300'
                    : 'bg-slate-200 text-slate-800'
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
                Created by: <strong>{activeMenuPlan.createdByName}</strong>
              </span>
              {activeMenuPlan.approvedByName && (
                <span>
                  &bull; Approved by: <strong className="text-emerald-600 dark:text-emerald-400">{activeMenuPlan.approvedByName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Maker-Checker Action Buttons */}
          <div className="flex items-center space-x-2 text-xs">
            {isPending && isSelfCreated && !isSAdmin && (
              <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 px-3 py-2 rounded-xl border border-amber-300">
                <Info className="w-4 h-4 text-amber-600" />
                <span className="font-semibold">
                  You created this menu. Under <strong>Maker-Checker policy</strong>, another admin must approve it.
                </span>
              </div>
            )}

            {isPending && canApproveActiveMenu && (
              <button
                onClick={handleApprove}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve 15-Day Menu Plan</span>
              </button>
            )}

            {isApproved && (
              <span className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4" />
                <span>Live & Officially Approved</span>
              </span>
            )}
          </div>
        </div>

        {approvalMessage && (
          <div className="mt-3 p-2.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold text-center">
            {approvalMessage}
          </div>
        )}
      </div>

      {/* Repetition Validator Alert */}
      {!repetitionCheck.isValid && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl text-xs space-y-1.5 text-rose-800 dark:text-rose-300">
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
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-500 uppercase">Select Day (1 — 15)</span>
          <span className="text-slate-400">Fixed 3 Meals &bull; Ekadashi Auto-Guarded</span>
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
                    ? 'bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-105'
                    : isEkadashi
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold opacity-75">D{dayNum}</span>
                {isEkadashi && (
                  <span className="text-[8px] font-black uppercase text-amber-500 mt-0.5">
                    Ekadashi
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Day Detail: Breakfast, Lunch, Dinner */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-xs font-black px-2.5 py-1 rounded-md">
                DAY {selectedDay}
              </span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                Date: {activeDay.date}
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
        </div>

        {/* 3 Meals: Breakfast, Lunch, Dinner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['breakfast', 'lunch', 'dinner'] as const).map((mealKey) => {
            const slot = activeDay[mealKey];
            const title = mealKey.toUpperCase();

            return (
              <div
                key={mealKey}
                className="bg-slate-50/70 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    {title}
                  </span>
                  <div className="flex items-center space-x-1.5 text-xs">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800 dark:text-white">{slot.headcount} Pax</span>
                  </div>
                </div>

                {/* Headcount Input */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Headcount for {title}</label>
                  <input
                    type="number"
                    value={slot.headcount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      const updatedPlan = {
                        ...activeMenuPlan,
                        days: {
                          ...activeMenuPlan.days,
                          [selectedDay]: {
                            ...activeDay,
                            [mealKey]: { ...slot, headcount: count },
                          },
                        },
                      };
                      saveMenuPlan(updatedPlan);
                    }}
                    className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Recipes / Pattern in this slot */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Assigned Recipes:</span>
                  <div className="space-y-1.5">
                    {slot.recipeIds.map((rId) => {
                      const recipe = recipeMap.get(rId);
                      return (
                        <div
                          key={rId}
                          className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center"
                        >
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{recipe?.name || 'Recipe'}</div>
                            <span className="text-[10px] text-slate-400">
                              {recipe?.occasion} &bull; {recipe?.type}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
