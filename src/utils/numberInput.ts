/**
 * Utility functions for clean numeric input handling across the ERP.
 *
 * Prevents leading zeros (e.g. typing 5 when input has 0 resulting in "05", "00", etc.)
 * while preserving decimals like "0.5" and handling empty inputs gracefully.
 */

/**
 * Sanitizes a numeric string by removing unwanted leading zeros.
 * Preserves decimal notation (e.g., "0.5", "0.") and single "0".
 * Converts "05" -> "5", "00" -> "0", "0120" -> "120", "00.5" -> "0.5".
 */
export function sanitizeNumericString(value: string): string {
  if (!value) return '';
  return value.replace(/^0+(?=\d)/, '');
}

/**
 * Handles the onChange event for numeric inputs:
 * 1. Sanitizes the DOM input value to strip leading zeros.
 * 2. Directly updates `e.target.value` to guarantee the browser view updates immediately.
 * 3. Returns the cleaned string and parsed numeric value.
 */
export function sanitizeNumericChange(
  e: React.ChangeEvent<HTMLInputElement>,
  isFloat = false
): { cleanStr: string; numValue: number } {
  const cleanStr = sanitizeNumericString(e.target.value);
  e.target.value = cleanStr;
  const numValue =
    cleanStr === '' ? 0 : isFloat ? parseFloat(cleanStr) || 0 : parseInt(cleanStr, 10) || 0;
  return { cleanStr, numValue };
}
