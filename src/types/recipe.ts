export type Occasion = 'Normal' | 'Ekadashi' | 'Fasting';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'High Tea / Snacks' | 'Special Feast' | 'Ashram Breakfast' | 'Ashram Lunch';
export type RecipeType = 'Beverage' | 'Snack' | 'Sweet' | 'Curry' | 'Rice' | 'Bread' | 'Salad' | 'Dal' | 'Ashram' | 'Other';
export type MeasurableIndex = 'per person' | 'kg' | 'litre';

export interface RecipeIngredientItem {
  ingredientId: string;
  quantity: number;           // Quantity required for baseYield
  unit: string;               // kg, litre, piece, g, ml
  wastagePercent?: number;
}

export interface Recipe {
  id: string;
  centerId: string;
  name: string;
  occasion: Occasion;         // Normal, Ekadashi, Fasting
  mealType: MealType;         // Breakfast, Lunch, Dinner, Ashram Breakfast, Ashram Lunch
  type: RecipeType;           // Beverage, Snack, Sweet, Ashram, etc.
  measurableIndex: MeasurableIndex; // per person, kg, litre
  baseYield: number;          // Default portions (e.g. 10 persons, 5 kg)
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  description?: string;
  isAshramSpecific?: boolean; // Dedicated recipe for Brahmacari Ashram
  ingredients: RecipeIngredientItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MenuPattern {
  id: string;
  centerId: string;
  name: string;               // e.g. "Pattern 1 - Traditional Raj Bhog"
  mealType: MealType;
  recipeIds: string[];        // Recipes contained in this pattern
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalculatedRecipeCost {
  recipeId: string;
  recipeName: string;
  baseYield: number;
  totalCost: number;
  costPerPortion: number;
  breakdown: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    unitRate: number;
    lineCost: number;
  }>;
}
