import { Ingredient, IngredientCategory } from '../types/ingredient';
import { Recipe } from '../types/recipe';
import { MenuCycle } from '../types/menu';
import { PeriodRequisition, RequisitionItem } from '../types/requisition';
import { calculateCycleDay, getDateRange, formatDateISO } from './rotationEngine';
import { convertToBaseUnit } from './unitConverter';

/**
 * Feature 7: Combines and aggregates the entire grocery requisition for any period.
 * Automatically accounts for recipe patterns, headcounts, unit normalization,
 * and current stock deduction.
 */
export function aggregatePeriodRequisition(
  startDate: Date,
  endDate: Date,
  cycleStartDate: Date,
  cycle: MenuCycle,
  recipeMap: Map<string, Recipe>,
  ingredientMap: Map<string, Ingredient>
): PeriodRequisition {
  const dates = getDateRange(startDate, endDate);
  const totalDemandMap = new Map<string, number>();

  // 1. Iterate over every calendar date in the requested period
  dates.forEach((date) => {
    const cycleDay = calculateCycleDay(date, cycleStartDate, 15);
    const dayPlan = cycle.days[cycleDay];

    if (!dayPlan || !dayPlan.programs) return;

    // 2. Iterate each program slot (Breakfast, Lunch, Dinner, etc.)
    dayPlan.programs.forEach((program) => {
      const headcount = program.headcount || 1;

      // 3. For every recipe in this program slot, scale by pattern
      program.recipeIds.forEach((recipeId) => {
        const recipe = recipeMap.get(recipeId);
        if (!recipe || recipe.baseYield <= 0) return;

        const scaleFactor = headcount / recipe.baseYield;

        recipe.ingredients.forEach((ingItem) => {
          const ing = ingredientMap.get(ingItem.ingredientId);
          if (!ing) return;

          // Convert quantity to ingredient's base unit
          const baseUnitQty = convertToBaseUnit(ingItem.quantity, ingItem.unit, ing.baseUnit);
          const wastageMultiplier = 1 + (ingItem.wastagePercent || 0) / 100;
          const consumption = baseUnitQty * scaleFactor * wastageMultiplier;

          const currentTotal = totalDemandMap.get(ingItem.ingredientId) || 0;
          totalDemandMap.set(ingItem.ingredientId, currentTotal + consumption);
        });
      });
    });
  });

  // 4. Transform aggregated demands into Requisition Items with stock deduction
  const items: RequisitionItem[] = [];
  let totalEstimatedCost = 0;
  const categoryTotals: Record<IngredientCategory, number> = {
    'Grains & Pulses': 0,
    'Vegetables & Fruits': 0,
    'Dairy & Paneer': 0,
    'Spices & Seasoning': 0,
    'Oils & Ghee': 0,
    'Sweeteners': 0,
    'Bakery & Nuts': 0,
    'Others': 0,
  };

  totalDemandMap.forEach((totalNeeded, ingredientId) => {
    const ingredient = ingredientMap.get(ingredientId);
    if (!ingredient) return;

    const roundedNeeded = Math.round(totalNeeded * 100) / 100;
    const toPurchase = Math.max(0, Math.round((roundedNeeded - ingredient.currentStock) * 100) / 100);
    const estimatedCost = Math.round(toPurchase * ingredient.currentRate * 100) / 100;

    totalEstimatedCost += estimatedCost;
    categoryTotals[ingredient.category] = (categoryTotals[ingredient.category] || 0) + estimatedCost;

    items.push({
      ingredientId,
      name: ingredient.name,
      category: ingredient.category,
      baseUnit: ingredient.baseUnit,
      totalNeeded: roundedNeeded,
      currentStock: ingredient.currentStock,
      toPurchase,
      unitRate: ingredient.currentRate,
      estimatedCost,
    });
  });

  // Sort items alphabetically by category then name
  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return {
    startDate: formatDateISO(startDate),
    endDate: formatDateISO(endDate),
    cycleId: cycle.id,
    totalDays: dates.length,
    items,
    totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
    categoryTotals,
    generatedAt: new Date().toISOString(),
  };
}
