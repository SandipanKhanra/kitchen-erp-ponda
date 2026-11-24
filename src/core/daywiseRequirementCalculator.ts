import { FifteenDayMenuPlan } from '../types/menu';
import { Recipe } from '../types/recipe';
import { IngredientStockItem } from '../types/stock';
import { convertToBaseUnit } from './unitConverter';
import {
  DayRequirement,
  DayWiseRequirementItem,
  ConsolidatedShoppingItem,
  PeriodRequirementSummary,
} from '../types/requisition';

/**
 * Calculates day-wise ingredient requirements and total shopping list for a 15-day menu.
 * Automatically deducts current stock to determine net required purchases.
 */
export function calculateDayWiseAndShoppingRequirements(
  menuPlan: FifteenDayMenuPlan,
  recipeMap: Map<string, Recipe>,
  stockMap: Map<string, IngredientStockItem>
): PeriodRequirementSummary {
  const dailyRequirements: DayRequirement[] = [];
  const cumulativeDemandMap = new Map<string, number>();

  let totalMenuCost = 0;

  for (let d = 1; d <= 15; d++) {
    const day = menuPlan.days[d];
    if (!day) continue;

    const dayIngredientsMap = new Map<string, number>();
    const totalDayHeadcount =
      (day.breakfast.headcount || 0) +
      (day.lunch.headcount || 0) +
      (day.dinner.headcount || 0);

    const mealSlots = [day.breakfast, day.lunch, day.dinner];

    // Compute ingredient consumption for this day
    mealSlots.forEach((slot) => {
      const headcount = slot.headcount || 0;
      if (headcount <= 0) return;

      slot.recipeIds.forEach((rId) => {
        const recipe = recipeMap.get(rId);
        if (!recipe || recipe.baseYield <= 0) return;

        const scaleMultiplier = headcount / recipe.baseYield;

        recipe.ingredients.forEach((item) => {
          const stockItem = stockMap.get(item.ingredientId);
          // Convert recipe ingredient quantity (which can be kg, g, litre, ml, piece, cup, tbsp, tsp) into stock item's base unit
          const normalizedQty = stockItem
            ? convertToBaseUnit(item.quantity, item.unit, stockItem.measureIndex)
            : item.quantity;
          const wastage = 1 + (item.wastagePercent || 0) / 100;
          const consumed = normalizedQty * scaleMultiplier * wastage;

          const currentDayTotal = dayIngredientsMap.get(item.ingredientId) || 0;
          dayIngredientsMap.set(item.ingredientId, currentDayTotal + consumed);

          const currentCycleTotal = cumulativeDemandMap.get(item.ingredientId) || 0;
          cumulativeDemandMap.set(item.ingredientId, currentCycleTotal + consumed);
        });
      });
    });

    // Build DayRequirement
    const dayItems: DayWiseRequirementItem[] = [];
    let dayCost = 0;

    dayIngredientsMap.forEach((qty, ingId) => {
      const stockItem = stockMap.get(ingId);
      if (!stockItem) return;

      const roundedQty = Math.round(qty * 100) / 100;
      const lineCost = Math.round(roundedQty * stockItem.price * 100) / 100;
      dayCost += lineCost;

      dayItems.push({
        ingredientId: ingId,
        name: stockItem.name,
        category: stockItem.category,
        measureIndex: stockItem.measureIndex,
        requiredQty: roundedQty,
        cost: lineCost,
      });
    });

    totalMenuCost += dayCost;

    dailyRequirements.push({
      dayNumber: d,
      date: day.date,
      isEkadashi: day.isEkadashi,
      occasionName: day.occasionTitle,
      totalHeadcount: totalDayHeadcount,
      ingredients: dayItems,
      dayTotalCost: Math.round(dayCost * 100) / 100,
    });
  }

  // Build Consolidated Shopping List (deducting current stock)
  const shoppingList: ConsolidatedShoppingItem[] = [];
  let totalNetProcurementCost = 0;

  cumulativeDemandMap.forEach((totalDemand, ingId) => {
    const stockItem = stockMap.get(ingId);
    if (!stockItem) return;

    const roundedDemand = Math.round(totalDemand * 100) / 100;
    const currentStock = stockItem.currentStock;
    const netToPurchase = Math.max(0, Math.round((roundedDemand - currentStock) * 100) / 100);
    const estimatedCost = Math.round(netToPurchase * stockItem.price * 100) / 100;

    totalNetProcurementCost += estimatedCost;

    shoppingList.push({
      ingredientId: ingId,
      name: stockItem.name,
      brand: stockItem.brand,
      category: stockItem.category,
      measureIndex: stockItem.measureIndex,
      totalPeriodDemand: roundedDemand,
      currentStock,
      netToPurchase,
      currentPrice: stockItem.price,
      estimatedPurchaseCost: estimatedCost,
    });
  });

  shoppingList.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return {
    centerId: menuPlan.centerId,
    startDate: menuPlan.startDate,
    endDate: menuPlan.endDate,
    dailyRequirements,
    shoppingList,
    totalMenuCost: Math.round(totalMenuCost * 100) / 100,
    totalNetProcurementCost: Math.round(totalNetProcurementCost * 100) / 100,
    generatedAt: new Date().toISOString(),
  };
}
