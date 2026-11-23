import { MenuCycle } from '../types/menu';
import { Recipe } from '../types/recipe';
import { calculateCycleDay, getDateRange, formatDateISO } from '../core/rotationEngine';

/**
 * Calendar Sync Service (Feature 4)
 * Generates an industry-standard iCalendar (.ics) file content that works universally
 * with Google Calendar, Microsoft Outlook, and Apple Calendar.
 */
export function generateICalFeed(
  cycle: MenuCycle,
  recipeMap: Map<string, Recipe>,
  cycleStartDate: Date,
  daysToExport = 30
): string {
  const endDate = new Date(cycleStartDate);
  endDate.setDate(endDate.getDate() + daysToExport);

  const dates = getDateRange(cycleStartDate, endDate);
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KitchenOps//Kitchen Management ERP//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Kitchen 15-Day Menu Rotation',
    'X-WR-TIMEZONE:UTC',
  ];

  dates.forEach((date) => {
    const cycleDay = calculateCycleDay(date, cycleStartDate, 15);
    const dayPlan = cycle.days[cycleDay];

    if (!dayPlan || !dayPlan.programs) return;

    dayPlan.programs.forEach((prog) => {
      const dateStr = formatDateISO(date).replace(/-/g, '');
      const recipeNames = prog.recipeIds
        .map((id) => recipeMap.get(id)?.name || 'Custom Dish')
        .join(', ');

      const startTime = prog.serviceStartTime ? prog.serviceStartTime.replace(':', '') + '00' : '120000';
      const uid = `kitchen_${dateStr}_${prog.id}@kitchenops.local`;

      ics.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${dateStr}T${startTime}`,
        `SUMMARY:🍲 Day ${cycleDay}: ${prog.name} (${prog.headcount} Pax)`,
        `DESCRIPTION:Scheduled Recipes: ${recipeNames}\\nHeadcount: ${prog.headcount}\\nMeal Type: ${prog.mealType}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

/**
 * Downloads the .ics file to client browser
 */
export function downloadICalFile(icsContent: string, filename = 'kitchen_menu_sync.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
