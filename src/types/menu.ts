import { MealType } from './recipe';

export type MenuApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface DayMealSlot {
  patternId?: string;        // Optional link to a pre-defined Pattern (e.g. Pattern-1)
  recipeIds: string[];       // Concrete recipes selected
  headcount: number;         // Person count for this meal
}

export interface DayMenuSchedule {
  dayNumber: number;         // 1 to 15
  date: string;              // YYYY-MM-DD
  isEkadashi: boolean;
  isFasting: boolean;
  occasionTitle?: string;
  breakfast: DayMealSlot;
  lunch: DayMealSlot;
  dinner: DayMealSlot;
  brahmacariBreakfast?: DayMealSlot; // Brahmacari Ashram section for breakfast
  brahmacariLunch?: DayMealSlot;     // Brahmacari Ashram section for lunch
  notes?: string;
}

export interface FifteenDayMenuPlan {
  id: string;
  centerId: string;
  title: string;             // e.g. "Nov 15 - Nov 30 Cycle"
  startDate: string;         // YYYY-MM-DD
  endDate: string;           // YYYY-MM-DD
  status: MenuApprovalStatus;
  days: Record<number, DayMenuSchedule>;
  createdBy: string;         // uid of creator (user or admin)
  createdByName: string;
  createdByRole: 'user' | 'admin' | 'sadmin';
  approvedBy?: string;       // uid of approving admin (MUST be different from creator!)
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  totalCycleEstimatedCost?: number;
  createdAt: string;
  updatedAt: string;
}
