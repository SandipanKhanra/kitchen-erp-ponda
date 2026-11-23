export interface CalendarMealEvent {
  id: string;
  date: string;              // YYYY-MM-DD
  cycleDay: number;          // 1 to 15
  programName: string;
  mealType: string;
  recipeNames: string[];
  headcount: number;
  estimatedCost: number;
}

export interface CalendarExportOptions {
  includeHeadcount: boolean;
  includeCost: boolean;
  alertBeforeMinutes?: number;
}
