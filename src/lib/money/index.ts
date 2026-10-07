/**
 * Money utility functions
 *
 * All money values are stored as integer kopecks.
 * 1 RUB = 100 kopecks
 *
 * RULE-M1: Integer kopecks only
 * RULE-M2: No implicit rounding
 * RULE-M3: Use money utility functions for all operations
 */

export type Money = number; // Integer kopecks

/** Parse a positive ruble amount without rounding or accepting partial input. */
export function parseRubles(input: string): Money {
  const value = input.trim();
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(value)) throw new Error("Введите сумму больше нуля, не более двух знаков после запятой");
  const [rubles, fractional = ""] = value.replace(",", ".").split(".");
  const kopecks = BigInt(rubles) * BigInt(100) + BigInt(fractional.padEnd(2, "0") || "0");
  if (kopecks <= BigInt(0) || kopecks > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Введите допустимую сумму больше нуля");
  return Number(kopecks);
}

/**
 * Convert rubles to kopecks
 * @param rubles - Amount in rubles (can be decimal)
 * @returns Integer kopecks
 */
export function toKopecks(rubles: number): Money {
  return Math.round(rubles * 100);
}

/**
 * Convert kopecks to rubles
 * @param kopecks - Amount in integer kopecks
 * @returns Decimal rubles
 */
export function toRubles(kopecks: Money): number {
  return kopecks / 100;
}

/**
 * Add two money amounts
 */
export function add(a: Money, b: Money): Money {
  return a + b;
}

/**
 * Subtract b from a
 */
export function subtract(a: Money, b: Money): Money {
  return a - b;
}

/**
 * Multiply money by a factor
 * @param amount - Money in kopecks
 * @param factor - Multiplication factor
 * @returns Result in kopecks (rounded)
 */
export function multiply(amount: Money, factor: number): Money {
  return Math.round(amount * factor);
}

/**
 * Divide money equally into parts
 * Returns per-part amount and remainder
 * @param totalKopecks - Total amount to divide
 * @param parts - Number of parts
 */
export function divideEqually(
  totalKopecks: Money,
  parts: number
): { perPart: Money; remainder: Money } {
  if (parts <= 0) {
    throw new Error("Cannot divide by zero or negative parts");
  }

  return {
    perPart: Math.floor(totalKopecks / parts),
    remainder: totalKopecks % parts,
  };
}

/**
 * Compare two money amounts
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compare(a: Money, b: Money): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if amount is positive (> 0)
 */
export function isPositive(amount: Money): boolean {
  return amount > 0;
}

/**
 * Check if amount is zero
 */
export function isZero(amount: Money): boolean {
  return amount === 0;
}

/**
 * Check if amount is negative
 */
export function isNegative(amount: Money): boolean {
  return amount < 0;
}

/**
 * Get absolute value
 */
export function abs(amount: Money): Money {
  return Math.abs(amount);
}

/**
 * Format money for display
 * @param kopecks - Amount in kopecks
 * @returns Formatted string like "1 250,50 ₽"
 */
export function format(kopecks: Money): string {
  const rubles = toRubles(kopecks);
  const [integer, decimal] = rubles.toFixed(2).split(".");

  // Add thousands separator
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return `${formattedInteger},${decimal} ₽`;
}

/**
 * Ensure amount is valid money (integer)
 */
export function validate(amount: unknown): Money {
  if (typeof amount !== "number") {
    throw new Error("Money must be a number");
  }

  if (!Number.isFinite(amount)) {
    throw new Error("Money must be finite");
  }

  if (!Number.isInteger(amount)) {
    throw new Error("Money must be an integer (kopecks)");
  }

  return amount;
}
