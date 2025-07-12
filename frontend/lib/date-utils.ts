import { format } from "date-fns"

/**
 * Safely formats a date value with error handling
 * 
 * This function is particularly useful for handling API responses where date fields
 * might be null, undefined, or in unexpected formats (common with GORM timestamps).
 * 
 * @param dateValue - The date value to format (can be string, Date, null, undefined, or any)
 * @param formatString - The date-fns format string (default: 'MMM d, yyyy HH:mm')
 * @returns Formatted date string or fallback text ('No Date' or 'Invalid Date')
 */
export const formatSafeDate = (
  dateValue: any, 
  formatString: string = 'MMM d, yyyy HH:mm'
): string => {
  if (!dateValue) return 'No Date';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return format(date, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error, 'for value:', dateValue);
    return 'Invalid Date';
  }
}

/**
 * Checks if a date value is valid
 * @param dateValue - The date value to validate
 * @returns Boolean indicating if the date is valid
 */
export const isValidDate = (dateValue: any): boolean => {
  if (!dateValue) return false;
  
  try {
    const date = new Date(dateValue);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}

/**
 * Common date format patterns
 */
export const DATE_FORMATS = {
  FULL_DATETIME: 'MMM d, yyyy HH:mm',
  DATE_ONLY: 'MMM d, yyyy',
  TIME_ONLY: 'HH:mm:ss',
  TIME_WITH_MS: 'HH:mm:ss.SSS',
  ISO_DATE: 'yyyy-MM-dd',
  ISO_DATETIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const 