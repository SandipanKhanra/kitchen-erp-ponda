export type BaseUnit = 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'pack' | 'dozen';

export type IngredientCategory =
  | 'Grains & Pulses'
  | 'Vegetables & Fruits'
  | 'Dairy & Paneer'
  | 'Spices & Seasoning'
  | 'Oils & Ghee'
  | 'Sweeteners'
  | 'Bakery & Nuts'
  | 'Others';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  baseUnit: BaseUnit;
  currentRate: number;      // Price per base unit (e.g. ₹ per kg or ₹ per L)
  currentStock: number;     // Current inventory count in base unit
  reorderLevel: number;     // Alert threshold
  supplier?: string;
  notes?: string;
  updatedAt: string;
}

export interface StockAdjustment {
  ingredientId: string;
  previousStock: number;
  newStock: number;
  reason: 'Purchase' | 'Consumption' | 'Audit Adjustment' | 'Spoilage';
  timestamp: string;
}
