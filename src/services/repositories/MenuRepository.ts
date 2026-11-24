import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { FifteenDayMenuPlan } from '../../types/menu';
import { IMenuRepository } from '../../types/repositories';
import { buildInitial15DayMenu } from '../mockData';
import { SafeStorage } from '../../utils/safeStorage';

export class MenuRepository implements IMenuRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_menu_${centerId}`;
  }

  async fetchCenterMenuPlan(centerId: string): Promise<FifteenDayMenuPlan> {
    if (isFirebaseConfigured && db) {
      try {
        let snap = await getDocs(collection(db, 'menus'));
        if (snap.empty) {
          snap = await getDocs(collection(db, 'centers', centerId, 'menus'));
        }

        if (!snap.empty) {
          let docData: FifteenDayMenuPlan | null = null;
          snap.forEach((d) => {
            const data = d.data() as FifteenDayMenuPlan;
            if (!docData && (data.centerId === centerId || data.centerId === 'all')) {
              docData = data;
            }
          });
          if (!docData) {
            docData = snap.docs[0].data() as FifteenDayMenuPlan;
          }
          SafeStorage.setItem(this.getLocalKey(centerId), docData);
          return docData;
        }

        const initialPlan = buildInitial15DayMenu(centerId);
        setDoc(doc(db, 'menus', initialPlan.id), initialPlan, { merge: true }).catch(() => {});
        SafeStorage.setItem(this.getLocalKey(centerId), initialPlan);
        return initialPlan;
      } catch (err) {
        console.warn('[MenuRepository] Failed to fetch menu plan from Firestore:', err);
      }
    }

    const cached = SafeStorage.getItem<FifteenDayMenuPlan | null>(this.getLocalKey(centerId), null);
    if (cached) return cached;

    return buildInitial15DayMenu(centerId);
  }

  async saveCenterMenuPlan(centerId: string, plan: FifteenDayMenuPlan): Promise<void> {
    const planWithCenter: FifteenDayMenuPlan = {
      ...plan,
      centerId,
      updatedAt: new Date().toISOString(),
    };
    SafeStorage.setItem(this.getLocalKey(centerId), planWithCenter);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'menus', plan.id), planWithCenter, { merge: true });
      } catch (err) {
        console.warn('[MenuRepository] Failed to save menu plan in Firestore:', err);
      }
    }
  }
}
