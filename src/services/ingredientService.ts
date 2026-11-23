import { db, isFirebaseConfigured } from '../config/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { Ingredient } from '../types/ingredient';
import { INITIAL_INGREDIENTS } from './mockData';

const COLLECTION_NAME = 'ingredients';

export class IngredientService {
  private localCache: Ingredient[] = [...INITIAL_INGREDIENTS];

  async getIngredients(): Promise<Ingredient[]> {
    if (!isFirebaseConfigured || !db) {
      return this.localCache;
    }

    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (snap.empty) {
        // Seed initial data if collection is completely fresh
        await this.seedInitialData();
        return this.localCache;
      }
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ingredient));
    } catch (err) {
      console.warn('Falling back to local ingredient cache:', err);
      return this.localCache;
    }
  }

  async updateIngredientRate(id: string, newRate: number): Promise<void> {
    if (isFirebaseConfigured && db) {
      const ref = doc(db, COLLECTION_NAME, id);
      await updateDoc(ref, {
        currentRate: newRate,
        updatedAt: new Date().toISOString(),
      });
    }

    // Sync local cache
    this.localCache = this.localCache.map((item) =>
      item.id === id
        ? { ...item, currentRate: newRate, updatedAt: new Date().toISOString() }
        : item
    );
  }

  async updateIngredientStock(id: string, newStock: number): Promise<void> {
    if (isFirebaseConfigured && db) {
      const ref = doc(db, COLLECTION_NAME, id);
      await updateDoc(ref, {
        currentStock: newStock,
        updatedAt: new Date().toISOString(),
      });
    }

    this.localCache = this.localCache.map((item) =>
      item.id === id
        ? { ...item, currentStock: newStock, updatedAt: new Date().toISOString() }
        : item
    );
  }

  async saveIngredient(ingredient: Ingredient): Promise<void> {
    if (isFirebaseConfigured && db) {
      const ref = doc(db, COLLECTION_NAME, ingredient.id);
      await setDoc(ref, ingredient, { merge: true });
    }

    const idx = this.localCache.findIndex((i) => i.id === ingredient.id);
    if (idx >= 0) {
      this.localCache[idx] = ingredient;
    } else {
      this.localCache.push(ingredient);
    }
  }

  async deleteIngredient(id: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    }
    this.localCache = this.localCache.filter((i) => i.id !== id);
  }

  private async seedInitialData(): Promise<void> {
    if (!db) return;
    for (const item of INITIAL_INGREDIENTS) {
      await setDoc(doc(db, COLLECTION_NAME, item.id), item);
    }
  }
}

export const ingredientService = new IngredientService();
