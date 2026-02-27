/**
 * Normalise supplier/brand names to Title Case.
 * "ELLE" → "Elle", "chanel bond street" → "Chanel Bond Street"
 */
export function toTitleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
