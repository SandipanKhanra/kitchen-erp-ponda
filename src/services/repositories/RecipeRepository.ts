import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { Recipe } from '../../types/recipe';
import { IRecipeRepository } from '../../types/repositories';
import { INITIAL_RECIPES } from '../mockData';
import { SafeStorage } from '../../utils/safeStorage';

export class RecipeRepository implements IRecipeRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_recipes_${centerId}`;
  }

  async fetchCenterRecipes(centerId: string): Promise<Recipe[]> {
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

          // Backfill missing Ashram recipes if any
          const existingIds = new Set(items.map((i) => i.id));
          const missingAshram = INITIAL_RECIPES.filter(
            (r) => r.isAshramSpecific && !existingIds.has(r.id)
          ).map((r) => ({ ...r, centerId }));

          if (missingAshram.length > 0) {
            Promise.all(
              missingAshram.map((r) =>
                setDoc(doc(db!, 'recipes', r.id), r, { merge: true })
              )
            ).catch(() => {});
            items.push(...missingAshram);
          }

          SafeStorage.setItem(this.getLocalKey(centerId), items);
          return items;
        }

        const initialForCenter = INITIAL_RECIPES.map((r) => ({ ...r, centerId }));
        Promise.all(
          initialForCenter.map((r) =>
            setDoc(doc(db!, 'recipes', r.id), r, { merge: true })
          )
        ).catch((err) => console.warn('[RecipeRepository] Could not seed recipes:', err));

        return initialForCenter;
      } catch (err) {
        console.warn(`[RecipeRepository] Firestore read failed for center ${centerId}, falling back to cache:`, err);
      }
    }

    const cached = SafeStorage.getItem<Recipe[] | null>(this.getLocalKey(centerId), null);
    if (cached) return cached;

    return INITIAL_RECIPES.map((r) => ({ ...r, centerId }));
  }

  async saveCenterRecipe(centerId: string, recipe: Recipe): Promise<void> {
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
