import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { IngredientStockItem, StockAdjustmentEntry } from '../types/stock';
import { Recipe, MenuPattern, CalculatedRecipeCost } from '../types/recipe';
import { FifteenDayMenuPlan } from '../types/menu';
import { PeriodRequirementSummary } from '../types/requisition';
import {
  INITIAL_STOCK_ITEMS,
  INITIAL_RECIPES,
  INITIAL_MENU_PATTERNS,
  buildInitial15DayMenu,
} from '../services/mockData';
import { calculateWeightedAveragePrice } from '../core/stockEngine';
import { calculateDayWiseAndShoppingRequirements } from '../core/daywiseRequirementCalculator';
import { validateMenuRepetition, RepetitionViolation } from '../core/repetitionValidator';

interface KitchenContextType {
  // Theme state
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Stock & Inventory (Isolated by Center)
  stockItems: IngredientStockItem[];
  stockMap: Map<string, IngredientStockItem>;
  recordStockPurchase: (data: {
    ingredientId: string;
    purchasedQty: number;
    purchasedUnitPrice: number;
    notes?: string;
  }) => Promise<void>;
  updateStockPrice: (id: string, newPrice: number) => Promise<void>;
  updateStockCount: (id: string, newCount: number) => Promise<void>;
  addNewStockItem: (item: Omit<IngredientStockItem, 'id' | 'centerId' | 'updatedAt'>) => Promise<void>;
  // Recipes
  recipes: Recipe[];
  recipeMap: Map<string, Recipe>;
  saveRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  // Patterns (Admin only)
  patterns: MenuPattern[];
  savePattern: (pattern: MenuPattern) => Promise<void>;
  deletePattern: (id: string) => Promise<void>;
  // 15-Day Menu & Maker-Checker Workflow
  activeMenuPlan: FifteenDayMenuPlan;
  saveMenuPlan: (plan: FifteenDayMenuPlan) => Promise<void>;
  approveMenuPlan: (planId: string) => Promise<{ success: boolean; error?: string }>;
  rejectMenuPlan: (planId: string, reason: string) => Promise<void>;
  canApproveActiveMenu: boolean;
  repetitionCheck: { isValid: boolean; violations: RepetitionViolation[] };
  // Requisition Summary
  requisitionSummary: PeriodRequirementSummary;
}

const KitchenContext = createContext<KitchenContextType | null>(null);

export const KitchenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentCenter, currentUser, isAdmin, isSAdmin } = useAuth();

  // Dark / Light Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('kitchen_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    if (document.body) {
      document.body.classList.toggle('dark', isDark);
    }
    try {
      localStorage.setItem('kitchen_theme', theme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }
  }, [theme]);

  // Center-scoped Stock
  const [allStock, setAllStock] = useState<IngredientStockItem[]>(INITIAL_STOCK_ITEMS);
  const stockItems = useMemo(
    () => allStock.filter((s) => s.centerId === currentCenter.id || isSAdmin),
    [allStock, currentCenter.id, isSAdmin]
  );
  const stockMap = useMemo(() => new Map(stockItems.map((s) => [s.id, s])), [stockItems]);

  // Center-scoped Recipes
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const recipes = useMemo(
    () => allRecipes.filter((r) => r.centerId === currentCenter.id || isSAdmin),
    [allRecipes, currentCenter.id, isSAdmin]
  );
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  // Center-scoped Patterns
  const [allPatterns, setAllPatterns] = useState<MenuPattern[]>(INITIAL_MENU_PATTERNS);
  const patterns = useMemo(
    () => allPatterns.filter((p) => p.centerId === currentCenter.id || isSAdmin),
    [allPatterns, currentCenter.id, isSAdmin]
  );

  // 15-Day Menu Plan with Maker-Checker
  const [activeMenuPlan, setActiveMenuPlan] = useState<FifteenDayMenuPlan>(() =>
    buildInitial15DayMenu(currentCenter.id)
  );

  // When center switches, rebind plan
  useEffect(() => {
    setActiveMenuPlan(buildInitial15DayMenu(currentCenter.id));
  }, [currentCenter.id]);

  // Stock Purchase & Moving Weighted Average Price Recalculation
  const recordStockPurchase = async (data: {
    ingredientId: string;
    purchasedQty: number;
    purchasedUnitPrice: number;
    notes?: string;
  }) => {
    const item = stockMap.get(data.ingredientId);
    if (!item) return;

    const { newStock, newAdjustedPrice } = calculateWeightedAveragePrice(
      item.currentStock,
      item.price,
      data.purchasedQty,
      data.purchasedUnitPrice
    );

    setAllStock((prev) =>
      prev.map((s) =>
        s.id === data.ingredientId
          ? {
              ...s,
              currentStock: newStock,
              price: newAdjustedPrice,
              lastPurchasePrice: data.purchasedUnitPrice,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
  };

  const updateStockPrice = async (id: string, newPrice: number) => {
    setAllStock((prev) =>
      prev.map((s) => (s.id === id ? { ...s, price: newPrice, updatedAt: new Date().toISOString() } : s))
    );
  };

  const updateStockCount = async (id: string, newCount: number) => {
    setAllStock((prev) =>
      prev.map((s) => (s.id === id ? { ...s, currentStock: newCount, updatedAt: new Date().toISOString() } : s))
    );
  };

  const addNewStockItem = async (
    itemData: Omit<IngredientStockItem, 'id' | 'centerId' | 'updatedAt'>
  ) => {
    const newItem: IngredientStockItem = {
      ...itemData,
      id: `stk_${Date.now()}`,
      centerId: currentCenter.id,
      updatedAt: new Date().toISOString(),
    };
    setAllStock((prev) => [newItem, ...prev]);
  };

  // Recipe Operations
  const saveRecipe = async (recipe: Recipe) => {
    setAllRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === recipe.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = recipe;
        return copy;
      }
      return [recipe, ...prev];
    });
  };

  const deleteRecipe = async (id: string) => {
    setAllRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  // Pattern Operations
  const savePattern = async (pattern: MenuPattern) => {
    setAllPatterns((prev) => {
      const idx = prev.findIndex((p) => p.id === pattern.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = pattern;
        return copy;
      }
      return [pattern, ...prev];
    });
  };

  const deletePattern = async (id: string) => {
    setAllPatterns((prev) => prev.filter((p) => p.id !== id));
  };

  // 15-Day Menu Plan Save
  const saveMenuPlan = async (plan: FifteenDayMenuPlan) => {
    // If user edited, reset status to pending_approval
    const updatedPlan: FifteenDayMenuPlan = {
      ...plan,
      status: 'pending_approval',
      createdBy: currentUser.uid,
      createdByName: `${currentUser.name} (${currentUser.role})`,
      createdByRole: currentUser.role === 'admin' ? 'admin' : 'user',
      approvedBy: undefined,
      approvedByName: undefined,
      updatedAt: new Date().toISOString(),
    };
    setActiveMenuPlan(updatedPlan);
  };

  // Maker-Checker Dual-Approval Rule
  // If created by admin A -> Only admin B (different admin in same center) can approve!
  const canApproveActiveMenu = useMemo(() => {
    if (isSAdmin) return true; // Super admin can override
    if (!isAdmin) return false; // Normal users can never approve
    if (activeMenuPlan.status === 'approved') return false; // Already approved

    // MAKER-CHECKER RULE: The person who created/edited the menu CANNOT approve it!
    return activeMenuPlan.createdBy !== currentUser.uid;
  }, [activeMenuPlan, currentUser.uid, isAdmin, isSAdmin]);

  const approveMenuPlan = async (planId: string): Promise<{ success: boolean; error?: string }> => {
    if (!canApproveActiveMenu) {
      return {
        success: false,
        error: 'Maker-Checker policy violation: You cannot approve a menu plan created or modified by yourself. Another admin must review and approve it.',
      };
    }

    setActiveMenuPlan((prev) => ({
      ...prev,
      status: 'approved',
      approvedBy: currentUser.uid,
      approvedByName: `${currentUser.name} (Admin)`,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    return { success: true };
  };

  const rejectMenuPlan = async (planId: string, reason: string) => {
    if (!isAdmin && !isSAdmin) return;
    setActiveMenuPlan((prev) => ({
      ...prev,
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    }));
  };

  // Repetition Validator
  const recipeNameMap = useMemo(
    () => new Map(recipes.map((r) => [r.id, r.name])),
    [recipes]
  );
  const repetitionCheck = useMemo(
    () => validateMenuRepetition(activeMenuPlan, recipeNameMap),
    [activeMenuPlan, recipeNameMap]
  );

  // Requisition & Day-wise calculations
  const requisitionSummary = useMemo(
    () => calculateDayWiseAndShoppingRequirements(activeMenuPlan, recipeMap, stockMap),
    [activeMenuPlan, recipeMap, stockMap]
  );

  return (
    <KitchenContext.Provider
      value={{
        theme,
        toggleTheme,
        stockItems,
        stockMap,
        recordStockPurchase,
        updateStockPrice,
        updateStockCount,
        addNewStockItem,
        recipes,
        recipeMap,
        saveRecipe,
        deleteRecipe,
        patterns,
        savePattern,
        deletePattern,
        activeMenuPlan,
        saveMenuPlan,
        approveMenuPlan,
        rejectMenuPlan,
        canApproveActiveMenu,
        repetitionCheck,
        requisitionSummary,
      }}
    >
      {children}
    </KitchenContext.Provider>
  );
};

export const useKitchen = () => {
  const ctx = useContext(KitchenContext);
  if (!ctx) throw new Error('useKitchen must be used within KitchenProvider');
  return ctx;
};
