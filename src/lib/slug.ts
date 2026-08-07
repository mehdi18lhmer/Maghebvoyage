/**
 * Slug generation, verbatim from CDC §E.
 *
 * 'Trek Tassili Printemps 2025' → 'trek-tassili-printemps-2025'
 *
 * Collision handling (-2, -3…) is not here: it needs a database lookup, so it
 * lives in trips.service.ts. This function stays pure and testable.
 */
export function toSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    // Strip combining diacritics, so "é" → "e" rather than being dropped.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
    // A title ending in punctuation would otherwise leave a trailing dash.
    .replace(/-+$/, "");
}
