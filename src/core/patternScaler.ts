import { Recipe } from '../types/recipe';
import { roundKitchenQuantity } from './unitConverter';

export interface ScaledIngredientQuantity {
  ingredientId: string;
  quantity: number;
  unit: string;
}

/**
 * Scales recipe ingredient quantities according to actual target headcount.
 * Formulas are pattern-based: (item.quantity / baseYield) * targetHeadcount
 * Automatically enforces kitchen rounding: piece = whole, kg = 0.25 step, litre = 0.5 step.
 */
export function scaleRecipeForHeadcount(
  recipe: Recipe,
  targetHeadcount: number
): ScaledIngredientQuantity[] {
  if (!recipe || recipe.baseYield <= 0 || targetHeadcount <= 0) {
    return [];
  }

  const multiplier = targetHeadcount / recipe.baseYield;

  return recipe.ingredients.map((item) => {
    const rawQty = item.quantity * multiplier;
    return {
      ingredientId: item.ingredientId,
      quantity: roundKitchenQuantity(rawQty, item.unit),
      unit: item.unit,
    };
  });
}
