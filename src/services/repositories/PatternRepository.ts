import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { MenuPattern } from '../../types/recipe';
import { IPatternRepository } from '../../types/repositories';
import { INITIAL_MENU_PATTERNS } from '../mockData';
import { SafeStorage } from '../../utils/safeStorage';

export class PatternRepository implements IPatternRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_patterns_${centerId}`;
  }

  async fetchCenterPatterns(centerId: string): Promise<MenuPattern[]> {
    if (isFirebaseConfigured && db) {
      try {
        let snap = await getDocs(collection(db, 'patterns'));
        if (snap.empty) {
          snap = await getDocs(collection(db, 'centers', centerId, 'patterns'));
        }

        if (!snap.empty) {
          const items: MenuPattern[] = [];
          snap.forEach((d) => {
            const data = d.data() as MenuPattern;
            if (!data.centerId || data.centerId === centerId || data.centerId === 'all') {
              items.push(data);
            }
          });
          if (items.length > 0) {
            SafeStorage.setItem(this.getLocalKey(centerId), items);
            return items;
          }
        }

        const initial = INITIAL_MENU_PATTERNS.map((p) => ({ ...p, centerId }));
        Promise.all(
          initial.map((p) => setDoc(doc(db!, 'patterns', p.id), p, { merge: true }))
        ).catch(() => {});
        return initial;
      } catch (err) {
        console.warn('[PatternRepository] Failed to read patterns from Firestore:', err);
      }
    }

    const cached = SafeStorage.getItem<MenuPattern[] | null>(this.getLocalKey(centerId), null);
    if (cached) return cached;

    return INITIAL_MENU_PATTERNS.map((p) => ({ ...p, centerId }));
  }

  async saveCenterPattern(centerId: string, pattern: MenuPattern): Promise<void> {
    const pat: MenuPattern = { ...pattern, centerId, updatedAt: new Date().toISOString() };
    const current = await this.fetchCenterPatterns(centerId);
    const idx = current.findIndex((p) => p.id === pattern.id);
    const updated = idx >= 0 ? current.map((p) => (p.id === pattern.id ? pat : p)) : [pat, ...current];
    SafeStorage.setItem(this.getLocalKey(centerId), updated);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'patterns', pattern.id), pat, { merge: true });
      } catch (err) {
        console.warn('[PatternRepository] Failed to save pattern in Firestore:', err);
      }
    }
  }
}
