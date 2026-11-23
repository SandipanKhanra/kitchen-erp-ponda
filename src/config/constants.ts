import { BaseUnit, IngredientCategory } from '../types/ingredient';
import { MealType } from '../types/recipe';

export const BASE_UNITS: BaseUnit[] = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'dozen'];

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  'Grains & Pulses',
  'Vegetables & Fruits',
  'Dairy & Paneer',
  'Spices & Seasoning',
  'Oils & Ghee',
  'Sweeteners',
  'Bakery & Nuts',
  'Others',
];

export const MEAL_TYPES: MealType[] = [
  'Breakfast',
  'Lunch',
  'High Tea / Snacks',
  'Dinner',
  'Special Feast',
];

export const DEFAULT_CYCLE_START_DATE = '2026-11-01';
export const TOTAL_CYCLE_DAYS = 15;
