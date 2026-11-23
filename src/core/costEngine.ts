import { Ingredient } from '../types/ingredient';
import { Recipe, CalculatedRecipeCost } from '../types/recipe';
import { convertToBaseUnit } from './unitConverter';

/**
 * Calculates single recipe cost based on live ingredient rates and base yield.
 */
export function calculateRecipeCost(
  recipe: Recipe,
  ingredientMap: Map<string, Ingredient>
): CalculatedRecipeCost {
  let totalCost = 0;

  const breakdown = recipe.ingredients.map((item) => {
    const ingredient = ingredientMap.get(item.ingredientId);
    if (!ingredient) {
      return {
        ingredientId: item.ingredientId,
        ingredientName: 'Unknown Item',
        quantity: item.quantity,
        unit: item.unit,
        unitRate: 0,
        lineCost: 0,
      };
    }

    // Convert recipe quantity to ingredient's base unit
    const qtyInBaseUnit = convertToBaseUnit(item.quantity, item.unit, ingredient.baseUnit);
    const wastageMultiplier = 1 + (item.wastagePercent || 0) / 100;
    const effectiveQty = qtyInBaseUnit * wastageMultiplier;
    const lineCost = effectiveQty * ingredient.currentRate;

    totalCost += lineCost;

    return {
      ingredientId: item.ingredientId,
      ingredientName: ingredient.name,
      quantity: item.quantity,
      unit: item.unit,
      unitRate: ingredient.currentRate,
      lineCost: Math.round(lineCost * 100) / 100,
    };
  });

  const baseYield = recipe.baseYield > 0 ? recipe.baseYield : 1;
  const costPerPortion = Math.round((totalCost / baseYield) * 100) / 100;

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    baseYield,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerPortion,
    breakdown,
  };
}
