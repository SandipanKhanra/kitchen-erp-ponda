import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { IngredientStockItem } from '../../types/stock';
import { IStockRepository } from '../../types/repositories';
import { INITIAL_STOCK_ITEMS } from '../mockData';
import { SafeStorage } from '../../utils/safeStorage';

export class StockRepository implements IStockRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_stock_${centerId}`;
  }

  async fetchCenterStock(centerId: string): Promise<IngredientStockItem[]> {
    if (isFirebaseConfigured && db) {
      try {
        let snap = await getDocs(collection(db, 'ingredients'));
        if (snap.empty) {
          snap = await getDocs(collection(db, 'centers', centerId, 'stock'));
        }

        if (!snap.empty) {
          const items: IngredientStockItem[] = [];
          snap.forEach((d) => {
            const data = d.data() as IngredientStockItem;
            if (!data.centerId || data.centerId === centerId || data.centerId === 'all') {
              items.push(data);
            }
          });

          if (items.length > 0) {
            SafeStorage.setItem(this.getLocalKey(centerId), items);
            return items;
          }
        }

        // Seed initial stock to Firestore if empty
        const initialForCenter = INITIAL_STOCK_ITEMS.map((item) => ({
          ...item,
          centerId,
        }));

        Promise.all(
          initialForCenter.map((item) =>
            setDoc(doc(db!, 'ingredients', item.id), item, { merge: true })
          )
        ).catch((err) => console.warn('[StockRepository] Could not seed ingredients:', err));

        return initialForCenter;
      } catch (err) {
        console.warn(`[StockRepository] Firestore read failed for center ${centerId}, falling back to cache:`, err);
      }
    }

    const cached = SafeStorage.getItem<IngredientStockItem[] | null>(this.getLocalKey(centerId), null);
    if (cached) return cached;

    return INITIAL_STOCK_ITEMS.map((i) => ({ ...i, centerId }));
  }

  async saveCenterStockItem(centerId: string, item: IngredientStockItem): Promise<void> {
    const itemWithCenter: IngredientStockItem = {
      ...item,
      centerId,
      updatedAt: new Date().toISOString(),
    };

    const current = await this.fetchCenterStock(centerId);
    const idx = current.findIndex((s) => s.id === item.id);
    const updated =
      idx >= 0
        ? current.map((s) => (s.id === item.id ? itemWithCenter : s))
        : [itemWithCenter, ...current];
    SafeStorage.setItem(this.getLocalKey(centerId), updated);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'ingredients', item.id), itemWithCenter, { merge: true });
      } catch (err) {
        console.warn('[StockRepository] Failed to sync ingredient to Firestore:', err);
      }
    }
  }
}
