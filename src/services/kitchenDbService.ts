import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { IngredientStockItem } from '../types/stock';
import { Recipe, MenuPattern } from '../types/recipe';
import { FifteenDayMenuPlan } from '../types/menu';
import { AuditLogEntry, AuditCategory } from '../types/audit';
import {
  INITIAL_CENTERS,
  INITIAL_STOCK_ITEMS,
  INITIAL_RECIPES,
  INITIAL_MENU_PATTERNS,
  buildInitial15DayMenu,
} from './mockData';

class KitchenDbService {
  private getLocalKey(prefix: string, centerId: string): string {
    return `kitchen_${prefix}_${centerId}`;
  }

  // ==========================================
  // Stock Items (Isolated by Center)
  // ==========================================

  /**
   * Fetch all stock items for a specific center
   */
  async fetchCenterStock(centerId: string): Promise<IngredientStockItem[]> {
    if (isFirebaseConfigured && db) {
      const firestore = db;
      try {
        const stockCol = collection(firestore, 'centers', centerId, 'stock');
        const snap = await getDocs(stockCol);

        if (!snap.empty) {
          const items: IngredientStockItem[] = [];
          snap.forEach((d) => {
            items.push(d.data() as IngredientStockItem);
          });
          // Cache in local storage for quick fallback
          try {
            localStorage.setItem(this.getLocalKey('stock', centerId), JSON.stringify(items));
          } catch {}
          return items;
        }

        // If Firestore collection is empty for this center, seed initial items
        const initialForCenter = INITIAL_STOCK_ITEMS.map((item) => ({
          ...item,
          centerId,
        }));

        // Seed to Firestore in background
        Promise.all(
          initialForCenter.map((item) =>
            setDoc(doc(firestore, 'centers', centerId, 'stock', item.id), item)
          )
        ).catch((err) => console.warn('Could not seed initial stock to Firestore:', err));

        return initialForCenter;
      } catch (err) {
        console.warn(`Firestore read failed for center stock (${centerId}), falling back to local cache:`, err);
      }
    }

    // Local Storage / Mock fallback
    try {
      const cached = localStorage.getItem(this.getLocalKey('stock', centerId));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    const defaultItems = INITIAL_STOCK_ITEMS.map((i) => ({ ...i, centerId }));
    return defaultItems;
  }

  /**
   * Save or update a stock item in Firestore (Center-Specific)
   */
  async saveCenterStockItem(centerId: string, item: IngredientStockItem): Promise<void> {
    const itemWithCenter: IngredientStockItem = {
      ...item,
      centerId,
      updatedAt: new Date().toISOString(),
    };

    // Save to local storage cache immediately
    try {
      const current = await this.fetchCenterStock(centerId);
      const idx = current.findIndex((s) => s.id === item.id);
      const updated = idx >= 0 ? current.map((s) => (s.id === item.id ? itemWithCenter : s)) : [itemWithCenter, ...current];
      localStorage.setItem(this.getLocalKey('stock', centerId), JSON.stringify(updated));
    } catch {}

    // Sync to Firestore
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'centers', centerId, 'stock', item.id), itemWithCenter);
      } catch (err) {
        console.warn('Failed to sync stock item to Firestore:', err);
      }
    }
  }

  // ==========================================
  // Recipes (Isolated by Center)
  // ==========================================

  /**
   * Fetch all recipes for a specific center
   */
  async fetchCenterRecipes(centerId: string): Promise<Recipe[]> {
    if (isFirebaseConfigured && db) {
      const firestore = db;
      try {
        const recipeCol = collection(firestore, 'centers', centerId, 'recipes');
        const snap = await getDocs(recipeCol);

        if (!snap.empty) {
          const items: Recipe[] = [];
          snap.forEach((d) => {
            items.push(d.data() as Recipe);
          });

          // Check if any initial Ashram recipes are missing and backfill them to Firestore
          const existingIds = new Set(items.map((i) => i.id));
          const missingAshram = INITIAL_RECIPES.filter(
            (r) => r.isAshramSpecific && !existingIds.has(r.id)
          ).map((r) => ({ ...r, centerId }));

          if (missingAshram.length > 0) {
            Promise.all(
              missingAshram.map((r) =>
                setDoc(doc(firestore, 'centers', centerId, 'recipes', r.id), r)
              )
            ).catch(() => {});
            items.push(...missingAshram);
          }

          try {
            localStorage.setItem(this.getLocalKey('recipes', centerId), JSON.stringify(items));
          } catch {}
          return items;
        }

        // If Firestore collection is empty, seed initial recipes for this center
        const initialForCenter = INITIAL_RECIPES.map((r) => ({
          ...r,
          centerId,
        }));

        Promise.all(
          initialForCenter.map((r) =>
            setDoc(doc(firestore, 'centers', centerId, 'recipes', r.id), r)
          )
        ).catch((err) => console.warn('Could not seed initial recipes to Firestore:', err));

        return initialForCenter;
      } catch (err) {
        console.warn(`Firestore read failed for recipes (${centerId}), falling back to local cache:`, err);
      }
    }

    try {
      const cached = localStorage.getItem(this.getLocalKey('recipes', centerId));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    return INITIAL_RECIPES.map((r) => ({ ...r, centerId }));
  }

  /**
   * Save or update a recipe in Firestore (Center-Specific)
   */
  async saveCenterRecipe(centerId: string, recipe: Recipe): Promise<void> {
    const recipeWithCenter: Recipe = {
      ...recipe,
      centerId,
      updatedAt: new Date().toISOString(),
    };

    // Update local cache
    try {
      const current = await this.fetchCenterRecipes(centerId);
      const idx = current.findIndex((r) => r.id === recipe.id);
      const updated = idx >= 0 ? current.map((r) => (r.id === recipe.id ? recipeWithCenter : r)) : [recipeWithCenter, ...current];
      localStorage.setItem(this.getLocalKey('recipes', centerId), JSON.stringify(updated));
    } catch {}

    // Sync to Firestore
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'centers', centerId, 'recipes', recipe.id), recipeWithCenter);
      } catch (err) {
        console.warn('Failed to sync recipe to Firestore:', err);
      }
    }
  }

  /**
   * Delete a recipe from Firestore
   */
  async deleteCenterRecipe(centerId: string, recipeId: string): Promise<void> {
    try {
      const current = await this.fetchCenterRecipes(centerId);
      const updated = current.filter((r) => r.id !== recipeId);
      localStorage.setItem(this.getLocalKey('recipes', centerId), JSON.stringify(updated));
    } catch {}

    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'centers', centerId, 'recipes', recipeId));
      } catch (err) {
        console.warn('Failed to delete recipe in Firestore:', err);
      }
    }
  }

  // ==========================================
  // Patterns (Center-Specific)
  // ==========================================

  async fetchCenterPatterns(centerId: string): Promise<MenuPattern[]> {
    if (isFirebaseConfigured && db) {
      const firestore = db;
      try {
        const snap = await getDocs(collection(firestore, 'centers', centerId, 'patterns'));
        if (!snap.empty) {
          const items: MenuPattern[] = [];
          snap.forEach((d) => items.push(d.data() as MenuPattern));
          return items;
        }
        const initial = INITIAL_MENU_PATTERNS.map((p) => ({ ...p, centerId }));
        Promise.all(
          initial.map((p) => setDoc(doc(firestore, 'centers', centerId, 'patterns', p.id), p))
        ).catch(() => {});
        return initial;
      } catch (err) {
        console.warn('Failed to read patterns from Firestore:', err);
      }
    }
    return INITIAL_MENU_PATTERNS.map((p) => ({ ...p, centerId }));
  }

  async saveCenterPattern(centerId: string, pattern: MenuPattern): Promise<void> {
    const pat: MenuPattern = { ...pattern, centerId, updatedAt: new Date().toISOString() };
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'centers', centerId, 'patterns', pattern.id), pat);
      } catch (err) {
        console.warn('Failed to save pattern in Firestore:', err);
      }
    }
  }

  // ==========================================
  // 15-Day Menu Plans (Center-Specific)
  // ==========================================

  async fetchCenterMenuPlan(centerId: string): Promise<FifteenDayMenuPlan> {
    if (isFirebaseConfigured && db) {
      const firestore = db;
      try {
        const menuCol = collection(firestore, 'centers', centerId, 'menus');
        const snap = await getDocs(menuCol);
        if (!snap.empty) {
          const docData = snap.docs[0].data() as FifteenDayMenuPlan;
          return docData;
        }
        // Seed default
        const initialPlan = buildInitial15DayMenu(centerId);
        setDoc(doc(firestore, 'centers', centerId, 'menus', initialPlan.id), initialPlan).catch(() => {});
        return initialPlan;
      } catch (err) {
        console.warn('Failed to fetch menu plan from Firestore:', err);
      }
    }
    return buildInitial15DayMenu(centerId);
  }

  async saveCenterMenuPlan(centerId: string, plan: FifteenDayMenuPlan): Promise<void> {
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'centers', centerId, 'menus', plan.id), plan);
      } catch (err) {
        console.warn('Failed to save menu plan in Firestore:', err);
      }
    }
  }

  // ==========================================
  // Audit Logs (Center-Specific Audit Trail)
  // ==========================================

  /**
   * Log an audit event in Firestore and local storage cache
   */
  async logAuditAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    // Prepend to local storage cache for immediate reactivity
    try {
      const cachedKey = this.getLocalKey('audit_logs', entry.centerId);
      const existing = localStorage.getItem(cachedKey);
      const list: AuditLogEntry[] = existing ? JSON.parse(existing) : [];
      list.unshift(fullEntry);
      // Keep last 200 logs locally
      localStorage.setItem(cachedKey, JSON.stringify(list.slice(0, 200)));
    } catch {}

    // Sync to Firestore
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(
          doc(db, 'centers', entry.centerId, 'audit_logs', fullEntry.id),
          fullEntry
        );
      } catch (err) {
        console.warn('Failed to record audit log in Firestore:', err);
      }
    }

    return fullEntry;
  }

  /**
   * Fetch center-specific audit logs
   */
  async fetchCenterAuditLogs(centerId: string, category?: AuditCategory): Promise<AuditLogEntry[]> {
    if (isFirebaseConfigured && db) {
      try {
        const auditCol = collection(db, 'centers', centerId, 'audit_logs');
        const q = query(auditCol, orderBy('timestamp', 'desc'), limit(150));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const items: AuditLogEntry[] = [];
          snap.forEach((d) => items.push(d.data() as AuditLogEntry));
          // Cache
          try {
            localStorage.setItem(this.getLocalKey('audit_logs', centerId), JSON.stringify(items));
          } catch {}

          if (category) {
            return items.filter((item) => item.category === category);
          }
          return items;
        }
      } catch (err) {
        console.warn(`Firestore read failed for audit logs (${centerId}):`, err);
      }
    }

    // Local Storage fallback
    try {
      const cached = localStorage.getItem(this.getLocalKey('audit_logs', centerId));
      if (cached) {
        const list: AuditLogEntry[] = JSON.parse(cached);
        if (category) {
          return list.filter((i) => i.category === category);
        }
        return list;
      }
    } catch {}

    return [];
  }

  // ==========================================
  // Comprehensive Entity Creation & Firestore Sync
  // ==========================================

  /**
   * Directly creates and synchronizes all kitchen entities in Firestore:
   * - Center document ('centers/{centerId}')
   * - Center stock items ('centers/{centerId}/stock')
   * - Center recipes ('centers/{centerId}/recipes' including Ashram dishes)
   * - Center meal patterns ('centers/{centerId}/patterns')
   * - Center 15-day menu plan ('centers/{centerId}/menus')
   */
  async syncAllEntitiesToFirestore(
    centerId: string,
    centerData?: { name?: string; code?: string }
  ): Promise<{
    success: boolean;
    syncedCounts: { stock: number; recipes: number; patterns: number; menus: number };
  }> {
    if (!isFirebaseConfigured || !db) {
      return {
        success: false,
        syncedCounts: { stock: 0, recipes: 0, patterns: 0, menus: 0 },
      };
    }

    const firestore = db;

    try {
      // 1. Ensure Center document exists
      const centerDocRef = doc(firestore, 'centers', centerId);
      const centerSnap = await getDoc(centerDocRef);
      if (!centerSnap.exists()) {
        const defaultCenter = INITIAL_CENTERS.find((c) => c.id === centerId) || {
          id: centerId,
          name: centerData?.name || 'ISKCON Center',
          code: centerData?.code || 'CTR',
          city: 'Goa',
          state: 'Goa',
          country: 'India',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(centerDocRef, defaultCenter, { merge: true });
      }

      // 2. Sync Stock Items
      const stockItems = await this.fetchCenterStock(centerId);
      await Promise.all(
        stockItems.map((item) =>
          setDoc(
            doc(firestore, 'centers', centerId, 'stock', item.id),
            { ...item, centerId, updatedAt: new Date().toISOString() },
            { merge: true }
          )
        )
      );

      // 3. Sync Recipes (including Ashram recipes)
      const recipes = await this.fetchCenterRecipes(centerId);
      const existingIds = new Set(recipes.map((r) => r.id));
      const fullRecipes = [...recipes];
      for (const initRec of INITIAL_RECIPES) {
        if (!existingIds.has(initRec.id)) {
          fullRecipes.push({ ...initRec, centerId });
        }
      }
      await Promise.all(
        fullRecipes.map((r) =>
          setDoc(
            doc(firestore, 'centers', centerId, 'recipes', r.id),
            { ...r, centerId, updatedAt: new Date().toISOString() },
            { merge: true }
          )
        )
      );

      // 4. Sync Patterns
      const patterns = await this.fetchCenterPatterns(centerId);
      await Promise.all(
        patterns.map((p) =>
          setDoc(
            doc(firestore, 'centers', centerId, 'patterns', p.id),
            { ...p, centerId, updatedAt: new Date().toISOString() },
            { merge: true }
          )
        )
      );

      // 5. Sync 15-Day Menu Plan
      const menuPlan = await this.fetchCenterMenuPlan(centerId);
      await setDoc(
        doc(firestore, 'centers', centerId, 'menus', menuPlan.id),
        { ...menuPlan, centerId, updatedAt: new Date().toISOString() },
        { merge: true }
      );

      return {
        success: true,
        syncedCounts: {
          stock: stockItems.length,
          recipes: fullRecipes.length,
          patterns: patterns.length,
          menus: 1,
        },
      };
    } catch (err) {
      console.error(`Failed to sync entities to Firestore for center ${centerId}:`, err);
      throw err;
    }
  }
}

export const kitchenDbService = new KitchenDbService();
