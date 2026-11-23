import { FifteenDayMenuPlan } from '../types/menu';

export interface RepetitionViolation {
  dayNumber: number;
  mealType: string;
  recipeName: string;
  type: 'same_day_duplicate' | 'consecutive_day_duplicate' | 'excessive_cycle_repetition';
  message: string;
}

/**
 * Validates the 15-day menu to guarantee that recipes do not repeat unnecessarily.
 * Ensures variety for all 3 meals (Breakfast, Lunch, Dinner).
 */
export function validateMenuRepetition(
  currentPlan: FifteenDayMenuPlan,
  recipeNameMap: Map<string, string>,
  previousCyclePlan?: FifteenDayMenuPlan
): { isValid: boolean; violations: RepetitionViolation[] } {
  const violations: RepetitionViolation[] = [];
  const cycleRecipeCounts: Record<string, number[]> = {}; // recipeId -> array of dayNumbers

  // Check repetition across the 15 days of currentPlan
  for (let d = 1; d <= 15; d++) {
    const day = currentPlan.days[d];
    if (!day) continue;

    const meals = [
      { name: 'Breakfast', slot: day.breakfast },
      { name: 'Lunch', slot: day.lunch },
      { name: 'Dinner', slot: day.dinner },
    ];

    const daySeenRecipes = new Set<string>();

    meals.forEach(({ name: mealName, slot }) => {
      slot.recipeIds.forEach((rId) => {
        const recipeName = recipeNameMap.get(rId) || 'Unknown Recipe';

        // 1. Same-day repetition across meals (e.g. Khichdi in breakfast AND lunch)
        if (daySeenRecipes.has(rId)) {
          violations.push({
            dayNumber: d,
            mealType: mealName,
            recipeName,
            type: 'same_day_duplicate',
            message: `Day ${d}: "${recipeName}" is repeated multiple times on the same day.`,
          });
        }
        daySeenRecipes.add(rId);

        // Track frequency across entire 15-day cycle
        if (!cycleRecipeCounts[rId]) cycleRecipeCounts[rId] = [];
        cycleRecipeCounts[rId].push(d);

        // 2. Consecutive day repetition (e.g. Day 4 and Day 5 serving the same main dish)
        if (d > 1) {
          const prevDay = currentPlan.days[d - 1];
          if (prevDay) {
            const prevAll = [
              ...prevDay.breakfast.recipeIds,
              ...prevDay.lunch.recipeIds,
              ...prevDay.dinner.recipeIds,
            ];
            if (prevAll.includes(rId)) {
              violations.push({
                dayNumber: d,
                mealType: mealName,
                recipeName,
                type: 'consecutive_day_duplicate',
                message: `Day ${d} & Day ${d - 1}: "${recipeName}" is served on consecutive days. Please rotate for better variety.`,
              });
            }
          }
        }
      });
    });
  }

  // 3. Compare with Day 15 of previous cycle to prevent rollover back-to-back duplicate
  if (previousCyclePlan && previousCyclePlan.days[15] && currentPlan.days[1]) {
    const prevDay15Recipes = [
      ...previousCyclePlan.days[15].breakfast.recipeIds,
      ...previousCyclePlan.days[15].lunch.recipeIds,
      ...previousCyclePlan.days[15].dinner.recipeIds,
    ];

    const day1Recipes = [
      ...currentPlan.days[1].breakfast.recipeIds,
      ...currentPlan.days[1].lunch.recipeIds,
      ...currentPlan.days[1].dinner.recipeIds,
    ];

    day1Recipes.forEach((rId) => {
      if (prevDay15Recipes.includes(rId)) {
        const recipeName = recipeNameMap.get(rId) || 'Recipe';
        violations.push({
          dayNumber: 1,
          mealType: 'Cycle Rollover',
          recipeName,
          type: 'consecutive_day_duplicate',
          message: `Cycle Rollover: "${recipeName}" was served on Day 15 of the previous cycle and repeats immediately on Day 1 of the new cycle.`,
        });
      }
    });
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}
