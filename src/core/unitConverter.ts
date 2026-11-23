import { BaseUnit } from '../types/ingredient';

/**
 * Normalizes any quantity/unit into the ingredient's registered base unit.
 * E.g., if ingredient base unit is 'kg', 500 'g' returns 0.5.
 */
export function convertToBaseUnit(quantity: number, fromUnit: BaseUnit, toBaseUnit: BaseUnit): number {
  if (fromUnit === toBaseUnit) {
    return quantity;
  }

  // Weight conversions
  if (toBaseUnit === 'kg' && fromUnit === 'g') {
    return quantity / 1000;
  }
  if (toBaseUnit === 'g' && fromUnit === 'kg') {
    return quantity * 1000;
  }

  // Volume conversions
  if (toBaseUnit === 'L' && fromUnit === 'ml') {
    return quantity / 1000;
  }
  if (toBaseUnit === 'ml' && fromUnit === 'L') {
    return quantity * 1000;
  }

  // Discrete unit conversions
  if (toBaseUnit === 'pcs' && fromUnit === 'dozen') {
    return quantity * 12;
  }
  if (toBaseUnit === 'dozen' && fromUnit === 'pcs') {
    return quantity / 12;
  }

  // Fallback if units match general category or direct 1:1
  return quantity;
}
