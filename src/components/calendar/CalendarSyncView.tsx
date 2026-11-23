import React, { useState } from 'react';
import { useKitchen } from '../../context/KitchenContext';
import { Calendar as CalendarIcon, Download, Share2, Check, ExternalLink, Info } from 'lucide-react';
import { calculateCycleDay, getDateRange, formatDateISO } from '../../core/rotationEngine';
import { generateICalFeed, downloadICalFile } from '../../services/calendarSyncService';

export const CalendarSyncView: React.FC = () => {
  const { menuCycle, recipeMap, cycleStartDate, setCycleStartDate } = useKitchen();
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [exportDays, setExportDays] = useState(30);

  if (!menuCycle) return null;

  // Generate preview of upcoming 14 days
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 13);
  const upcomingDates = getDateRange(today, endDate);

  const handleDownloadICS = () => {
    const icsContent = generateICalFeed(menuCycle, recipeMap, cycleStartDate, exportDays);
    downloadICalFile(icsContent, 'kitchen_15_day_cycle.ics');
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Calendar & Event Sync</h1>
          <p className="text-sm text-slate-500">
            Feature 4: Sync your 15-day rotating meal schedules with Google Calendar, Outlook, and Apple Calendar.
          </p>
        </div>
        <button
          onClick={handleDownloadICS}
          className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-orange-500/20 text-sm transition-all"
        >
          {downloadSuccess ? <Check className="w-4 h-4 text-white" /> : <Download className="w-4 h-4" />}
          <span>{downloadSuccess ? 'iCal File Downloaded!' : 'Export to iCal / Google Cal'}</span>
        </button>
      </div>

      {/* Sync Instructions & Start Date Setting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Cycle Anchor Date</h3>
          <p className="text-xs text-slate-500">
            The starting date from which the 15-day rotation calculates Day 1, Day 2... Day 15.
          </p>
          <div>
            <label className="text-xs font-bold text-slate-700">Anchor Day 1 Date:</label>
            <input
              type="date"
              value={formatDateISO(cycleStartDate)}
              onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) setCycleStartDate(d);
              }}
              className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700">Sync Horizon (Days):</label>
            <select
              value={exportDays}
              onChange={(e) => setExportDays(parseInt(e.target.value))}
              className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500"
            >
              <option value={15}>15 Days (1 Full Rotation)</option>
              <option value={30}>30 Days (2 Full Rotations)</option>
              <option value={60}>60 Days (2 Months)</option>
              <option value={90}>90 Days (Quarter)</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-orange-400">
            <Info className="w-5 h-5" />
            <h3 className="font-bold text-sm">How Calendar Sync Works</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The system generates standard RFC-5545 <strong>.ics calendar feeds</strong>. When you export or import this file into <strong>Google Calendar</strong>:
          </p>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
            <li>Each day automatically shows scheduled meal programs (Breakfast, Lunch, Dinner).</li>
            <li>Shows target headcounts so head cooks know exact portions to prepare in advance.</li>
            <li>Displays itemized recipe names and serving times directly inside calendar event alerts.</li>
          </ul>
        </div>
      </div>

      {/* Real-time Rotation Preview Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm">Upcoming 14 Days Live Schedule Preview</h3>
          <span className="text-xs text-slate-500 font-medium">Mapped via 15-day modulo algorithm</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {upcomingDates.map((date) => {
            const cycleDay = calculateCycleDay(date, cycleStartDate, 15);
            const dayPlan = menuCycle.days[cycleDay];
            const isToday = date.toDateString() === today.toDateString();

            return (
              <div
                key={date.toISOString()}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  isToday
                    ? 'bg-orange-50/80 border-orange-400 shadow-sm'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-slate-900">
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                    </span>
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                        isToday ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      D{cycleDay}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {dayPlan?.programs.map((prog) => (
                      <div key={prog.id} className="bg-white p-1.5 rounded-lg border border-slate-200/60">
                        <div className="font-bold text-slate-800 text-[11px] truncate">{prog.name}</div>
                        <div className="text-[10px] text-slate-400">{prog.headcount} Pax</div>
                      </div>
                    ))}
                  </div>
                </div>

                {isToday && (
                  <div className="mt-2 text-center text-[10px] font-black uppercase text-orange-600 bg-orange-100/60 py-0.5 rounded">
                    Today
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
