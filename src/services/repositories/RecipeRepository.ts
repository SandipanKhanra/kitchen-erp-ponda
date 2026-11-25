import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { Recipe } from '../../types/recipe';
import { IRecipeRepository } from '../../types/repositories';
import { SafeStorage } from '../../utils/safeStorage';

export class RecipeRepository implements IRecipeRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_recipes_${centerId}`;
  }

  async fetchCenterRecipes(centerId: string): Promise<Recipe[]> {
    if (!centerId) return [];

    if (isFirebaseConfigured && db) {
      try {
        let snap = await getDocs(collection(db, 'recipes'));
        if (snap.empty) {
          snap = await getDocs(collection(db, 'centers', centerId, 'recipes'));
        }

        if (!snap.empty) {
          const items: Recipe[] = [];
          snap.forEach((d) => {
            const data = d.data() as Recipe;
            if (!data.centerId || data.centerId === centerId || data.centerId === 'all') {
              items.push(data);
            }
          });

          SafeStorage.setItem(this.getLocalKey(centerId), items);
          return items;
        }
        return [];
      } catch (err) {
        console.warn(`[RecipeRepository] Firestore read failed for center ${centerId}, falling back to cache:`, err);
      }
    }

    return SafeStorage.getItem<Recipe[]>(this.getLocalKey(centerId), []);
  }

  async saveCenterRecipe(centerId: string, recipe: Recipe): Promise<void> {
    if (!centerId) return;
    const recipeWithCenter: Recipe = {
      ...recipe,
      centerId,
      updatedAt: new Date().toISOString(),
    };

    const current = await this.fetchCenterRecipes(centerId);
    const idx = current.findIndex((r) => r.id === recipe.id);
    const updated =
      idx >= 0
        ? current.map((r) => (r.id === recipe.id ? recipeWithCenter : r))
        : [recipeWithCenter, ...current];
    SafeStorage.setItem(this.getLocalKey(centerId), updated);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'recipes', recipe.id), recipeWithCenter, { merge: true });
      } catch (err) {
        console.warn('[RecipeRepository] Failed to sync recipe to Firestore:', err);
      }
    }
  }

  async deleteCenterRecipe(centerId: string, recipeId: string): Promise<void> {
    if (!centerId) return;
    const current = await this.fetchCenterRecipes(centerId);
    const updated = current.filter((r) => r.id !== recipeId);
    SafeStorage.setItem(this.getLocalKey(centerId), updated);

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'recipes', recipeId));
      } catch (err) {
        console.warn('[RecipeRepository] Failed to delete recipe in Firestore:', err);
      }
    }
  }
}
