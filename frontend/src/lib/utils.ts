import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatCurrency as sharedFormatCurrency } from "@project3/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Re-export standardized currency formatter from shared library.
 * This ensures frontend and backend (if needed) use identical formatting rules.
 */
export const formatCurrency = sharedFormatCurrency;