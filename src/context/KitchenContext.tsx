import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { IngredientStockItem, StockAdjustmentEntry } from '../types/stock';
import { Recipe, MenuPattern, CalculatedRecipeCost } from '../types/recipe';
import { FifteenDayMenuPlan } from '../types/menu';
import { PeriodRequirementSummary } from '../types/requisition';
import { AuditLogEntry, AuditCategory } from '../types/audit';
import { kitchenDbService } from '../services/kitchenDbService';
import { createEmpty15DayMenu } from '../core/rotationEngine';
import { calculateWeightedAveragePrice } from '../core/stockEngine';
import { calculateDayWiseAndShoppingRequirements } from '../core/daywiseRequirementCalculator';
import { validateMenuRepetition, RepetitionViolation } from '../core/repetitionValidator';
import { formatUserRole } from '../utils/formatters';

interface KitchenContextType {
  // Theme state
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  // Stock & Inventory (Isolated by Center, synced with Firebase)
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
  // Recipes (Isolated by Center, synced with Firebase)
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
  saveMenuPlan: (
    plan: FifteenDayMenuPlan,
    options?: { recordAudit?: boolean; auditSummary?: string }
  ) => Promise<void>;
  approveMenuPlan: (planId: string) => Promise<{ success: boolean; error?: string }>;
  rejectMenuPlan: (planId: string, reason: string) => Promise<void>;
  canApproveActiveMenu: boolean;
  repetitionCheck: { isValid: boolean; violations: RepetitionViolation[] };
  // Requisition Summary
  requisitionSummary: PeriodRequirementSummary;
  // Audit Trail & Logging
  auditLogs: AuditLogEntry[];
  isAuditModalOpen: boolean;
  auditModalCategory?: AuditCategory;
  openAuditModal: (category?: AuditCategory) => void;
  closeAuditModal: () => void;
  refreshAuditLogs: () => Promise<void>;
  isSyncing: boolean;
  syncAllWithFirestore: () => Promise<void>;
}

const KitchenContext = createContext<KitchenContextType | null>(null);

export const KitchenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentCenter, currentUser, isAdmin, isSAdmin, allUsers } = useAuth();

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

  const applyTheme = (targetTheme: 'light' | 'dark') => {
    const isDark = targetTheme === 'dark';
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      if (document.body) {
        document.body.classList.add('dark');
        document.body.setAttribute('data-theme', 'dark');
      }
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      if (document.body) {
        document.body.classList.remove('dark');
        document.body.setAttribute('data-theme', 'light');
      }
    }
    try {
      localStorage.setItem('kitchen_theme', targetTheme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Center-scoped Stock (Synced with Firebase)
  const [stockItems, setStockItems] = useState<IngredientStockItem[]>([]);
  const stockMap = useMemo(() => new Map(stockItems.map((s) => [s.id, s])), [stockItems]);

  // Center-scoped Recipes (Synced with Firebase)
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  // Center-scoped Patterns
  const [patterns, setPatterns] = useState<MenuPattern[]>([]);

  // 15-Day Menu Plan with Maker-Checker
  const [activeMenuPlan, setActiveMenuPlan] = useState<FifteenDayMenuPlan>(() =>
    createEmpty15DayMenu(currentCenter.id || 'default')
  );

  // Audit Logs (Center-Specific)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditModalCategory, setAuditModalCategory] = useState<AuditCategory | undefined>();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load center-specific data from Firestore and local cache whenever center switches
  useEffect(() => {
    if (!currentCenter.id) return;
    let isMounted = true;

    const loadCenterData = async () => {
      setIsSyncing(true);
      try {
        const [centerStock, centerRecipes, centerPatterns, centerPlan, centerLogs] =
          await Promise.all([
            kitchenDbService.fetchCenterStock(currentCenter.id),
            kitchenDbService.fetchCenterRecipes(currentCenter.id),
            kitchenDbService.fetchCenterPatterns(currentCenter.id),
            kitchenDbService.fetchCenterMenuPlan(currentCenter.id),
            kitchenDbService.fetchCenterAuditLogs(currentCenter.id),
          ]);

        if (isMounted) {
          let sanitizedPlan = centerPlan;
          if (sanitizedPlan && sanitizedPlan.approvedByName) {
            const approverUid = sanitizedPlan.approvedBy;
            const approverUser =
              allUsers?.find((u) => u.uid === approverUid) ||
              (currentUser.uid === approverUid ? currentUser : null);
            if (
              approverUser?.role === 'sadmin' ||
              sanitizedPlan.approvedByName.toLowerCase().includes('sandipan')
            ) {
              sanitizedPlan = {
                ...sanitizedPlan,
                approvedByName: sanitizedPlan.approvedByName.replace(/\(Admin\)/i, '(Super Admin)'),
              };
            }
          }

          setStockItems(centerStock);
          setRecipes(centerRecipes);
          setPatterns(centerPatterns);
          setActiveMenuPlan(sanitizedPlan);
          setAuditLogs(centerLogs);

          // Asynchronously ensure all entities and center document are created in Firestore
          kitchenDbService
            .syncAllEntitiesToFirestore(currentCenter.id, currentCenter)
            .catch((e) => console.warn('Background entity Firestore sync notice:', e));
        }
      } catch (err) {
        console.warn(`Error syncing data for center ${currentCenter.id}:`, err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    };

    loadCenterData();

    return () => {
      isMounted = false;
    };
  }, [currentCenter.id]);

  const openAuditModal = (category?: AuditCategory) => {
    setAuditModalCategory(category);
    setIsAuditModalOpen(true);
  };

  const closeAuditModal = () => {
    setIsAuditModalOpen(false);
  };

  const refreshAuditLogs = async () => {
    const logs = await kitchenDbService.fetchCenterAuditLogs(currentCenter.id);
    setAuditLogs(logs);
  };

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

    const updatedItem: IngredientStockItem = {
      ...item,
      centerId: currentCenter.id,
      currentStock: newStock,
      price: newAdjustedPrice,
      lastPurchasePrice: data.purchasedUnitPrice,
      updatedAt: new Date().toISOString(),
    };

    // Update local state
    setStockItems((prev) =>
      prev.map((s) => (s.id === data.ingredientId ? updatedItem : s))
    );

    // Sync to Firestore
    await kitchenDbService.saveCenterStockItem(currentCenter.id, updatedItem);

    // Record Audit Log
    const log = await kitchenDbService.logAuditAction({
      centerId: currentCenter.id,
      centerName: currentCenter.name,
      category: 'stock',
      actionType: 'STOCK_PURCHASE',
      entityId: item.id,
      entityName: item.name,
      performedByUid: currentUser.uid,
      performedByName: currentUser.name,
      performedByRole: currentUser.role,
      details: {
        summary: `Purchased ${data.purchasedQty} ${item.measureIndex} of "${item.name}" at ₹${data.purchasedUnitPrice.toFixed(2)}/${item.measureIndex}. Moving average price adjusted: ₹${item.price.toFixed(2)} → ₹${newAdjustedPrice.toFixed(2)}. Total stock: ${item.currentStock} → ${newStock} ${item.measureIndex}`,
        previousValue: { stock: item.currentStock, price: item.price },
        newValue: { stock: newStock, price: newAdjustedPrice },
        quantity: data.purchasedQty,
        unitPrice: data.purchasedUnitPrice,
        totalCost: data.purchasedQty * data.purchasedUnitPrice,
        notes: data.notes,
      },
    });

    setAuditLogs((prev) => [log, ...prev]);
  };

  const updateStockPrice = async (id: string, newPrice: number) => {
    const item = stockMap.get(id);
    if (!item) return;

    const oldPrice = item.price;
    const updatedItem: IngredientStockItem = {
      ...item,
      price: newPrice,
      updatedAt: new Date().toISOString(),
    };

    setStockItems((prev) => prev.map((s) => (s.id === id ? updatedItem : s)));
    await kitchenDbService.saveCenterStockItem(currentCenter.id, updatedItem);

    const log = await kitchenDbService.logAuditAction({
      centerId: currentCenter.id,
      centerName: currentCenter.name,
      category: 'stock',
      actionType: 'STOCK_PRICE_UPDATE',
      entityId: id,
      entityName: item.name,
      performedByUid: currentUser.uid,
      performedByName: currentUser.name,
      performedByRole: currentUser.role,
      details: {
        summary: `Direct price adjustment for "${item.name}": ₹${oldPrice.toFixed(2)} → ₹${newPrice.toFixed(2)} / ${item.measureIndex}`,
        previousValue: oldPrice,
        newValue: newPrice,
      },
    });

    setAuditLogs((prev) => [log, ...prev]);
  };

  const updateStockCount = async (id: string, newCount: number) => {
    const item = stockMap.get(id);
    if (!item) return;

    const oldCount = item.currentStock;
    const updatedItem: IngredientStockItem = {
      ...item,
      currentStock: newCount,
      updatedAt: new Date().toISOString(),
    };

    setStockItems((prev) => prev.map((s) => (s.id === id ? updatedItem : s)));
    await kitchenDbService.saveCenterStockItem(currentCenter.id, updatedItem);

    const log = await kitchenDbService.logAuditAction({
      centerId: currentCenter.id,
      centerName: currentCenter.name,
      category: 'stock',
      actionType: 'STOCK_COUNT_UPDATE',
      entityId: id,
      entityName: item.name,
      performedByUid: currentUser.uid,
      performedByName: currentUser.name,
      performedByRole: currentUser.role,
      details: {
        summary: `Physical inventory count adjusted for "${item.name}": ${oldCount} → ${newCount} ${item.measureIndex}`,
        previousValue: oldCount,
        newValue: newCount,
      },
    });

    setAuditLogs((prev) => [log, ...prev]);
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

    setStockItems((prev) => [newItem, ...prev]);

    // Sync to Firestore
    await kitchenDbService.saveCenterStockItem(currentCenter.id, newItem);

    // Record Audit Log
    const log = await kitchenDbService.logAuditAction({
      centerId: currentCenter.id,
      centerName: currentCenter.name,
      category: 'stock',
      actionType: 'STOCK_ADD',
      entityId: newItem.id,
      entityName: newItem.name,
      performedByUid: currentUser.uid,
      performedByName: currentUser.name,
      performedByRole: currentUser.role,
      details: {
        summary: `Added new stock item "${newItem.name}" (${newItem.category}) with initial stock of ${newItem.currentStock} ${newItem.measureIndex} at ₹${newItem.price.toFixed(2)}/${newItem.measureIndex}`,
        newValue: newItem,
        quantity: newItem.currentStock,
        unitPrice: newItem.price,
      },
    });

    setAuditLogs((prev) => [log, ...prev]);
  };

  // Recipe Operations (Synced with Firebase per Center)
  const saveRecipe = async (recipe: Recipe) => {
    const isNew = !recipes.some((r) => r.id === recipe.id);
    const recipeWithCenter: Recipe = {
      ...recipe,
      centerId: currentCenter.id,
      updatedAt: new Date().toISOString(),
    };

    setRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === recipe.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = recipeWithCenter;
        return copy;
      }
      return [recipeWithCenter, ...prev];
    });

    // Sync to Firestore
    await kitchenDbService.saveCenterRecipe(currentCenter.id, recipeWithCenter);

    // Audit Log
    const log = await kitchenDbService.logAuditAction({
      centerId: currentCenter.id,
      centerName: currentCenter.name,
      category: 'recipe',
      actionType: isNew ? 'RECIPE_CREATE' : 'RECIPE_UPDATE',
      entityId: recipeWithCenter.id,
      entityName: recipeWithCenter.name,
      performedByUid: currentUser.uid,
      performedByName: currentUser.name,
      performedByRole: currentUser.role,
      details: {
        summary: isNew
          ? `Created recipe "${recipeWithCenter.name}" (${recipeWithCenter.mealType}, ${recipeWithCenter.occasion}, base yield: ${recipeWithCenter.baseYield} ${recipeWithCenter.measurableIndex}, ${recipeWithCenter.ingredients.length} ingredients)`
          : `Updated recipe "${recipeWithCenter.name}" details and ingredient ratios`,
        newValue: recipeWithCenter,
      },
    });

    setAuditLogs((prev) => [log, ...prev]);
  };

  const deleteRecipe = async (id: string) => {
    const existing = recipes.find((r) => r.id === id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));

    // Delete in Firestore
    await kitchenDbService.deleteCenterRecipe(currentCenter.id, id);

    if (existing) {
      const log = await kitchenDbService.logAuditAction({
        centerId: currentCenter.id,
        centerName: currentCenter.name,
        category: 'recipe',
        actionType: 'RECIPE_DELETE',
        entityId: id,
        entityName: existing.name,
        performedByUid: currentUser.uid,
        performedByName: currentUser.name,
        performedByRole: currentUser.role,
        details: {
          summary: `Deleted recipe "${existing.name}" from ${currentCenter.name}`,
          previousValue: existing,
        },
      });
      setAuditLogs((prev) => [log, ...prev]);
    }
  };

  // Pattern Operations
  const savePattern = async (pattern: MenuPattern) => {
    const patternWithCenter: MenuPattern = {
      ...pattern,
      centerId: currentCenter.id,
      updatedAt: new Date().toISOString(),
    };

    setPatterns((prev) => {
      const idx = prev.findIndex((p) => p.id === pattern.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = patternWithCenter;
        return copy;
      }
      return [patternWithCenter, ...prev];
    });

    await kitchenDbService.saveCenterPattern(currentCenter.id, patternWithCenter);
  };

  const deletePattern = async (id: string) => {
    setPatterns((prev) => prev.filter((p) => p.id !== id));
  };

  // 15-Day Menu Plan Save (Only persists to Firestore & records Audit Trail when recordAudit is true)
  const saveMenuPlan = async (
    plan: FifteenDayMenuPlan,
    options?: { recordAudit?: boolean; auditSummary?: string }
  ) => {
    // If edited by sadmin, the menu is immediately approved and does NOT need approval again.
    // If edited by any other user or normal admin, reset status to pending_approval under Maker-Checker.
    const isEditedBySAdmin = currentUser.role === 'sadmin' || isSAdmin;

    const updatedPlan: FifteenDayMenuPlan = {
      ...plan,
      centerId: currentCenter.id,
      status: isEditedBySAdmin ? 'approved' : 'pending_approval',
      createdBy: currentUser.uid,
      createdByName: `${currentUser.name} (${formatUserRole(currentUser.role)})`,
      createdByRole: currentUser.role === 'sadmin' ? 'sadmin' : currentUser.role === 'admin' ? 'admin' : 'user',
      approvedBy: isEditedBySAdmin ? currentUser.uid : undefined,
      approvedByName: isEditedBySAdmin ? `${currentUser.name} (Super Admin)` : undefined,
      approvedAt: isEditedBySAdmin ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    setActiveMenuPlan(updatedPlan);

    // Only sync to Firestore and record Audit Trail when explicitly requested (e.g. clicking "Update")
    if (options?.recordAudit) {
      await kitchenDbService.saveCenterMenuPlan(currentCenter.id, updatedPlan);

      const log = await kitchenDbService.logAuditAction({
        centerId: currentCenter.id,
        centerName: currentCenter.name,
        category: 'menu_planner',
        actionType: 'MENU_PLAN_SAVE',
        entityId: plan.id,
        entityName: plan.title,
        performedByUid: currentUser.uid,
        performedByName: currentUser.name,
        performedByRole: currentUser.role,
        details: {
          summary:
            options.auditSummary ||
            (isEditedBySAdmin
              ? `Updated 15-day menu plan "${plan.title}". Auto-approved directly by Super Admin (no re-approval required).`
              : `Updated 15-day menu plan "${plan.title}". Status set to pending_approval under Maker-Checker governance.`),
        },
      });

      setAuditLogs((prev) => [log, ...prev]);
    }
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

    const approverRoleTitle = currentUser.role === 'sadmin' || isSAdmin ? 'Super Admin' : 'Admin';

    const approvedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      status: 'approved',
      approvedBy: currentUser.uid,
      approvedByName: `${currentUser.name} (${approverRoleTitle})`,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveMenuPlan(approvedPlan);

    // Sync to Firestore
    await kitchenDbService.saveCenterMenuPlan(currentCenter.id, approvedPlan);

    // Audit Log
    const log = await kitchenDbService.logAuditAction({
      centerId: currentCenter.id,
      centerName: currentCenter.name,
      category: 'menu_planner',
      actionType: 'MENU_PLAN_APPROVE',
      entityId: planId,
      entityName: approvedPlan.title,
      performedByUid: currentUser.uid,
      performedByName: currentUser.name,
      performedByRole: currentUser.role,
      details: {
        summary: `Maker-Checker approval: Officially approved 15-day menu plan by ${currentUser.name} (${approverRoleTitle}). Menu is live and approved.`,
      },
    });

    setAuditLogs((prev) => [log, ...prev]);

    return { success: true };
  };

  const rejectMenuPlan = async (planId: string, reason: string) => {
    if (!isAdmin && !isSAdmin) return;
    const rejectedPlan: FifteenDayMenuPlan = {
      ...activeMenuPlan,
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };

    setActiveMenuPlan(rejectedPlan);

    // Sync to Firestore
    await kitchenDbService.saveCenterMenuPlan(currentCenter.id, rejectedPlan);

    // Audit Log
    const log = await kitchenDbService.logAuditAction({
      centerId: currentCenter.id,
      centerName: currentCenter.name,
      category: 'menu_planner',
      actionType: 'MENU_PLAN_REJECT',
      entityId: planId,
      entityName: rejectedPlan.title,
      performedByUid: currentUser.uid,
      performedByName: currentUser.name,
      performedByRole: currentUser.role,
      details: {
        summary: `Maker-Checker rejection: Menu plan rejected by ${currentUser.name}. Reason: "${reason}"`,
        notes: reason,
      },
    });

    setAuditLogs((prev) => [log, ...prev]);
  };

  // Repetition Validator
  const recipeNameMap = useMemo(
    () => new Map(recipes.map((r) => [r.id, r.name])),
    [recipes]
  );
  const ashramRecipeIds = useMemo(
    () => new Set(recipes.filter((r) => r.type === 'Ashram' || r.isAshramSpecific).map((r) => r.id)),
    [recipes]
  );
  const repetitionCheck = useMemo(
    () => validateMenuRepetition(activeMenuPlan, recipeNameMap, undefined, ashramRecipeIds),
    [activeMenuPlan, recipeNameMap, ashramRecipeIds]
  );

  const syncAllWithFirestore = async () => {
    setIsSyncing(true);
    try {
      await kitchenDbService.syncAllEntitiesToFirestore(currentCenter.id, currentCenter);
      const [centerStock, centerRecipes, centerPatterns, centerPlan] = await Promise.all([
        kitchenDbService.fetchCenterStock(currentCenter.id),
        kitchenDbService.fetchCenterRecipes(currentCenter.id),
        kitchenDbService.fetchCenterPatterns(currentCenter.id),
        kitchenDbService.fetchCenterMenuPlan(currentCenter.id),
      ]);
      setStockItems(centerStock);
      setRecipes(centerRecipes);
      setPatterns(centerPatterns);
      setActiveMenuPlan(centerPlan);
    } catch (err) {
      console.warn('Manual sync with Firestore error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

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
        auditLogs,
        isAuditModalOpen,
        auditModalCategory,
        openAuditModal,
        closeAuditModal,
        refreshAuditLogs,
        isSyncing,
        syncAllWithFirestore,
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
