import { db, isFirebaseConfigured } from '../config/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { Recipe } from '../types/recipe';
import { INITIAL_RECIPES } from './mockData';

const COLLECTION_NAME = 'recipes';

export class RecipeService {
  private localCache: Recipe[] = [...INITIAL_RECIPES];

  async getRecipes(): Promise<Recipe[]> {
    if (!isFirebaseConfigured || !db) {
      return this.localCache;
    }

    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      if (snap.empty) {
        await this.seedInitialData();
        return this.localCache;
      }
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
    } catch (err) {
      console.warn('Falling back to local recipe cache:', err);
      return this.localCache;
    }
  }

  async saveRecipe(recipe: Recipe): Promise<void> {
    if (isFirebaseConfigured && db) {
      const ref = doc(db, COLLECTION_NAME, recipe.id);
      await setDoc(ref, recipe, { merge: true });
    }

    const idx = this.localCache.findIndex((r) => r.id === recipe.id);
    if (idx >= 0) {
      this.localCache[idx] = recipe;
    } else {
      this.localCache.push(recipe);
    }
  }

  async deleteRecipe(id: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    }
    this.localCache = this.localCache.filter((r) => r.id !== id);
  }

  private async seedInitialData(): Promise<void> {
    if (!db) return;
    for (const item of INITIAL_RECIPES) {
      await setDoc(doc(db, COLLECTION_NAME, item.id), item);
    }
  }
}

export const recipeService = new RecipeService();
