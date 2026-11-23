import React, { useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { Calendar, Users, DollarSign, Edit3, Plus, Utensils, Check, Flame } from 'lucide-react';
import { ProgramSlot } from '../../types/menu';
import { MealType } from '../../types/recipe';
import { MEAL_TYPES } from '../../config/constants';

export const MenuCycleView: React.FC = () => {
  const { menuCycle, recipes, recipeMap, getRecipeCost, updateProgramsForDay } = useKitchen();
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [editingProgram, setEditingProgram] = useState<ProgramSlot | null>(null);
  const [isAddingProgram, setIsAddingProgram] = useState(false);

  // New program state
  const [progName, setProgName] = useState('');
  const [progMealType, setProgMealType] = useState<MealType>('Lunch');
  const [progHeadcount, setProgHeadcount] = useState<number>(120);
  const [progRecipes, setProgRecipes] = useState<string[]>([]);
  const [progTime, setProgTime] = useState('12:30');

  if (!menuCycle) {
    return <div className="p-8 text-center text-slate-400">Loading 15-Day Cycle Engine...</div>;
  }

  const activeDayPlan = menuCycle.days[selectedDay] || { dayNumber: selectedDay, programs: [] };

  // Feature 9: Calculate Daily and Total 15-Day Menu Cost
  let total15DayCycleCost = 0;
  let total15DayMealsServed = 0;

  for (let d = 1; d <= 15; d++) {
    const day = menuCycle.days[d];
    if (day && day.programs) {
      day.programs.forEach((prog) => {
        total15DayMealsServed += prog.headcount;
        prog.recipeIds.forEach((rId) => {
          const rec = recipeMap.get(rId);
          if (rec) {
            const cost = getRecipeCost(rec);
            total15DayCycleCost += cost.costPerPortion * prog.headcount;
          }
        });
      });
    }
  }

  // Cost for currently selected day
  let selectedDayCost = 0;
  let selectedDayHeadcount = 0;
  activeDayPlan.programs.forEach((prog) => {
    selectedDayHeadcount += prog.headcount;
    prog.recipeIds.forEach((rId) => {
      const rec = recipeMap.get(rId);
      if (rec) {
        const cost = getRecipeCost(rec);
        selectedDayCost += cost.costPerPortion * prog.headcount;
      }
    });
  });

  const handleSaveProgram = async () => {
    if (!progName) return;

    const newProg: ProgramSlot = {
      id: editingProgram ? editingProgram.id : `prog_${Date.now()}`,
      name: progName,
      mealType: progMealType,
      headcount: progHeadcount,
      recipeIds: progRecipes,
      serviceStartTime: progTime,
    };

    let updatedPrograms: ProgramSlot[];
    if (editingProgram) {
      updatedPrograms = activeDayPlan.programs.map((p) => (p.id === editingProgram.id ? newProg : p));
    } else {
      updatedPrograms = [...activeDayPlan.programs, newProg];
    }

    await updateProgramsForDay(selectedDay, updatedPrograms);
    setEditingProgram(null);
    setIsAddingProgram(false);
    setProgName('');
    setProgRecipes([]);
  };

  const handleDeleteProgram = async (progId: string) => {
    const updated = activeDayPlan.programs.filter((p) => p.id !== progId);
    await updateProgramsForDay(selectedDay, updated);
  };

  return (
    <div className="space-y-6">
      {/* Header & Feature 9 Menu Cost KPI Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">15-Day Master Menu Rotation</h1>
          <p className="text-sm text-slate-500">
            Features 6, 9 & 10: Recurring 15-day cycle engine, program editor, and total menu ingredient cost rollup.
          </p>
        </div>
      </div>

      {/* Feature 9: Entire Menu Ingredient Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">15-Day Entire Menu Cost</span>
          <div className="text-2xl font-black text-slate-900 mt-1">₹{total15DayCycleCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <span className="text-xs text-slate-500">Across full 15-day rotation</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Average Daily Budget</span>
          <div className="text-2xl font-black text-orange-600 mt-1">
            ₹{(total15DayCycleCost / 15).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-xs text-slate-500">Per operational day</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Cost Per Guest Plate (Avg)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{total15DayMealsServed > 0 ? (total15DayCycleCost / total15DayMealsServed).toFixed(2) : '0.00'}
          </div>
          <span className="text-xs text-slate-500">Based on planned headcounts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Selected Day {selectedDay} Cost</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{selectedDayCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-xs text-slate-500">{selectedDayHeadcount} Total meals planned</span>
        </div>
      </div>

      {/* Feature 10: 15-Day Rotation Cycle Selector */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Select Rotation Day (1 — 15)
          </span>
          <span className="text-xs text-slate-500 font-medium">Automatic recurring cycle</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-15 gap-2">
          {Array.from({ length: 15 }, (_, i) => i + 1).map((dayNum) => {
            const isSelected = selectedDay === dayNum;
            return (
              <button
                key={dayNum}
                onClick={() => {
                  setSelectedDay(dayNum);
                  setEditingProgram(null);
                  setIsAddingProgram(false);
                }}
                className={`py-3 rounded-xl font-black text-sm transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 scale-105'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span className="text-[10px] font-semibold opacity-70">DAY</span>
                <span>{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feature 6: Program List for the Active Day */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-orange-100 text-orange-700 text-xs font-black px-2.5 py-1 rounded-md">
                CYCLE DAY {selectedDay}
              </span>
              <h2 className="text-lg font-bold text-slate-900">{activeDayPlan.title || `Day ${selectedDay} Schedule`}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure programs (e.g. Breakfast, Lunch, Dinner), assign recipes, and specify headcounts.
            </p>
          </div>

          <button
            onClick={() => {
              setIsAddingProgram(true);
              setEditingProgram(null);
              setProgName('');
              setProgRecipes([]);
            }}
            className="flex items-center space-x-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-orange-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Meal Program</span>
          </button>
        </div>

        {/* Programs List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeDayPlan.programs.map((prog) => {
            let progTotalCost = 0;
            prog.recipeIds.forEach((id) => {
              const rec = recipeMap.get(id);
              if (rec) {
                const cost = getRecipeCost(rec);
                progTotalCost += cost.costPerPortion * prog.headcount;
              }
            });

            return (
              <div
                key={prog.id}
                className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200 hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      {prog.mealType}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{prog.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600">
                      ₹{progTotalCost.toFixed(2)}
                    </span>
                    <div className="text-[10px] text-slate-400">Total Slot Cost</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    <strong>{prog.headcount}</strong>&nbsp;Pax Headcount
                  </span>
                  <span>Time: {prog.serviceStartTime || '12:00'}</span>
                </div>

                {/* Assigned Recipes */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Recipes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {prog.recipeIds.map((rId) => {
                      const recipe = recipeMap.get(rId);
                      return (
                        <span
                          key={rId}
                          className="bg-white text-slate-700 text-xs px-2.5 py-1 rounded-lg border border-slate-200 font-medium"
                        >
                          {recipe?.name || 'Unknown Recipe'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200/60 text-xs">
                  <button
                    onClick={() => {
                      setEditingProgram(prog);
                      setProgName(prog.name);
                      setProgMealType(prog.mealType);
                      setProgHeadcount(prog.headcount);
                      setProgRecipes(prog.recipeIds);
                      setProgTime(prog.serviceStartTime || '12:00');
                      setIsAddingProgram(true);
                    }}
                    className="text-slate-600 hover:text-orange-600 font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProgram(prog.id)}
                    className="text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Program Edit / Add Modal */}
        {isAddingProgram && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProgram ? 'Edit Meal Program' : `Add Program to Day ${selectedDay}`}
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700">Program Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Afternoon Raj Bhog Lunch"
                    value={progName}
                    onChange={(e) => setProgName(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700">Meal Category</label>
                    <select
                      value={progMealType}
                      onChange={(e) => setProgMealType(e.target.value as MealType)}
                      className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      {MEAL_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700">Expected Headcount (Pax)</label>
                    <input
                      type="number"
                      value={progHeadcount}
                      onChange={(e) => setProgHeadcount(parseInt(e.target.value) || 1)}
                      className="w-full mt-1 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700">Select Recipes</label>
                  <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5">
                    {recipes.map((r) => {
                      const isChecked = progRecipes.includes(r.id);
                      return (
                        <label key={r.id} className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setProgRecipes([...progRecipes, r.id]);
                              } else {
                                setProgRecipes(progRecipes.filter((id) => id !== r.id));
                              }
                            }}
                            className="rounded text-orange-500 focus:ring-orange-500"
                          />
                          <span className="text-slate-800 font-medium">{r.name}</span>
                          <span className="text-slate-400 text-[10px]">({r.category})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setIsAddingProgram(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProgram}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20"
                >
                  Save Program
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
