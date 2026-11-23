import { db, isFirebaseConfigured } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { MenuCycle, ProgramSlot } from '../types/menu';
import { INITIAL_MENU_CYCLE } from './mockData';

const COLLECTION_NAME = 'menu_cycles';
const DEFAULT_CYCLE_DOC_ID = 'cycle_15_days_master';

export class MenuCycleService {
  private localCache: MenuCycle = { ...INITIAL_MENU_CYCLE };

  async getCycle(cycleId = DEFAULT_CYCLE_DOC_ID): Promise<MenuCycle> {
    if (!isFirebaseConfigured || !db) {
      return this.localCache;
    }

    try {
      const snap = await getDoc(doc(db, COLLECTION_NAME, cycleId));
      if (!snap.exists()) {
        await this.saveCycle(this.localCache);
        return this.localCache;
      }
      return { id: snap.id, ...snap.data() } as MenuCycle;
    } catch (err) {
      console.warn('Falling back to local cycle cache:', err);
      return this.localCache;
    }
  }

  async saveCycle(cycle: MenuCycle): Promise<void> {
    if (isFirebaseConfigured && db) {
      const ref = doc(db, COLLECTION_NAME, cycle.id);
      await setDoc(ref, cycle, { merge: true });
    }
    this.localCache = { ...cycle, updatedAt: new Date().toISOString() };
  }

  async updateDayPrograms(dayNumber: number, programs: ProgramSlot[]): Promise<void> {
    const updatedDays = {
      ...this.localCache.days,
      [dayNumber]: {
        ...this.localCache.days[dayNumber],
        programs,
      },
    };

    const updatedCycle: MenuCycle = {
      ...this.localCache,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    await this.saveCycle(updatedCycle);
  }
}

export const menuCycleService = new MenuCycleService();
