// ─────────────────────────────────────────────────────────────────────────────
// Tax Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Texas sales tax rate (8.25%)
 * @see https://comptroller.texas.gov/taxes/sales/
 */
export const TAX_RATE = 0.0825;

// ─────────────────────────────────────────────────────────────────────────────
// Currency Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intl.NumberFormat options for USD currency formatting.
 * Use with: new Intl.NumberFormat('en-US', CURRENCY_CONFIG).format(amount)
 */
export const CURRENCY_CONFIG: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const;

/**
 * Formats a number as USD currency.
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$12.99")
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', CURRENCY_CONFIG).format(amount);
};

/**
 * Calculates the tax amount for a given subtotal.
 * @param subtotal - The pre-tax amount
 * @returns The tax amount (not the total)
 */
export const calculateTax = (subtotal: number): number => {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
};

/**
 * Calculates the total amount including tax.
 * @param subtotal - The pre-tax amount
 * @returns The total amount including tax
 */
export const calculateTotal = (subtotal: number): number => {
  return Math.round((subtotal + calculateTax(subtotal)) * 100) / 100;
};

// ─────────────────────────────────────────────────────────────────────────────
// Time Constants
// ─────────────────────────────────────────────────────────────────────────────

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

// ─────────────────────────────────────────────────────────────────────────────
// Drink Customization Defaults
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SWEETNESS = 100 as const;
export const DEFAULT_ICE = 'regular' as const;
export const DEFAULT_SIZE = 'medium' as const;

export const SWEETNESS_OPTIONS = [25, 50, 100] as const;
export const ICE_OPTIONS = ['none', 'light', 'regular'] as const;
export const SIZE_OPTIONS = ['small', 'medium', 'large'] as const;

export const SIZE_PRICE_MODIFIERS: Record<string, number> = {
  small: -0.50,
  medium: 0,
  large: 0.75,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Loyalty / Points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Points awarded per dollar spent. Use on both frontend and backend to keep behavior consistent.
 */
export const POINTS_PER_DOLLAR = 10 as const;