/**
 * Safe wrapper around browser localStorage.
 * Handles storage quota limits, disabled storage, and JSON parsing safely.
 * Adheres to Single Responsibility Principle (SRP).
 */
export class SafeStorage {
  static getItem<T>(key: string, fallback: T): T {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return fallback;
      }
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      return JSON.parse(item) as T;
    } catch (err) {
      console.warn(`[SafeStorage] Failed to read key "${key}":`, err);
      return fallback;
    }
  }

  static setItem<T>(key: string, value: T): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[SafeStorage] Failed to write key "${key}":`, err);
      return false;
    }
  }

  static removeItem(key: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.removeItem(key);
    } catch (err) {
      console.warn(`[SafeStorage] Failed to remove key "${key}":`, err);
    }
  }
}
