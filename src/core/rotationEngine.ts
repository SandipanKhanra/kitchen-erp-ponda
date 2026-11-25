import { FifteenDayMenuPlan, DayMenuSchedule } from '../types/menu';
import { getVaishnavaOccasionForDate, isEkadashiOrFastingDate } from './vaishnavaCalendar';

/**
 * 15-Day Menu Rotation Engine
 * Accurately determines which day of the 15-day cycle applies to any calendar date.
 */
export function calculateCycleDay(targetDate: Date, cycleStartDate: Date, totalDays = 15): number {
  // Normalize both dates to midnight UTC to prevent daylight saving / timezone drift
  const target = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
  const start = new Date(Date.UTC(cycleStartDate.getFullYear(), cycleStartDate.getMonth(), cycleStartDate.getDate()));

  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Handle positive and negative day offsets correctly
  const mod = ((diffDays % totalDays) + totalDays) % totalDays;
  return mod + 1; // 1-indexed (Day 1 through Day 15)
}

/**
 * Generates an array of consecutive dates between startDate and endDate (inclusive).
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Automatically applies a weekly (7-day) rotation schedule for Brahmacari Ashram meals across 15 days.
 * If number of dishes is less, it rotates them smoothly: Day 1-7 repeat on Day 8-14, with Day 15 continuing,
 * while automatically mapping Ekadashi-specific recipes onto Ekadashi fasting days.
 */
export function generateAshramWeeklyRotation(
  ashramRecipes: Array<{ id: string; occasion: string; mealType: string }>,
  isEkadashiDays: Record<number, boolean>
): Record<number, { breakfastRecipeIds: string[]; lunchRecipeIds: string[] }> {
  const result: Record<number, { breakfastRecipeIds: string[]; lunchRecipeIds: string[] }> = {};

  // Separate Normal vs Ekadashi Ashram recipes
  const normalBreakfast = ashramRecipes.filter(
    (r) => r.occasion === 'Normal' && (r.mealType === 'Breakfast' || r.mealType === 'Ashram Breakfast')
  );
  const normalLunch = ashramRecipes.filter(
    (r) => r.occasion === 'Normal' && (r.mealType === 'Lunch' || r.mealType === 'Ashram Lunch' || r.mealType === 'Dinner')
  );
  const ekadashiBreakfast = ashramRecipes.filter(
    (r) => r.occasion === 'Ekadashi' && (r.mealType === 'Breakfast' || r.mealType === 'Ashram Breakfast' || r.mealType === 'Dinner')
  );
  const ekadashiLunch = ashramRecipes.filter(
    (r) => r.occasion === 'Ekadashi' && (r.mealType === 'Lunch' || r.mealType === 'Ashram Lunch')
  );

  let normalBfIndex = 0;
  let normalLunchIndex = 0;
  let ekaBfIndex = 0;
  let ekaLunchIndex = 0;

  for (let d = 1; d <= 15; d++) {
    const isEkadashi = !!isEkadashiDays[d];

    if (isEkadashi) {
      const bId = ekadashiBreakfast.length > 0
        ? ekadashiBreakfast[ekaBfIndex % ekadashiBreakfast.length].id
        : ashramRecipes.find((r) => r.occasion === 'Ekadashi')?.id;
      const lId = ekadashiLunch.length > 0
        ? ekadashiLunch[ekaLunchIndex % ekadashiLunch.length].id
        : ashramRecipes.find((r) => r.occasion === 'Ekadashi')?.id;

      result[d] = {
        breakfastRecipeIds: bId ? [bId] : [],
        lunchRecipeIds: lId ? [lId] : [],
      };
      ekaBfIndex++;
      ekaLunchIndex++;
    } else {
      // Rotate on weekly cycle (7 days)
      const dayCycle = (d - 1) % 7; // 0 to 6
      const bRecipe = normalBreakfast.length > 0
        ? normalBreakfast[dayCycle % normalBreakfast.length]
        : null;
      const lRecipe = normalLunch.length > 0
        ? normalLunch[dayCycle % normalLunch.length]
        : null;

      result[d] = {
        breakfastRecipeIds: bRecipe ? [bRecipe.id] : [],
        lunchRecipeIds: lRecipe ? [lRecipe.id] : [],
      };
      normalBfIndex++;
      normalLunchIndex++;
    }
  }

  return result;
}

/**
 * Creates a clean, empty 15-Day Menu Plan structure starting from today's date
 * for a center when no existing plan is stored in Firestore yet.
 */
export function createEmpty15DayMenu(centerId: string): FifteenDayMenuPlan {
  const days: Record<number, DayMenuSchedule> = {};
  const start = new Date();
  const startDate = formatDateISO(start);

  for (let i = 0; i < 15; i++) {
    const dayNum = i + 1;
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dateStr = formatDateISO(current);
    const occasion = getVaishnavaOccasionForDate(dateStr);
    const isEkadashi = occasion?.type === 'Ekadashi';
    const isFasting = isEkadashiOrFastingDate(dateStr);

    days[dayNum] = {
      dayNumber: dayNum,
      date: dateStr,
      isEkadashi,
      isFasting,
      occasionTitle: occasion?.name,
      breakfast: { recipeIds: [], headcount: 0 },
      lunch: { recipeIds: [], headcount: 0 },
      dinner: { recipeIds: [], headcount: 0 },
      brahmacariBreakfast: { recipeIds: [], headcount: 0 },
      brahmacariLunch: { recipeIds: [], headcount: 0 },
    };
  }

  const endDate = days[15].date;
  const now = new Date().toISOString();

  return {
    id: `plan_${centerId}_cycle_1`,
    centerId,
    title: '15-Day Vaishnava Kitchen Cycle',
    startDate,
    endDate,
    status: 'draft',
    days,
    createdBy: '',
    createdByName: '',
    createdByRole: 'user',
    createdAt: now,
    updatedAt: now,
  };
}
