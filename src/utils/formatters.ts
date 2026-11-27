/**
 * Format any date input (ISO string, YYYY-MM-DD, or Date object) to DD-MM-YYYY
 * e.g. "2026-11-20" -> "20-11-2026"
 */
export function formatDateDDMMYYYY(dateInput: string | Date | number | undefined | null): string {
  if (!dateInput) return '';

  // Already DD-MM-YYYY format
  if (typeof dateInput === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }

  // YYYY-MM-DD format
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput.trim())) {
    const [y, m, d] = dateInput.trim().slice(0, 10).split('-');
    return `${d}-${m}-${y}`;
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format user role to display-friendly name:
 * 'sadmin' -> 'Super Admin'
 * 'admin' -> 'Admin'
 * 'user' -> 'Devotee'
 */
export function formatUserRole(role?: string): string {
  if (!role) return 'Devotee';
  const r = role.toLowerCase();
  if (r === 'sadmin') return 'Super Admin';
  if (r === 'admin') return 'Admin';
  return 'Devotee';
}

/**
 * Format full timestamp to DD-MM-YYYY, hh:mm A
 */
export function formatTimestampDDMMYYYY(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${day}-${month}-${year}, ${time}`;
  } catch {
    return String(isoString);
  }
}

/**
 * Sanitize a CSV cell value to prevent formula injection (=, +, -, @, \t, \r)
 * and properly quote embedded quotes/commas.
 */
export function sanitizeCsvCell(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}
