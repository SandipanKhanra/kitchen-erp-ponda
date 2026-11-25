import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  getVaishnavaCalendarForYear,
  registerSyncedOccasions,
} from '../../core/vaishnavaCalendar';
import {
  resolveCenterLocation,
  parseVaishnavaICS,
} from '../../core/gaurabdaCalendarEngine';
import { ISKCON_CHOWPATTY_CALENDAR } from '../../core/iskconChowpattyCalendar';
import { calendarRepository } from '../../services/repositories/CalendarRepository';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { VaishnavaOccasion } from '../../types/vaishnavaCalendar';
import {
  AlertCircle,
  CheckCircle,
  Search,
  MapPin,
  Sun,
  Clock,
  RefreshCw,
  Upload,
  ExternalLink,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { formatDateDDMMYYYY } from '../../utils/formatters';

export const VaishnavaCalendarView: React.FC = () => {
  const { currentCenter } = useAuth();
  const { showToast } = useToast();
  const centerLocation = useMemo(() => resolveCenterLocation(currentCenter), [currentCenter]);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(6);
  const [syncVersion, setSyncVersion] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'list' | 'embed'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load any previously synced occasions from Firestore for this center
  useEffect(() => {
    if (!currentCenter?.id) return;
    calendarRepository.fetchCenterCalendarOccasions(currentCenter.id).then((saved) => {
      if (saved && saved.length > 0) {
        registerSyncedOccasions(saved);
        setSyncVersion((v) => v + 1);
      }
    });
  }, [currentCenter?.id]);

  // Compute full year's Vaishnava calendar dynamically for this center's coordinates
  const occasions: VaishnavaOccasion[] = useMemo(() => {
    return getVaishnavaCalendarForYear(selectedYear, centerLocation);
  }, [selectedYear, centerLocation, syncVersion]);

  const types = ['All', 'Ekadashi', 'Fasting', 'Festival'];

  const filtered = occasions.filter((occ) => {
    const matchType = selectedType === 'All' || occ.type === selectedType;
    const matchSearch =
      !searchQuery.trim() ||
      occ.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      occ.date.includes(searchQuery) ||
      formatDateDDMMYYYY(occ.date).includes(searchQuery);
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

  const handleSyncToFirestore = async () => {
    setIsSyncing(true);
    try {
      await calendarRepository.syncCenterCalendarOccasions(currentCenter.id || 'default', occasions);
      showToast(
        `Synced ${occasions.length} location-based Vaishnava occasions (${selectedYear}) for ${centerLocation.label || currentCenter.city} to Firestore!`,
        'success'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleICSImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseVaishnavaICS(text);
      if (parsed.length === 0) {
        showToast('No Vaishnava Ekadashi or fasting events found in this .ics file.', 'warning');
        return;
      }
      registerSyncedOccasions(parsed);
      setSyncVersion((v) => v + 1);
      await calendarRepository.syncCenterCalendarOccasions(currentCenter.id || 'default', parsed);
      showToast(`Imported & synced ${parsed.length} events from ${file.name}!`, 'success');
    } catch {
      showToast('Failed to read .ics file.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-black px-2.5 py-1 rounded-md border border-purple-300 dark:border-purple-800">
              ISKCON CHOWPATTY GOOGLE CALENDAR
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Vaishnava Calendar & Fasting Rules
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            <span className="flex items-center space-x-1 font-semibold text-orange-600 dark:text-orange-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {centerLocation.label || currentCenter?.name || 'Ponda, Goa'} ({centerLocation.latitude.toFixed(2)}°N,{' '}
                {centerLocation.longitude.toFixed(2)}°E &bull; {centerLocation.timezone})
              </span>
            </span>
            <span>&bull; Synced with ISKCON Chowpatty Google Calendar feed (2025–2030) + Gaurabda fallback</span>
          </div>
        </div>

        {/* Year Selector + View Toggle + Sync & .ics Import Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl font-bold">
            <button
              type="button"
              onClick={() => setCalendarViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                calendarViewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Fasting List
            </button>
            <button
              type="button"
              onClick={() => setCalendarViewMode('embed')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
                calendarViewMode === 'embed'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-purple-500" />
              <span>Google Calendar</span>
            </button>
          </div>

          <a
            href={ISKCON_CHOWPATTY_CALENDAR.addToCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/85 dark:bg-slate-800/85 hover:bg-slate-50 dark:hover:bg-slate-700 border-y border-slate-200/80 dark:border-slate-700/80 border-l-2 border-l-orange-500 border-r-2 border-r-purple-500/50 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm transition"
            title="Subscribe to ISKCON Chowpatty Vaishnava Calendar in your Google Calendar"
          >
            <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
            <span>+ Add to My Google Calendar</span>
          </a>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            onChange={handleICSImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/85 dark:bg-slate-800/85 hover:bg-slate-50 dark:hover:bg-slate-700 border-y border-slate-200/80 dark:border-slate-700/80 border-l-2 border-l-purple-500 border-r-2 border-r-indigo-400/50 text-slate-700 dark:text-slate-200 rounded-xl font-bold shadow-sm transition"
            title="Import .ics calendar file from GCAL or vaisnavacalendar.info"
          >
            <Upload className="w-3.5 h-3.5 text-purple-600" />
            <span>Import GCAL .ics</span>
          </button>

          <button
            type="button"
            onClick={handleSyncToFirestore}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold border-t border-t-white/30 border-b-2 border-b-purple-900/50 shadow-md shadow-purple-600/20 transition disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Calendar'}</span>
          </button>
        </div>
      </div>

      {/* Guidelines Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-rose-50/90 dark:bg-rose-950/40 backdrop-blur-sm border-y border-r border-rose-200/80 dark:border-rose-900/80 border-l-4 border-l-rose-500 p-5 rounded-3xl space-y-2">
          <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 font-black">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Strictly Prohibited on Ekadashi &amp; Grain Fasts</span>
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

      {calendarViewMode === 'embed' ? (
        <div className="modern-card rounded-3xl p-3 sm:p-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
              ISKCON Chowpatty Official Google Calendar (Asia/Kolkata)
            </div>
            <a
              href={ISKCON_CHOWPATTY_CALENDAR.embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
            >
              <span>Open Full Window</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <iframe
            src={ISKCON_CHOWPATTY_CALENDAR.embedUrl}
            title="ISKCON Chowpatty Vaishnava Google Calendar"
            className="w-full h-[650px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white"
          />
        </div>
      ) : (
        <>
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
                  {formatDateDDMMYYYY(occ.date)}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{occ.description}</p>

              {(occ.sunriseLocal || occ.paranaWindow) && (
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-xl p-2.5 space-y-1 text-[11px]">
                  {occ.sunriseLocal && (
                    <div className="flex items-center space-x-1.5 text-amber-800 dark:text-amber-300 font-semibold">
                      <Sun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>Local Sunrise: {occ.sunriseLocal}</span>
                    </div>
                  )}
                  {occ.paranaWindow && (
                    <div className="flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>Parana: {occ.paranaWindow}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs text-purple-600 dark:text-purple-400 font-bold">
                Rule: {occ.fastingRule}
              </div>
            </div>
          ))
        )}
      </div>

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
        </>
      )}
    </div>
  );
};
