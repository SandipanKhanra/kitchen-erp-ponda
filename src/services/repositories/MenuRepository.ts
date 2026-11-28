import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { FifteenDayMenuPlan } from '../../types/menu';
import { IMenuRepository } from '../../types/repositories';
import { addDaysISO, createEmpty15DayMenu } from '../../core/rotationEngine';
import { selectDefaultActivePlan, sortMenuPlansChronologically } from '../../core/menuPlanUtils';
import { SafeStorage } from '../../utils/safeStorage';

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        result[k] = stripUndefined(v);
      }
    }
    return result as T;
  }
  return value;
}

function normalizeMenuPlanDates(plan: FifteenDayMenuPlan): FifteenDayMenuPlan {
  if (!plan?.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(plan.startDate.trim())) {
    return plan;
  }
  const startDate = addDaysISO(plan.startDate, 0);
  const endDate = addDaysISO(startDate, 14);
  const normalizedDays = { ...plan.days };
  for (let i = 1; i <= 15; i++) {
    if (normalizedDays[i]) {
      normalizedDays[i] = {
        ...normalizedDays[i],
        dayNumber: i,
        date: addDaysISO(startDate, i - 1),
      };
    }
  }
  return {
    ...plan,
    startDate,
    endDate,
    days: normalizedDays,
  };
}

export class MenuRepository implements IMenuRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_menu_${centerId}`;
  }

  private getLocalListKey(centerId: string): string {
    return `kitchen_menus_${centerId}`;
  }

  async fetchCenterMenuPlans(centerId: string): Promise<FifteenDayMenuPlan[]> {
    if (!centerId) return [createEmpty15DayMenu('default')];

    if (isFirebaseConfigured && db) {
      try {
        let snap = await getDocs(collection(db, 'menus'));
        if (snap.empty) {
          snap = await getDocs(collection(db, 'centers', centerId, 'menus'));
        }

        if (!snap.empty) {
          const exactMatches: FifteenDayMenuPlan[] = [];
          const sharedTemplates: FifteenDayMenuPlan[] = [];

          snap.forEach((d) => {
            const data = d.data() as FifteenDayMenuPlan;
            if (data.centerId === centerId) {
              exactMatches.push(normalizeMenuPlanDates({ ...data, id: data.id || d.id }));
            } else if (data.centerId === 'all') {
              sharedTemplates.push(normalizeMenuPlanDates({ ...data, id: data.id || d.id }));
            }
          });

          const sourceList =
            exactMatches.length > 0
              ? exactMatches
              : sharedTemplates.map((p, idx) => ({
                  ...p,
                  id: `plan_${centerId}_cycle_${idx + 1}`,
                  centerId,
                }));
          if (sourceList.length > 0) {
            const sorted = sortMenuPlansChronologically(sourceList);
            SafeStorage.setItem(this.getLocalListKey(centerId), sorted);
            const primary = selectDefaultActivePlan(sorted) || sorted[0];
            SafeStorage.setItem(this.getLocalKey(centerId), primary);
            return sorted;
          }
        }
      } catch (err) {
        console.warn('[MenuRepository] Failed to fetch menu plans from Firestore:', err);
      }
    }

    const cachedList = SafeStorage.getItem<FifteenDayMenuPlan[] | null>(
      this.getLocalListKey(centerId),
      null
    );
    if (cachedList && cachedList.length > 0) {
      return sortMenuPlansChronologically(cachedList.map(normalizeMenuPlanDates));
    }

    const cachedSingle = SafeStorage.getItem<FifteenDayMenuPlan | null>(
      this.getLocalKey(centerId),
      null
    );
    if (cachedSingle) {
      return [normalizeMenuPlanDates(cachedSingle)];
    }

    return [createEmpty15DayMenu(centerId)];
  }

  async fetchCenterMenuPlan(centerId: string): Promise<FifteenDayMenuPlan> {
    const plans = await this.fetchCenterMenuPlans(centerId);
    return selectDefaultActivePlan(plans) || plans[0] || createEmpty15DayMenu(centerId || 'default');
  }

  async saveCenterMenuPlan(centerId: string, plan: FifteenDayMenuPlan): Promise<void> {
    if (!centerId) return;
    const planWithCenter = stripUndefined<FifteenDayMenuPlan>(
      normalizeMenuPlanDates({
        ...plan,
        centerId,
        updatedAt: new Date().toISOString(),
      })
    );

    const cachedList = SafeStorage.getItem<FifteenDayMenuPlan[]>(
      this.getLocalListKey(centerId),
      []
    );
    const idx = cachedList.findIndex((p) => p.id === planWithCenter.id);
    const updatedList =
      idx >= 0
        ? cachedList.map((p) => (p.id === planWithCenter.id ? planWithCenter : p))
        : [...cachedList, planWithCenter];
    const sorted = sortMenuPlansChronologically(updatedList);
    SafeStorage.setItem(this.getLocalListKey(centerId), sorted);
    SafeStorage.setItem(this.getLocalKey(centerId), planWithCenter);

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'menus', planWithCenter.id), planWithCenter);
    }
  }

  async deleteCenterMenuPlan(centerId: string, planId: string): Promise<void> {
    if (!centerId || !planId) return;
    const cachedList = SafeStorage.getItem<FifteenDayMenuPlan[]>(
      this.getLocalListKey(centerId),
      []
    );
    const remaining = sortMenuPlansChronologically(cachedList.filter((p) => p.id !== planId));
    SafeStorage.setItem(this.getLocalListKey(centerId), remaining);
    if (remaining.length > 0) {
      SafeStorage.setItem(this.getLocalKey(centerId), selectDefaultActivePlan(remaining) || remaining[0]);
    }

    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'menus', planId));
    }
  }
}
