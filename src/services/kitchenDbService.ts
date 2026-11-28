import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { IngredientStockItem } from '../types/stock';
import { Recipe, MenuPattern } from '../types/recipe';
import { FifteenDayMenuPlan } from '../types/menu';
import { AuditLogEntry } from '../types/audit';
import { Center } from '../types/center';
import {
  IKitchenDbService,
  IStockRepository,
  IRecipeRepository,
  IPatternRepository,
  IMenuRepository,
  IAuditRepository,
} from '../types/repositories';
import { StockRepository } from './repositories/StockRepository';
import { RecipeRepository } from './repositories/RecipeRepository';
import { PatternRepository } from './repositories/PatternRepository';
import { MenuRepository } from './repositories/MenuRepository';
import { AuditRepository } from './repositories/AuditRepository';

/**
 * Unified Kitchen Database Service Facade.
 * Adheres to:
 * - Single Responsibility Principle (SRP): delegates domain actions to dedicated repositories.
 * - Open/Closed Principle (OCP): new repositories can be injected without altering consumers.
 * - Liskov Substitution Principle (LSP): conforms strictly to IKitchenDbService.
 * - Interface Segregation Principle (ISP): repositories expose only domain-relevant contracts.
 * - Dependency Inversion Principle (DIP): depends on repository abstractions.
 */
export class KitchenDbService implements IKitchenDbService {
  constructor(
    private readonly stockRepo: IStockRepository = new StockRepository(),
    private readonly recipeRepo: IRecipeRepository = new RecipeRepository(),
    private readonly patternRepo: IPatternRepository = new PatternRepository(),
    private readonly menuRepo: IMenuRepository = new MenuRepository(),
    private readonly auditRepo: IAuditRepository = new AuditRepository()
  ) {}

  // Stock & Inventory
  fetchCenterStock(centerId: string): Promise<IngredientStockItem[]> {
    return this.stockRepo.fetchCenterStock(centerId);
  }

  saveCenterStockItem(centerId: string, item: IngredientStockItem): Promise<void> {
    return this.stockRepo.saveCenterStockItem(centerId, item);
  }

  // Recipes
  fetchCenterRecipes(centerId: string): Promise<Recipe[]> {
    return this.recipeRepo.fetchCenterRecipes(centerId);
  }

  saveCenterRecipe(centerId: string, recipe: Recipe): Promise<void> {
    return this.recipeRepo.saveCenterRecipe(centerId, recipe);
  }

  deleteCenterRecipe(centerId: string, recipeId: string): Promise<void> {
    return this.recipeRepo.deleteCenterRecipe(centerId, recipeId);
  }

  // Patterns
  fetchCenterPatterns(centerId: string): Promise<MenuPattern[]> {
    return this.patternRepo.fetchCenterPatterns(centerId);
  }

  saveCenterPattern(centerId: string, pattern: MenuPattern): Promise<void> {
    return this.patternRepo.saveCenterPattern(centerId, pattern);
  }

  // Menus
  fetchCenterMenuPlans(centerId: string): Promise<FifteenDayMenuPlan[]> {
    return this.menuRepo.fetchCenterMenuPlans(centerId);
  }

  fetchCenterMenuPlan(centerId: string): Promise<FifteenDayMenuPlan> {
    return this.menuRepo.fetchCenterMenuPlan(centerId);
  }

  saveCenterMenuPlan(centerId: string, plan: FifteenDayMenuPlan): Promise<void> {
    return this.menuRepo.saveCenterMenuPlan(centerId, plan);
  }

  deleteCenterMenuPlan(centerId: string, planId: string): Promise<void> {
    return this.menuRepo.deleteCenterMenuPlan(centerId, planId);
  }

  // Audit Logs
  fetchCenterAuditLogs(centerId: string, maxItems = 50): Promise<AuditLogEntry[]> {
    return this.auditRepo.fetchCenterAuditLogs(centerId, maxItems);
  }

  logAuditAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    return this.auditRepo.logAuditAction(entry);
  }

  // Center Entity Synchronization & Seeding
  async syncAllEntitiesToFirestore(
    centerId: string,
    centerData?: Partial<Center>
  ): Promise<{
    success: boolean;
    syncedCounts: Record<string, number>;
  }> {
    if (!isFirebaseConfigured || !db) {
      return {
        success: false,
        syncedCounts: { stock: 0, recipes: 0, patterns: 0, menus: 0 },
      };
    }

    try {
      // 1. Ensure Center Document
      if (centerData && centerData.id) {
        await setDoc(doc(db, 'centers', centerId), centerData, { merge: true });
      }

      // 2. Sync Stock to 'ingredients'
      const stockItems = await this.fetchCenterStock(centerId);
      await Promise.all(
        stockItems.map((item) =>
          setDoc(
            doc(db!, 'ingredients', item.id),
            { ...item, centerId, updatedAt: new Date().toISOString() },
            { merge: true }
          )
        )
      );

      // 3. Sync Recipes to 'recipes'
      const recipes = await this.fetchCenterRecipes(centerId);
      await Promise.all(
        recipes.map((r) =>
          setDoc(
            doc(db!, 'recipes', r.id),
            { ...r, centerId, updatedAt: new Date().toISOString() },
            { merge: true }
          )
        )
      );

      // 4. Sync Patterns to 'patterns'
      const patterns = await this.fetchCenterPatterns(centerId);
      await Promise.all(
        patterns.map((p) =>
          setDoc(
            doc(db!, 'patterns', p.id),
            { ...p, centerId, updatedAt: new Date().toISOString() },
            { merge: true }
          )
        )
      );

      // 5. Sync 15-Day Menu Plans to 'menus'
      const menuPlans = await this.fetchCenterMenuPlans(centerId);
      await Promise.all(
        menuPlans.map((menuPlan) =>
          setDoc(
            doc(db!, 'menus', menuPlan.id),
            { ...menuPlan, centerId, updatedAt: menuPlan.updatedAt || new Date().toISOString() },
            { merge: true }
          )
        )
      );

      return {
        success: true,
        syncedCounts: {
          stock: stockItems.length,
          recipes: recipes.length,
          patterns: patterns.length,
          menus: menuPlans.length,
        },
      };
    } catch (err) {
      console.warn('[KitchenDbService] syncAllEntitiesToFirestore notice:', err);
      return {
        success: false,
        syncedCounts: { stock: 0, recipes: 0, patterns: 0, menus: 0 },
      };
    }
  }
}

export const kitchenDbService = new KitchenDbService();
