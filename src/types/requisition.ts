import { StockCategory, MeasureIndex } from './stock';

export interface DayWiseRequirementItem {
  ingredientId: string;
  name: string;
  category: StockCategory;
  measureIndex: MeasureIndex;
  requiredQty: number;
  cost: number;
}

export interface DayRequirement {
  dayNumber: number;
  date: string;
  isEkadashi: boolean;
  occasionName?: string;
  totalHeadcount: number;
  ingredients: DayWiseRequirementItem[];
  dayTotalCost: number;
}

export interface ConsolidatedShoppingItem {
  ingredientId: string;
  name: string;
  brand: string;
  category: StockCategory;
  measureIndex: MeasureIndex;
  totalPeriodDemand: number;
  currentStock: number;
  netToPurchase: number;     // max(0, totalPeriodDemand - currentStock)
  currentPrice: number;      // Current unit price
  estimatedPurchaseCost: number; // netToPurchase * currentPrice
}

export interface PeriodRequirementSummary {
  centerId: string;
  startDate: string;
  endDate: string;
  dailyRequirements: DayRequirement[];
  shoppingList: ConsolidatedShoppingItem[];
  totalMenuCost: number;
  totalNetProcurementCost: number;
  generatedAt: string;
}
