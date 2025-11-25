import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Standardized currency formatter for the application.
 * Handles numbers, numeric strings, and safe fallbacks for invalid data.
 */
export function formatCurrency(value: number | string | undefined | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check for invalid numbers, Infinity, or null/undefined
  if (num === undefined || num === null || !Number.isFinite(num)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}
