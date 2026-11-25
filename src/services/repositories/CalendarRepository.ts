import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { VaishnavaOccasion } from '../../types/vaishnavaCalendar';
import { SafeStorage } from '../../utils/safeStorage';

export class CalendarRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_calendar_${centerId}`;
  }

  async fetchCenterCalendarOccasions(centerId: string): Promise<VaishnavaOccasion[]> {
    if (!centerId) return [];

    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, 'vaishnava_calendar'), where('centerId', '==', centerId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as VaishnavaOccasion);
          SafeStorage.setItem(this.getLocalKey(centerId), list);
          return list;
        }
      } catch (err) {
        console.warn('[CalendarRepository] Failed to fetch from Firestore:', err);
      }
    }

    return SafeStorage.getItem<VaishnavaOccasion[]>(this.getLocalKey(centerId), []);
  }

  async syncCenterCalendarOccasions(centerId: string, occasions: VaishnavaOccasion[]): Promise<void> {
    if (!centerId) return;
    SafeStorage.setItem(this.getLocalKey(centerId), occasions);

    if (isFirebaseConfigured && db) {
      try {
        await Promise.all(
          occasions.map((occ) =>
            setDoc(
              doc(db!, 'vaishnava_calendar', `${centerId}_${occ.date}`),
              {
                ...occ,
                centerId,
                syncedAt: new Date().toISOString(),
              },
              { merge: true }
            )
          )
        );
      } catch (err) {
        console.warn('[CalendarRepository] Failed to sync occasions to Firestore:', err);
      }
    }
  }
}

export const calendarRepository = new CalendarRepository();
