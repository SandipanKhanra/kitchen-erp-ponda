export type StockCategory = 'Grocery' | 'Vegetables' | 'Fruits' | 'Dairy';
export type MeasureIndex = 'kg' | 'litre' | 'piece';

export interface IngredientStockItem {
  id: string;
  centerId: string;
  name: string;
  brand: string;
  category: StockCategory;
  measureIndex: MeasureIndex;
  currentStock: number;       // Current quantity in stock
  price: number;              // Current price per measureIndex unit
  lastPurchasePrice?: number;
  reorderLevel: number;
  supplier?: string;
  updatedAt: string;
}

export interface StockAdjustmentEntry {
  id: string;
  ingredientId: string;
  centerId: string;
  oldStock: number;
  oldPrice: number;
  purchasedQty: number;
  purchasedUnitPrice: number;
  totalCost: number;
  newStock: number;
  newAdjustedPrice: number;   // Calculated weighted average price
  date: string;
  updatedBy: string;
  notes?: string;
}
