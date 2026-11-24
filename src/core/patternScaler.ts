import { Recipe } from '../types/recipe';

export interface ScaledIngredientQuantity {
  ingredientId: string;
  quantity: number;
  unit: string;
}

/**
 * Scales recipe ingredient quantities according to actual target headcount.
 * Formulas are pattern-based: (item.quantity / baseYield) * targetHeadcount
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
    const isPiece = item.unit === 'piece' || item.unit === 'pcs';
    const rawQty = item.quantity * multiplier;
    return {
      ingredientId: item.ingredientId,
      quantity: isPiece ? Math.max(1, Math.round(rawQty)) : Math.round(rawQty * 1000) / 1000,
      unit: item.unit,
    };
  });
}
