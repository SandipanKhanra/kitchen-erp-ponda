/**
 * Normalizes any quantity/unit into the ingredient's registered base unit.
 * E.g., if ingredient base unit is 'kg', 500 'g' returns 0.5.
 * Supports culinary and standard Vaishnava kitchen units.
 */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: string,
  toBaseUnit: string
): number {
  if (!quantity || isNaN(quantity)) return 0;
  const from = (fromUnit || '').toLowerCase().trim();
  const to = (toBaseUnit || '').toLowerCase().trim();

  if (from === to) {
    return quantity;
  }

  // Weight conversions
  if ((to === 'kg' || to === 'kilogram') && from === 'g') {
    return quantity / 1000;
  }
  if ((to === 'g' || to === 'gram') && (from === 'kg' || from === 'kilogram')) {
    return quantity * 1000;
  }

  // Volume conversions
  if ((to === 'litre' || to === 'l') && from === 'ml') {
    return quantity / 1000;
  }
  if (to === 'ml' && (from === 'litre' || from === 'l')) {
    return quantity * 1000;
  }
  if ((to === 'litre' && from === 'l') || (to === 'l' && from === 'litre')) {
    return quantity;
  }

  // Culinary conversions to standard weight (kg) or volume (litre)
  // 1 cup standard culinary volume = 250 ml = 0.25 L (~ 250 g = 0.25 kg)
  if (from === 'cup') {
    if (to === 'kg' || to === 'litre' || to === 'l') return quantity * 0.25;
    if (to === 'g' || to === 'ml') return quantity * 250;
  }
  // 1 tablespoon (tbsp) = 15 ml = 0.015 L (~ 15 g = 0.015 kg)
  if (from === 'tbsp') {
    if (to === 'kg' || to === 'litre' || to === 'l') return quantity * 0.015;
    if (to === 'g' || to === 'ml') return quantity * 15;
  }
  // 1 teaspoon (tsp) = 5 ml = 0.005 L (~ 5 g = 0.005 kg)
  if (from === 'tsp') {
    if (to === 'kg' || to === 'litre' || to === 'l') return quantity * 0.005;
    if (to === 'g' || to === 'ml') return quantity * 5;
  }

  // Discrete unit conversions (always whole round numbers for pieces)
  if ((to === 'pcs' || to === 'piece') && from === 'dozen') {
    return Math.round(quantity * 12);
  }
  if (to === 'dozen' && (from === 'pcs' || from === 'piece')) {
    return quantity / 12;
  }
  if ((to === 'pcs' && from === 'piece') || (to === 'piece' && from === 'pcs')) {
    return Math.round(quantity);
  }

  // Any conversion to discrete piece unit must be a round number
  if (to === 'piece' || to === 'pcs') {
    return Math.round(quantity);
  }

  // Fallback direct 1:1 if unknown
  return quantity;
}

/**
 * Standardizes ingredient quantity rounding across recipes, day-wise calculations, and shopping lists:
 * - Piece ('piece', 'pcs'): whole round integer (e.g. 1, 2, 5)
 * - Kilogram ('kg', 'kilogram'): round in steps of 0.25 kg (e.g. 0.25, 0.50, 0.75, 1.00)
 * - Litre ('litre', 'liter', 'l'): round by 500ml or 0.5 litre (e.g. 0.5, 1.0, 1.5, 2.0)
 * - Other units (g, ml, cup, etc.): 2 decimal places
 */
export function roundKitchenQuantity(quantity: number, unitOrMeasure: string): number {
  if (!quantity || isNaN(quantity) || quantity <= 0) return 0;
  const u = (unitOrMeasure || '').toLowerCase().trim();

  // Discrete pieces: whole round integers
  if (u === 'piece' || u === 'pcs') {
    return Math.max(1, Math.round(quantity));
  }

  // Weight in kg: round in step of 0.25kg
  if (u === 'kg' || u === 'kilogram') {
    const step = 0.25;
    const rounded = Math.round(quantity / step) * step;
    return Number(Math.max(0.25, rounded).toFixed(2));
  }

  // Volume in litre: round by 500ml or 0.5 litre
  if (u === 'litre' || u === 'liter' || u === 'l') {
    const step = 0.5;
    const rounded = Math.round(quantity / step) * step;
    return Number(Math.max(0.5, rounded).toFixed(1));
  }

  // Default standard 2 decimal places for other culinary units
  return Math.round(quantity * 100) / 100;
}
