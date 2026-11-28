export type AuditCategory = 'stock' | 'recipe' | 'menu_planner';

export type AuditActionType =
  | 'STOCK_ADD'           // Added new stock item
  | 'STOCK_PURCHASE'      // Recorded purchase & updated moving average price
  | 'STOCK_COUNT_UPDATE'  // Stock physical count adjustment
  | 'STOCK_PRICE_UPDATE'  // Unit price update
  | 'STOCK_USAGE'         // Daily kitchen usage deduction confirmed
  | 'STOCK_USAGE_REVERT'  // Reverted a previously confirmed day usage
  | 'RECIPE_CREATE'       // New recipe added
  | 'RECIPE_UPDATE'       // Recipe edited
  | 'RECIPE_DELETE'       // Recipe removed
  | 'MENU_PLAN_SAVE'      // 15-day menu plan modified / recipes assigned
  | 'MENU_PLAN_CREATE'    // New advance 15-day menu plan created
  | 'MENU_PLAN_DELETE'    // Advance 15-day menu plan deleted
  | 'MENU_PLAN_APPROVE'   // Menu plan approved (Maker-Checker)
  | 'MENU_PLAN_REJECT';   // Menu plan rejected

export interface AuditLogEntry {
  id: string;
  centerId: string;
  centerName?: string;
  category: AuditCategory;
  actionType: AuditActionType;
  entityId: string;
  entityName: string;
  performedByUid: string;
  performedByName: string;
  performedByRole: string;
  details: {
    summary: string;
    previousValue?: any;
    newValue?: any;
    notes?: string;
    dayNumber?: number;
    mealType?: string;
    quantity?: number;
    unitPrice?: number;
    totalCost?: number;
  };
  timestamp: string; // ISO 8601 string
}
