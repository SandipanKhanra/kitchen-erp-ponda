import { FifteenDayMenuPlan } from '../types/menu';

export interface RepetitionViolation {
  dayNumber: number;
  mealType: string;
  recipeName: string;
  type: 'same_day_duplicate' | 'consecutive_day_duplicate' | 'excessive_cycle_repetition' | 'ashram_rotation_violation';
  message: string;
}

/**
 * Validates the 15-day menu to guarantee that recipes do not repeat unnecessarily.
 * Ensures variety for General meals (Breakfast, Lunch, Dinner) and Brahmacari Ashram meals.
 * For Ashram meals: If number of unique ashram dishes is limited (< 14), enforces weekly (7-day) rotation.
 */
export function validateMenuRepetition(
  currentPlan: FifteenDayMenuPlan,
  recipeNameMap: Map<string, string>,
  previousCyclePlan?: FifteenDayMenuPlan,
  ashramRecipeIds?: Set<string>
): { isValid: boolean; violations: RepetitionViolation[] } {
  const violations: RepetitionViolation[] = [];
  const cycleRecipeCounts: Record<string, number[]> = {}; // recipeId -> array of dayNumbers
  const ashramRecipeDays: Record<string, number[]> = {}; // recipeId -> array of dayNumbers in ashram

  // Count total distinct ashram recipes assigned across the 15 days
  const assignedAshramDishIds = new Set<string>();
  for (let d = 1; d <= 15; d++) {
    const day = currentPlan.days[d];
    if (!day) continue;
    (day.brahmacariBreakfast?.recipeIds || []).forEach((id) => assignedAshramDishIds.add(id));
    (day.brahmacariLunch?.recipeIds || []).forEach((id) => assignedAshramDishIds.add(id));
  }
  const isLimitedAshramPool = assignedAshramDishIds.size < 14;
  const minAshramInterval = assignedAshramDishIds.size <= 3 ? 3 : 7; // Weekly rotation if <= 7 dishes

  // Check repetition across the 15 days of currentPlan
  for (let d = 1; d <= 15; d++) {
    const day = currentPlan.days[d];
    if (!day) continue;

    // --- 1. General Meals Validation ---
    const generalMeals = [
      { name: 'Breakfast', slot: day.breakfast },
      { name: 'Lunch', slot: day.lunch },
      { name: 'Dinner', slot: day.dinner },
    ];

    const daySeenGeneralRecipes = new Set<string>();

    generalMeals.forEach(({ name: mealName, slot }) => {
      slot.recipeIds.forEach((rId) => {
        const recipeName = recipeNameMap.get(rId) || 'Unknown Recipe';

        // Same-day repetition across general meals
        if (daySeenGeneralRecipes.has(rId)) {
          violations.push({
            dayNumber: d,
            mealType: mealName,
            recipeName,
            type: 'same_day_duplicate',
            message: `Day ${d} (${mealName}): "${recipeName}" is repeated multiple times on the same day in general meals.`,
          });
        }
        daySeenGeneralRecipes.add(rId);

        if (!cycleRecipeCounts[rId]) cycleRecipeCounts[rId] = [];
        cycleRecipeCounts[rId].push(d);

        // Consecutive day repetition for general meals
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

    // --- 2. Brahmacari Ashram Meals Validation & Weekly Rotation Logic ---
    const ashramMeals = [
      ...(day.brahmacariBreakfast ? [{ name: 'Brahmacari Breakfast', slot: day.brahmacariBreakfast }] : []),
      ...(day.brahmacariLunch ? [{ name: 'Brahmacari Lunch', slot: day.brahmacariLunch }] : []),
    ];

    const daySeenAshramRecipes = new Set<string>();

    ashramMeals.forEach(({ name: mealName, slot }) => {
      (slot.recipeIds || []).forEach((rId) => {
        const recipeName = recipeNameMap.get(rId) || 'Unknown Recipe';

        // Same-day duplicate between ashram breakfast and ashram lunch
        if (daySeenAshramRecipes.has(rId)) {
          violations.push({
            dayNumber: d,
            mealType: mealName,
            recipeName,
            type: 'same_day_duplicate',
            message: `Day ${d}: "${recipeName}" is served for both Ashram Breakfast and Lunch on the same day.`,
          });
        }
        daySeenAshramRecipes.add(rId);

        // Consecutive day repetition for Ashram meals
        if (d > 1) {
          const prevDay = currentPlan.days[d - 1];
          if (prevDay) {
            const prevAshram = [
              ...(prevDay.brahmacariBreakfast?.recipeIds || []),
              ...(prevDay.brahmacariLunch?.recipeIds || []),
            ];
            if (prevAshram.includes(rId)) {
              violations.push({
                dayNumber: d,
                mealType: mealName,
                recipeName,
                type: 'consecutive_day_duplicate',
                message: `Day ${d} & Day ${d - 1} (Ashram): "${recipeName}" is served on consecutive days in Brahmacari Ashram.`,
              });
            }
          }
        }

        // Weekly rotation rule: if number of ashram dishes is limited (< 14), allow weekly cycle (repeat after minInterval)
        if (!ashramRecipeDays[rId]) {
          ashramRecipeDays[rId] = [];
        } else {
          const lastServedDay = ashramRecipeDays[rId][ashramRecipeDays[rId].length - 1];
          const diff = d - lastServedDay;
          if (isLimitedAshramPool && diff < minAshramInterval && diff > 1) {
            violations.push({
              dayNumber: d,
              mealType: mealName,
              recipeName,
              type: 'ashram_rotation_violation',
              message: `Day ${d} (Ashram): "${recipeName}" repeats too soon (${diff} days after Day ${lastServedDay}). Maintain at least a weekly (${minAshramInterval}-day) rotation for Ashram meals.`,
            });
          }
        }
        ashramRecipeDays[rId].push(d);
      });
    });
  }

  // --- 3. Previous Cycle Rollover Check ---
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
