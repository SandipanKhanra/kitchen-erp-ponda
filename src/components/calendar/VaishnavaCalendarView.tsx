import React from 'react';
import { VAISHNAVA_OCCASIONS } from '../../core/vaishnavaCalendar';
import { Calendar as CalendarIcon, Sparkles, AlertCircle, CheckCircle, Info } from 'lucide-react';

export const VaishnavaCalendarView: React.FC = () => {
  const occasions = Object.values(VAISHNAVA_OCCASIONS);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black px-2.5 py-1 rounded-md border border-purple-300 dark:border-purple-800">
              VAISHNAVA SMRITI ENGINE
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ISKCON Vaishnava Calendar & Fasting Rules
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            While fixing menus, the 15-day rotation engine checks all Ekadashis and Fasting occasions to enforce strict non-grain recipes.
          </p>
        </div>
      </div>

      {/* Guidelines Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-5 rounded-3xl space-y-2">
          <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-black">
            <AlertCircle className="w-4 h-4" />
            <span>Strictly Prohibited on Ekadashi & Grain Fasts</span>
          </div>
          <p className="text-rose-900 dark:text-rose-300 leading-relaxed">
            All grains, wheat, rice, corn, mustard seeds/oil, toor dal, moong dal, urad dal, chana, beans, peas, and sesame seeds (except on Shat-tila Ekadashi).
          </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-5 rounded-3xl space-y-2">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-black">
            <CheckCircle className="w-4 h-4" />
            <span>Permitted Ekadashi Prasadam Ingredients</span>
          </div>
          <p className="text-emerald-900 dark:text-emerald-300 leading-relaxed">
            Sama Rice (Barnyard Millet), Sabudana (Tapioca pearls), Buckwheat (Kuttu), Pure Desi Cow Ghee, Paneer, Cow Milk, Potatoes, Himalayan Sendha Rock Salt, and Fresh Fruits.
          </p>
        </div>
      </div>

      {/* Calendar Occasions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {occasions.map((occ) => (
          <div
            key={occ.date}
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-800">
                  {occ.type}
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1.5">{occ.name}</h3>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                {occ.date}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{occ.description}</p>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-purple-600 dark:text-purple-400 font-bold">
              Rule: {occ.fastingRule}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
