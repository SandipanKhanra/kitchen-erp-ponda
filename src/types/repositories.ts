import { IngredientStockItem } from './stock';
import { Recipe, MenuPattern } from './recipe';
import { FifteenDayMenuPlan } from './menu';
import { AuditLogEntry } from './audit';
import { Center } from './center';

/**
 * Segregated Repository Interfaces adhering to Interface Segregation Principle (ISP)
 * and Dependency Inversion Principle (DIP).
 */

export interface IStockRepository {
  fetchCenterStock(centerId: string): Promise<IngredientStockItem[]>;
  saveCenterStockItem(centerId: string, item: IngredientStockItem): Promise<void>;
}

export interface IRecipeRepository {
  fetchCenterRecipes(centerId: string): Promise<Recipe[]>;
  saveCenterRecipe(centerId: string, recipe: Recipe): Promise<void>;
  deleteCenterRecipe(centerId: string, recipeId: string): Promise<void>;
}

export interface IPatternRepository {
  fetchCenterPatterns(centerId: string): Promise<MenuPattern[]>;
  saveCenterPattern(centerId: string, pattern: MenuPattern): Promise<void>;
}

export interface IMenuRepository {
  fetchCenterMenuPlans(centerId: string): Promise<FifteenDayMenuPlan[]>;
  fetchCenterMenuPlan(centerId: string): Promise<FifteenDayMenuPlan>;
  saveCenterMenuPlan(centerId: string, plan: FifteenDayMenuPlan): Promise<void>;
  deleteCenterMenuPlan(centerId: string, planId: string): Promise<void>;
}

export interface IAuditRepository {
  fetchCenterAuditLogs(centerId: string, maxItems?: number): Promise<AuditLogEntry[]>;
  logAuditAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
}

export interface IKitchenDbService
  extends IStockRepository,
    IRecipeRepository,
    IPatternRepository,
    IMenuRepository,
    IAuditRepository {
  syncAllEntitiesToFirestore(
    centerId: string,
    centerData?: Partial<Center>
  ): Promise<{
    success: boolean;
    syncedCounts: Record<string, number>;
  }>;
}
