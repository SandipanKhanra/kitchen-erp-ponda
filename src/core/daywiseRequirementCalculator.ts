import { FifteenDayMenuPlan } from '../types/menu';
import { Recipe } from '../types/recipe';
import { IngredientStockItem } from '../types/stock';
import { convertToBaseUnit, roundKitchenQuantity } from './unitConverter';
import {
  DayRequirement,
  DayWiseRequirementItem,
  RecipeCostBreakdown,
  RecipeIngredientCostItem,
  ConsolidatedShoppingItem,
  PeriodRequirementSummary,
} from '../types/requisition';

/**
 * Calculates day-wise ingredient requirements, per-recipe costs, individual item costs,
 * and the total consolidated shopping list for a 15-day menu.
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
      (day.dinner.headcount || 0) +
      (day.brahmacariBreakfast?.headcount || 0) +
      (day.brahmacariLunch?.headcount || 0);

    const recipeCostBreakdowns: RecipeCostBreakdown[] = [];

    const mealSlots: { mealType: string; slot: typeof day.breakfast; isAshram?: boolean }[] = [
      { mealType: 'Breakfast', slot: day.breakfast },
      ...(day.brahmacariBreakfast
        ? [{ mealType: 'Brahmacari Breakfast', slot: day.brahmacariBreakfast, isAshram: true }]
        : []),
      { mealType: 'Lunch', slot: day.lunch },
      ...(day.brahmacariLunch
        ? [{ mealType: 'Brahmacari Lunch', slot: day.brahmacariLunch, isAshram: true }]
        : []),
      { mealType: 'Dinner', slot: day.dinner },
    ];

    // Compute ingredient consumption and per-recipe costs for this day
    mealSlots.forEach(({ mealType, slot, isAshram }) => {
      const headcount = slot.headcount || 0;
      if (headcount <= 0) return;

      slot.recipeIds.forEach((rId) => {
        const recipe = recipeMap.get(rId);
        if (!recipe || recipe.baseYield <= 0) return;

        const scaleMultiplier = headcount / recipe.baseYield;
        let recipeTotalCost = 0;
        const recipeItems: RecipeIngredientCostItem[] = [];

        recipe.ingredients.forEach((item) => {
          const stockItem = stockMap.get(item.ingredientId);
          const measure = stockItem?.measureIndex || item.unit;

          // Convert recipe ingredient quantity into stock item's base unit
          const normalizedQty = stockItem
            ? convertToBaseUnit(item.quantity, item.unit, stockItem.measureIndex)
            : item.quantity;
          const wastage = 1 + (item.wastagePercent || 0) / 100;
          const rawConsumed = normalizedQty * scaleMultiplier * wastage;
          // Apply standard kitchen rounding: piece = whole, kg = 0.25 step, litre = 0.5 step
          const consumed = roundKitchenQuantity(rawConsumed, measure);

          const currentDayTotal = dayIngredientsMap.get(item.ingredientId) || 0;
          dayIngredientsMap.set(item.ingredientId, currentDayTotal + consumed);

          const currentCycleTotal = cumulativeDemandMap.get(item.ingredientId) || 0;
          cumulativeDemandMap.set(item.ingredientId, currentCycleTotal + consumed);

          const unitPrice = stockItem?.price || 0;
          const roundedQty = consumed;
          const lineCost = Math.round(roundedQty * unitPrice * 100) / 100;
          recipeTotalCost += lineCost;

          recipeItems.push({
            ingredientId: item.ingredientId,
            name: stockItem?.name || 'Ingredient',
            category: stockItem?.category || 'Grocery',
            measureIndex: stockItem?.measureIndex || 'kg',
            requiredQty: roundedQty,
            unitPrice,
            cost: lineCost,
          });
        });

        recipeTotalCost = Math.round(recipeTotalCost * 100) / 100;
        const costPerPerson =
          headcount > 0 ? Math.round((recipeTotalCost / headcount) * 100) / 100 : 0;

        recipeCostBreakdowns.push({
          recipeId: rId,
          recipeName: recipe.name,
          mealType,
          headcount,
          recipeTotalCost,
          costPerPerson,
          isAshram,
          items: recipeItems,
        });
      });
    });

    // Build consolidated DayRequirement ingredients
    const dayItems: DayWiseRequirementItem[] = [];
    let dayCost = 0;

    dayIngredientsMap.forEach((qty, ingId) => {
      const stockItem = stockMap.get(ingId);
      if (!stockItem) return;

      const roundedQty = roundKitchenQuantity(qty, stockItem.measureIndex);
      const unitPrice = stockItem.price;
      const lineCost = Math.round(roundedQty * unitPrice * 100) / 100;
      dayCost += lineCost;

      dayItems.push({
        ingredientId: ingId,
        name: stockItem.name,
        category: stockItem.category,
        measureIndex: stockItem.measureIndex,
        requiredQty: roundedQty,
        unitPrice,
        cost: lineCost,
      });
    });

    dayCost = Math.round(dayCost * 100) / 100;
    totalMenuCost += dayCost;

    dailyRequirements.push({
      dayNumber: d,
      date: day.date,
      isEkadashi: day.isEkadashi,
      occasionName: day.occasionTitle,
      totalHeadcount: totalDayHeadcount,
      recipes: recipeCostBreakdowns,
      ingredients: dayItems,
      dayTotalCost: dayCost,
      costPerPerson:
        totalDayHeadcount > 0 ? Math.round((dayCost / totalDayHeadcount) * 100) / 100 : 0,
    });
  }

  // Build Consolidated Shopping List (deducting current stock)
  const shoppingList: ConsolidatedShoppingItem[] = [];
  let totalNetProcurementCost = 0;

  cumulativeDemandMap.forEach((totalDemand, ingId) => {
    const stockItem = stockMap.get(ingId);
    if (!stockItem) return;

    const measure = stockItem.measureIndex;
    const roundedDemand = roundKitchenQuantity(totalDemand, measure);
    const currentStock = roundKitchenQuantity(stockItem.currentStock, measure);
    const rawNet = Math.max(0, roundedDemand - currentStock);
    const netToPurchase = rawNet > 0 ? roundKitchenQuantity(rawNet, measure) : 0;
    const estimatedPurchaseCost = Math.round(netToPurchase * stockItem.price * 100) / 100;

    totalNetProcurementCost += estimatedPurchaseCost;

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
      estimatedPurchaseCost,
    });
  });

  // Sort shopping list alphabetically by name
  shoppingList.sort((a, b) => a.name.localeCompare(b.name));

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
