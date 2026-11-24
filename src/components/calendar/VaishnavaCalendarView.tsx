import React, { useState } from 'react';
import { VAISHNAVA_OCCASIONS } from '../../core/vaishnavaCalendar';
import { AlertCircle, CheckCircle, Search } from 'lucide-react';
import { Pagination } from '../common/Pagination';

export const VaishnavaCalendarView: React.FC = () => {
  const occasions = Object.values(VAISHNAVA_OCCASIONS);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);

  const types = ['All', 'Ekadashi', 'Fasting', 'Festival'];

  const filtered = occasions.filter((occ) => {
    const matchType = selectedType === 'All' || occ.type === selectedType;
    const matchSearch =
      !searchQuery.trim() ||
      occ.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.date.includes(searchQuery);
    return matchType && matchSearch;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black px-2.5 py-1 rounded-md border border-purple-300 dark:border-purple-800">
              VAISHNAVA SMRITI ENGINE
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Vaishnava Calendar & Fasting Rules
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
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Strictly Prohibited on Ekadashi & Grain Fasts</span>
          </div>
          <p className="text-rose-900 dark:text-rose-300 leading-relaxed">
            All grains, wheat, rice, corn, mustard seeds/oil, toor dal, moong dal, urad dal, chana, beans, peas, and sesame seeds (except on Shat-tila Ekadashi).
          </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 p-5 rounded-3xl space-y-2">
          <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-black">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Permitted Ekadashi Prasadam Ingredients</span>
          </div>
          <p className="text-emerald-900 dark:text-emerald-300 leading-relaxed">
            Sama Rice (Barnyard Millet), Sabudana (Tapioca pearls), Buckwheat (Kuttu), Pure Desi Cow Ghee, Paneer, Cow Milk, Potatoes, Himalayan Sendha Rock Salt, and Fresh Fruits.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl text-xs font-bold w-full sm:w-auto">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedType === t
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t} {t === 'All' ? `(${occasions.length})` : ''}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search occasion or date..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      {/* Calendar Occasions Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No occasions found matching your filter.
          </div>
        ) : (
          paginated.map((occ) => (
            <div
              key={occ.date}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-800">
                    {occ.type}
                  </span>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-1.5">{occ.name}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg flex-shrink-0">
                  {occ.date}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{occ.description}</p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-purple-600 dark:text-purple-400 font-bold">
                Rule: {occ.fastingRule}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        pageSizeOptions={[6, 12, 24]}
      />
    </div>
  );
};
