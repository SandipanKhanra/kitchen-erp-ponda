import { FifteenDayMenuPlan, DayMenuSchedule } from '../types/menu';
import { Recipe } from '../types/recipe';
import { IngredientStockItem } from '../types/stock';
import { CenterLocation } from '../types/vaishnavaCalendar';
import {
  ConsolidatedShoppingItem,
  DayRequirement,
  PeriodRequirementSummary,
} from '../types/requisition';
import {
  addDaysISO,
  formatDateISO,
  generateFull15DayMenuFromStartDate,
} from './rotationEngine';
import { getVaishnavaOccasionForDate, isEkadashiOrFastingDate } from './vaishnavaCalendar';
import { calculateDayWiseAndShoppingRequirements } from './daywiseRequirementCalculator';
import { roundKitchenQuantity } from './unitConverter';
import { formatDateDDMMYYYY } from '../utils/formatters';

export const MAX_ADVANCE_PLANS = 6;
export const MAX_ADVANCE_MONTHS = 3;

export type PlanTimingStatus = 'current' | 'upcoming' | 'past';

export interface PlanOverlapConflict {
  plan: FifteenDayMenuPlan;
  overlapStart: string;
  overlapEnd: string;
  overlapDays: number;
}

export interface PlanValidationResult {
  isValid: boolean;
  reason?: string;
  conflicts: PlanOverlapConflict[];
  exceedsPlanLimit: boolean;
  exceedsHorizonLimit: boolean;
  maxAdvanceStartDate: string;
  suggestedStartDate: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a YYYY-MM-DD string into UTC epoch milliseconds (midnight UTC).
 */
export function parseISODateUTC(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateStr || '').trim());
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Difference in calendar days (end - start) using UTC dates.
 */
export function diffDaysISO(startDateStr: string, endDateStr: string): number {
  const s = parseISODateUTC(startDateStr);
  const e = parseISODateUTC(endDateStr);
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

/**
 * Add whole calendar months to a YYYY-MM-DD string, clamping day-of-month if shorter
 * (e.g., Nov 30 + 3 months -> Feb 28/29).
 */
export function addMonthsISO(startDateStr: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((startDateStr || '').trim());
  const base = m
    ? { y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]) }
    : (() => {
        const now = new Date();
        return { y: now.getFullYear(), mo: now.getMonth(), d: now.getDate() };
      })();

  const targetMonthIndex = base.mo + months;
  const targetYear = base.y + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(base.d, lastDayOfTargetMonth);

  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export function getMaxAdvanceStartDateISO(todayISO = formatDateISO(new Date())): string {
  return addMonthsISO(todayISO, MAX_ADVANCE_MONTHS);
}

/**
 * Check whether two inclusive date ranges [startA, endA] and [startB, endB] overlap.
 */
export function getDateRangeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): { overlapStart: string; overlapEnd: string; overlapDays: number } | null {
  if (!ISO_DATE_RE.test(startA) || !ISO_DATE_RE.test(endA) || !ISO_DATE_RE.test(startB) || !ISO_DATE_RE.test(endB)) {
    return null;
  }
  if (startA > endB || startB > endA) return null;
  const overlapStart = startA > startB ? startA : startB;
  const overlapEnd = endA < endB ? endA : endB;
  const overlapDays = Math.max(1, diffDaysISO(overlapStart, overlapEnd) + 1);
  return { overlapStart, overlapEnd, overlapDays };
}

/**
 * Find all plans in `plans` whose 15-day window overlaps `[startDate, endDate]`.
 */
export function findOverlappingPlans(
  startDate: string,
  endDate: string,
  plans: FifteenDayMenuPlan[],
  excludePlanId?: string
): PlanOverlapConflict[] {
  const conflicts: PlanOverlapConflict[] = [];
  for (const plan of plans) {
    if (excludePlanId && plan.id === excludePlanId) continue;
    const pStart = plan.startDate;
    const pEnd = plan.endDate || addDaysISO(plan.startDate, 14);
    const overlap = getDateRangeOverlap(startDate, endDate, pStart, pEnd);
    if (overlap) {
      conflicts.push({ plan, ...overlap });
    }
  }
  return conflicts.sort((a, b) => a.plan.startDate.localeCompare(b.plan.startDate));
}

export function getPlanTimingStatus(
  plan: FifteenDayMenuPlan,
  todayISO = formatDateISO(new Date())
): PlanTimingStatus {
  const start = plan.startDate;
  const end = plan.endDate || addDaysISO(start, 14);
  if (end < todayISO) return 'past';
  if (start <= todayISO && todayISO <= end) return 'current';
  return 'upcoming';
}

/**
 * Plans that are currently running or scheduled in the future (counted toward the 6-plan advance limit).
 */
export function getActiveOrUpcomingPlans(
  plans: FifteenDayMenuPlan[],
  todayISO = formatDateISO(new Date())
): FifteenDayMenuPlan[] {
  return plans.filter((p) => (p.endDate || addDaysISO(p.startDate, 14)) >= todayISO);
}

export function sortMenuPlansChronologically(plans: FifteenDayMenuPlan[]): FifteenDayMenuPlan[] {
  return [...plans].sort((a, b) => {
    const startCmp = (a.startDate || '').localeCompare(b.startDate || '');
    if (startCmp !== 0) return startCmp;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });
}

/**
 * Pick the most relevant plan to display by default:
 * 1. Currently live cycle (today inside [startDate, endDate]), preferring approved
 * 2. Nearest upcoming cycle
 * 3. Most recent past cycle
 */
export function selectDefaultActivePlan(
  plans: FifteenDayMenuPlan[],
  todayISO = formatDateISO(new Date())
): FifteenDayMenuPlan | undefined {
  if (!plans || plans.length === 0) return undefined;

  const current = plans.filter((p) => getPlanTimingStatus(p, todayISO) === 'current');
  if (current.length > 0) {
    const rank = (s: FifteenDayMenuPlan['status']) =>
      s === 'approved' ? 0 : s === 'pending_approval' ? 1 : s === 'draft' ? 2 : 3;
    return [...current].sort((a, b) => rank(a.status) - rank(b.status))[0];
  }

  const upcoming = sortMenuPlansChronologically(
    plans.filter((p) => getPlanTimingStatus(p, todayISO) === 'upcoming')
  );
  if (upcoming.length > 0) return upcoming[0];

  const sorted = sortMenuPlansChronologically(plans);
  return sorted[sorted.length - 1];
}

/**
 * Find the earliest non-overlapping 15-day start date starting from `preferredStartISO`
 * (or the day after the latest active/upcoming plan if no preferred date is passed).
 */
export function getNextAvailableStartDate(
  plans: FifteenDayMenuPlan[],
  preferredStartISO?: string,
  excludePlanId?: string,
  todayISO = formatDateISO(new Date())
): string {
  const otherPlans = sortMenuPlansChronologically(
    plans.filter((p) => !excludePlanId || p.id !== excludePlanId)
  );

  let candidate = preferredStartISO && ISO_DATE_RE.test(preferredStartISO)
    ? preferredStartISO
    : todayISO;

  if (!preferredStartISO) {
    const relevant = otherPlans.filter((p) => (p.endDate || addDaysISO(p.startDate, 14)) >= todayISO);
    if (relevant.length > 0) {
      const latest = relevant[relevant.length - 1];
      candidate = addDaysISO(latest.endDate || addDaysISO(latest.startDate, 14), 1);
    }
  }

  // Advance past any overlapping intervals
  for (let guard = 0; guard < 30; guard++) {
    const candidateEnd = addDaysISO(candidate, 14);
    const conflicts = findOverlappingPlans(candidate, candidateEnd, otherPlans);
    if (conflicts.length === 0) {
      return candidate;
    }
    const latestConflictEnd = conflicts.reduce(
      (maxEnd, c) => {
        const cEnd = c.plan.endDate || addDaysISO(c.plan.startDate, 14);
        return cEnd > maxEnd ? cEnd : maxEnd;
      },
      candidate
    );
    candidate = addDaysISO(latestConflictEnd, 1);
  }

  return candidate;
}

/**
 * Validate whether a new or edited plan schedule satisfies:
 * 1. Valid YYYY-MM-DD startDate
 * 2. Max 6 active/upcoming plans per center (when creating a new active/upcoming plan)
 * 3. Start date within 3 months advance horizon (today + 3 months)
 * 4. Zero date overlap with any other plan in the center
 */
export function validatePlanSchedule(params: {
  startDate: string;
  plans: FifteenDayMenuPlan[];
  excludePlanId?: string;
  isNewPlan: boolean;
  todayISO?: string;
}): PlanValidationResult {
  const todayISO = params.todayISO || formatDateISO(new Date());
  const maxAdvanceStartDate = getMaxAdvanceStartDateISO(todayISO);
  const suggestedStartDate = getNextAvailableStartDate(
    params.plans,
    params.isNewPlan ? undefined : params.startDate,
    params.excludePlanId,
    todayISO
  );

  if (!params.startDate || !ISO_DATE_RE.test(params.startDate)) {
    return {
      isValid: false,
      reason: 'Please choose a valid start date.',
      conflicts: [],
      exceedsPlanLimit: false,
      exceedsHorizonLimit: false,
      maxAdvanceStartDate,
      suggestedStartDate,
    };
  }

  const endDate = addDaysISO(params.startDate, 14);
  const activeUpcoming = getActiveOrUpcomingPlans(params.plans, todayISO);
  const exceedsPlanLimit =
    params.isNewPlan &&
    endDate >= todayISO &&
    activeUpcoming.length >= MAX_ADVANCE_PLANS;

  const exceedsHorizonLimit = params.startDate > maxAdvanceStartDate;
  const conflicts = findOverlappingPlans(
    params.startDate,
    endDate,
    params.plans,
    params.excludePlanId
  );

  let reason: string | undefined;
  if (exceedsPlanLimit) {
    reason = `Maximum ${MAX_ADVANCE_PLANS} active/upcoming plans allowed per center. Delete an unused draft or wait for a cycle to complete.`;
  } else if (exceedsHorizonLimit) {
    reason = `Advance planning is limited to ${MAX_ADVANCE_MONTHS} months ahead (latest start date: ${formatDateDDMMYYYY(maxAdvanceStartDate)}).`;
  } else if (conflicts.length > 0) {
    const first = conflicts[0];
    reason = `Overlaps ${first.overlapDays} day(s) (${formatDateDDMMYYYY(first.overlapStart)} to ${formatDateDDMMYYYY(first.overlapEnd)}) with "${first.plan.title}".`;
  }

  return {
    isValid: !exceedsPlanLimit && !exceedsHorizonLimit && conflicts.length === 0,
    reason,
    conflicts,
    exceedsPlanLimit,
    exceedsHorizonLimit,
    maxAdvanceStartDate,
    suggestedStartDate,
  };
}

export function formatCycleTitle(startDate: string, endDate?: string): string {
  const s = addDaysISO(startDate, 0);
  const e = endDate || addDaysISO(s, 14);
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    });
  };
  return `${fmt(s)} – ${fmt(e)} Cycle`;
}

/**
 * Build a fresh 15-day menu plan either auto-filled, copied from an existing plan, or blank.
 */
export function buildNewMenuPlan(params: {
  centerId: string;
  startDate: string;
  title?: string;
  createdBy: string;
  createdByName: string;
  createdByRole: 'user' | 'admin' | 'sadmin';
  mode: 'autofill' | 'copy' | 'blank';
  recipes: Recipe[];
  location?: CenterLocation;
  sourcePlan?: FifteenDayMenuPlan;
}): FifteenDayMenuPlan {
  const startDate = addDaysISO(params.startDate, 0);
  const endDate = addDaysISO(startDate, 14);
  const now = new Date().toISOString();
  const planId = `plan_${params.centerId}_${startDate.replace(/-/g, '')}_${Date.now().toString(36)}`;
  const title = (params.title || '').trim() || formatCycleTitle(startDate, endDate);

  const days: Record<number, DayMenuSchedule> = {};
  for (let i = 0; i < 15; i++) {
    const dayNum = i + 1;
    const dateStr = addDaysISO(startDate, i);
    const occasion = getVaishnavaOccasionForDate(dateStr, params.location);
    const isEkadashi = occasion?.type === 'Ekadashi';
    const isFasting = isEkadashiOrFastingDate(dateStr, params.location);
    const srcDay = params.mode === 'copy' ? params.sourcePlan?.days?.[dayNum] : undefined;

    days[dayNum] = {
      dayNumber: dayNum,
      date: dateStr,
      isEkadashi,
      isFasting,
      occasionTitle: occasion?.name,
      breakfast: srcDay
        ? { recipeIds: [...(srcDay.breakfast?.recipeIds || [])], headcount: srcDay.breakfast?.headcount ?? 100 }
        : { recipeIds: [], headcount: 100 },
      lunch: srcDay
        ? { recipeIds: [...(srcDay.lunch?.recipeIds || [])], headcount: srcDay.lunch?.headcount ?? 150 }
        : { recipeIds: [], headcount: 150 },
      dinner: srcDay
        ? { recipeIds: [...(srcDay.dinner?.recipeIds || [])], headcount: srcDay.dinner?.headcount ?? 110 }
        : { recipeIds: [], headcount: 110 },
      brahmacariBreakfast: srcDay?.brahmacariBreakfast
        ? {
            recipeIds: [...(srcDay.brahmacariBreakfast.recipeIds || [])],
            headcount: srcDay.brahmacariBreakfast.headcount ?? 20,
          }
        : { recipeIds: [], headcount: 20 },
      brahmacariLunch: srcDay?.brahmacariLunch
        ? {
            recipeIds: [...(srcDay.brahmacariLunch.recipeIds || [])],
            headcount: srcDay.brahmacariLunch.headcount ?? 20,
          }
        : { recipeIds: [], headcount: 20 },
    };
  }

  const basePlan: FifteenDayMenuPlan = {
    id: planId,
    centerId: params.centerId,
    title,
    startDate,
    endDate,
    status: 'draft',
    days,
    createdBy: params.createdBy,
    createdByName: params.createdByName,
    createdByRole: params.createdByRole,
    createdAt: now,
    updatedAt: now,
  };

  if (params.mode === 'autofill') {
    const filled = generateFull15DayMenuFromStartDate(
      startDate,
      params.recipes,
      basePlan,
      params.location
    );
    return {
      ...filled,
      id: planId,
      title,
      status: 'draft',
      approvedBy: undefined,
      approvedByName: undefined,
      approvedAt: undefined,
      rejectionReason: undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  return basePlan;
}

/**
 * Aggregate day-wise requirements and consolidated shopping list across one or more plans
 * (e.g., 2 plans for a full month, or up to 6 plans for 3 months bulk procurement).
 */
export function calculateMultiPlanRequirements(
  plans: FifteenDayMenuPlan[],
  recipeMap: Map<string, Recipe>,
  stockMap: Map<string, IngredientStockItem>
): PeriodRequirementSummary {
  const ordered = sortMenuPlansChronologically(plans);
  if (ordered.length === 0) {
    const today = formatDateISO(new Date());
    return {
      centerId: '',
      startDate: today,
      endDate: today,
      dailyRequirements: [],
      shoppingList: [],
      totalMenuCost: 0,
      totalNetProcurementCost: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  if (ordered.length === 1) {
    return calculateDayWiseAndShoppingRequirements(ordered[0], recipeMap, stockMap);
  }

  const dailyRequirements: DayRequirement[] = [];
  const cumulativeDemandMap = new Map<string, number>();
  let totalMenuCost = 0;

  ordered.forEach((plan) => {
    const summary = calculateDayWiseAndShoppingRequirements(plan, recipeMap, stockMap);
    totalMenuCost += summary.totalMenuCost;
    summary.dailyRequirements.forEach((dr) => {
      dailyRequirements.push(dr);
    });
    summary.shoppingList.forEach((item) => {
      cumulativeDemandMap.set(
        item.ingredientId,
        (cumulativeDemandMap.get(item.ingredientId) || 0) + item.totalPeriodDemand
      );
    });
  });

  dailyRequirements.sort((a, b) => a.date.localeCompare(b.date));

  const shoppingList: ConsolidatedShoppingItem[] = [];
  let totalNetProcurementCost = 0;

  cumulativeDemandMap.forEach((totalDemand, ingId) => {
    const stockItem = stockMap.get(ingId);
    if (!stockItem) return;

    const measure = stockItem.measureIndex;
    const roundedDemand = roundKitchenQuantity(totalDemand, measure);
    const currentStock = roundKitchenQuantity(stockItem.currentStock, measure);
    const rawNet = Math.max(0, roundedDemand - currentStock);
    const netToPurchase = rawNet > 0 ? roundKitchenQuantity(rawNet, measure) : 0;
    const estimatedPurchaseCost = Math.round(netToPurchase * stockItem.price * 100) / 100;

    totalNetProcurementCost += estimatedPurchaseCost;

    shoppingList.push({
      ingredientId: ingId,
      name: stockItem.name,
      brand: stockItem.brand,
      category: stockItem.category,
      measureIndex: stockItem.measureIndex,
      totalPeriodDemand: roundedDemand,
      currentStock,
      netToPurchase,
      currentPrice: stockItem.price,
      estimatedPurchaseCost,
    });
  });

  shoppingList.sort((a, b) => a.name.localeCompare(b.name));

  return {
    centerId: ordered[0].centerId,
    startDate: ordered[0].startDate,
    endDate: ordered[ordered.length - 1].endDate,
    dailyRequirements,
    shoppingList,
    totalMenuCost: Math.round(totalMenuCost * 100) / 100,
    totalNetProcurementCost: Math.round(totalNetProcurementCost * 100) / 100,
    generatedAt: new Date().toISOString(),
  };
}
