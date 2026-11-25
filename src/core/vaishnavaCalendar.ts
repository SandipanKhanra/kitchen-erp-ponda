import { CenterLocation, VaishnavaOccasion } from '../types/vaishnavaCalendar';
import { Recipe } from '../types/recipe';
import {
  computeVaishnavaYearCalendar,
  DEFAULT_CENTER_LOCATION,
} from './gaurabdaCalendarEngine';
import { getChowpattyCalendarForYear } from './iskconChowpattyCalendar';

// Cache keyed by `${year}_${lat.toFixed(2)}_${lon.toFixed(2)}_${timezone}`
const yearCalendarCache = new Map<string, Record<string, VaishnavaOccasion>>();
// Custom / Firestore / iCal synced overrides keyed by `YYYY-MM-DD`
const syncedOccasionsMap = new Map<string, VaishnavaOccasion>();

/**
 * Registers synced occasions (e.g., from Firestore or GCAL .ics import)
 * so they are immediately available to the planner & calendar view.
 */
export function registerSyncedOccasions(occasions: VaishnavaOccasion[]): void {
  for (const occ of occasions) {
    if (occ.date) {
      syncedOccasionsMap.set(occ.date, occ);
    }
  }
}

/**
 * Returns all Vaishnava occasions (Ekadashi, Fasting, Festivals) for a given year
 * and Center location using the Gaurabda astronomical calculation engine.
 */
export function getVaishnavaCalendarForYear(
  year: number,
  location: CenterLocation = DEFAULT_CENTER_LOCATION
): VaishnavaOccasion[] {
  const cacheKey = `${year}_${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}_${location.timezone}`;
  let record = yearCalendarCache.get(cacheKey);

  if (!record) {
    const chowpattyEvents = getChowpattyCalendarForYear(year);
    const baseEvents =
      chowpattyEvents.length > 0
        ? chowpattyEvents
        : computeVaishnavaYearCalendar(year, location);
    record = {};
    for (const occ of baseEvents) {
      record[occ.date] = occ;
    }
    yearCalendarCache.set(cacheKey, record);
  }

  // Merge with any synced/imported overrides for that year
  const merged: Record<string, VaishnavaOccasion> = { ...record };
  for (const [dateStr, occ] of syncedOccasionsMap.entries()) {
    if (dateStr.startsWith(`${year}-`)) {
      merged[dateStr] = occ;
    }
  }

  return Object.values(merged).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Returns the Vaishnava Occasion for a given date (YYYY-MM-DD) at the specified location, or null.
 */
export function getVaishnavaOccasionForDate(
  dateStr: string,
  location: CenterLocation = DEFAULT_CENTER_LOCATION
): VaishnavaOccasion | null {
  if (!dateStr) return null;
  if (syncedOccasionsMap.has(dateStr)) {
    return syncedOccasionsMap.get(dateStr) || null;
  }

  const year = parseInt(dateStr.slice(0, 4), 10);
  if (isNaN(year)) return null;

  const list = getVaishnavaCalendarForYear(year, location);
  return list.find((occ) => occ.date === dateStr) || null;
}

/**
 * Checks if a date requires grain fasting (Ekadashi or Major Festival fast)
 */
export function isEkadashiOrFastingDate(
  dateStr: string,
  location: CenterLocation = DEFAULT_CENTER_LOCATION
): boolean {
  const occ = getVaishnavaOccasionForDate(dateStr, location);
  return occ !== null && (occ.type === 'Ekadashi' || occ.type === 'Fasting');
}

/**
 * Validates whether a Recipe is allowed for the given date's Vaishnava rule.
 * On Ekadashi: only recipes with occasion = 'Ekadashi' or 'Fasting' are valid!
 * Normal grain recipes (rice, dal, roti) are strictly disallowed on Ekadashi.
 */
export function validateRecipeForDate(
  recipe: Recipe,
  dateStr: string,
  location: CenterLocation = DEFAULT_CENTER_LOCATION
): { isAllowed: boolean; warning?: string } {
  const occasion = getVaishnavaOccasionForDate(dateStr, location);

  if (occasion && occasion.type === 'Ekadashi') {
    if (recipe.occasion !== 'Ekadashi' && recipe.occasion !== 'Fasting') {
      return {
        isAllowed: false,
        warning: `Forbidden on ${occasion.name}: "${recipe.name}" contains grains/pulses. Only Ekadashi-approved dishes (Sama rice, Sabudana, Potato, Fruits, Dairy) are permitted.`,
      };
    }
  }

  return { isAllowed: true };
}
