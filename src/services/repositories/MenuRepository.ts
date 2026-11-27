import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { FifteenDayMenuPlan } from '../../types/menu';
import { IMenuRepository } from '../../types/repositories';
import { addDaysISO, createEmpty15DayMenu } from '../../core/rotationEngine';
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

  async fetchCenterMenuPlan(centerId: string): Promise<FifteenDayMenuPlan> {
    if (!centerId) return createEmpty15DayMenu('default');

    if (isFirebaseConfigured && db) {
      try {
        let snap = await getDocs(collection(db, 'menus'));
        if (snap.empty) {
          snap = await getDocs(collection(db, 'centers', centerId, 'menus'));
        }

        if (!snap.empty) {
          const candidates: FifteenDayMenuPlan[] = [];
          snap.forEach((d) => {
            const data = d.data() as FifteenDayMenuPlan;
            if (data.centerId === centerId || data.centerId === 'all') {
              candidates.push({ ...data, id: data.id || d.id });
            }
          });

          if (candidates.length > 0) {
            // Prefer exact centerId match and latest updatedAt
            candidates.sort((a, b) => {
              const aExact = a.centerId === centerId ? 1 : 0;
              const bExact = b.centerId === centerId ? 1 : 0;
              if (aExact !== bExact) return bExact - aExact;
              return (b.updatedAt || '').localeCompare(a.updatedAt || '');
            });
            const docData = normalizeMenuPlanDates(candidates[0]);
            SafeStorage.setItem(this.getLocalKey(centerId), docData);
            return docData;
          }
        }
      } catch (err) {
        console.warn('[MenuRepository] Failed to fetch menu plan from Firestore:', err);
      }
    }

    const cached = SafeStorage.getItem<FifteenDayMenuPlan | null>(this.getLocalKey(centerId), null);
    if (cached) return normalizeMenuPlanDates(cached);

    return createEmpty15DayMenu(centerId);
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
    SafeStorage.setItem(this.getLocalKey(centerId), planWithCenter);

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'menus', plan.id), planWithCenter);
    }
  }
}
