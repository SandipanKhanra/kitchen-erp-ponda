import { IngredientStockItem, StockAdjustmentEntry } from '../types/stock';

/**
 * Moving Weighted Average Unit Price Calculator
 * Formula:
 * New Price = ( (OldStock * OldPrice) + (PurchasedQty * PurchasedUnitPrice) ) / (OldStock + PurchasedQty)
 */
export function calculateWeightedAveragePrice(
  oldStock: number,
  oldPrice: number,
  purchasedQty: number,
  purchasedUnitPrice: number
): { newStock: number; newAdjustedPrice: number; totalCost: number } {
  const totalCost = Math.round(purchasedQty * purchasedUnitPrice * 100) / 100;
  const newStock = Math.round((Math.max(0, oldStock) + purchasedQty) * 1000) / 1000;

  if (newStock <= 0) {
    return {
      newStock: 0,
      newAdjustedPrice: purchasedUnitPrice,
      totalCost,
    };
  }

  // If existing stock had no price set (₹0 placeholder), value it at the new purchase rate
  // so it doesn't artificially dilute the weighted average price.
  const effectiveOldPrice = oldPrice > 0 ? oldPrice : purchasedUnitPrice;
  const existingValue = Math.max(0, oldStock) * effectiveOldPrice;
  const newValue = purchasedQty * purchasedUnitPrice;
  const weightedPrice = (existingValue + newValue) / newStock;

  return {
    newStock,
    newAdjustedPrice: Math.round(weightedPrice * 100) / 100,
    totalCost,
  };
}

/**
 * Deducts consumed ingredients from current stock after a meal or period is confirmed.
 */
export function deductStock(
  stock: IngredientStockItem,
  consumedQty: number
): IngredientStockItem {
  const newStock = Math.max(0, Math.round((stock.currentStock - consumedQty) * 1000) / 1000);
  return {
    ...stock,
    currentStock: newStock,
    updatedAt: new Date().toISOString(),
  };
}
