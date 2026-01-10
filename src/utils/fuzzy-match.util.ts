/**
 * Fuzzy matching utility using Levenshtein distance algorithm
 * Used for intelligent name resolution in AI-friendly APIs
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits required
 * to change one string into another
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first column (deletion cost)
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }

  // Initialize first row (insertion cost)
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1 range)
 * 1.0 means perfect match, 0.0 means completely different
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  // Normalize strings for comparison
  const normalizedStr1 = str1.toLowerCase().trim();
  const normalizedStr2 = str2.toLowerCase().trim();

  if (normalizedStr1 === normalizedStr2) return 1.0;

  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
  const maxLength = Math.max(normalizedStr1.length, normalizedStr2.length);

  // Convert distance to similarity score
  return 1 - distance / maxLength;
}

/**
 * Interface for fuzzy match result
 */
export interface FuzzyMatchResult<T> {
  item: T;
  score: number;
  field: string;
}

/**
 * Fuzzy match a search string against a list of items
 * @param searchString - The string to search for
 * @param items - Array of items to search through
 * @param fields - Field names or getter functions to extract searchable text
 * @param threshold - Minimum similarity score (0-1, default 0.8)
 * @param limit - Maximum number of results to return (default 10)
 */
export function fuzzyMatch<T>(
  searchString: string,
  items: T[],
  fields: (keyof T | ((item: T) => string))[],
  threshold = 0.8,
  limit = 10
): FuzzyMatchResult<T>[] {
  if (!searchString || !items.length) return [];

  const results: FuzzyMatchResult<T>[] = [];

  for (const item of items) {
    let bestScore = 0;
    let bestField = '';

    for (const field of fields) {
      let fieldValue: string;

      if (typeof field === 'function') {
        fieldValue = field(item);
      } else {
        fieldValue = String(item[field] || '');
      }

      const score = calculateSimilarity(searchString, fieldValue);

      if (score > bestScore) {
        bestScore = score;
        bestField = typeof field === 'function' ? 'computed' : String(field);
      }
    }

    if (bestScore >= threshold) {
      results.push({
        item,
        score: bestScore,
        field: bestField,
      });
    }
  }

  // Sort by score descending and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find the best fuzzy match from a list of items
 * Returns null if no match meets the threshold
 */
export function findBestMatch<T>(
  searchString: string,
  items: T[],
  fields: (keyof T | ((item: T) => string))[],
  threshold = 0.8
): FuzzyMatchResult<T> | null {
  const matches = fuzzyMatch(searchString, items, fields, threshold, 1);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Get top N suggestions when no exact match is found
 * Returns items with scores below threshold, useful for error messages
 */
export function getSuggestions<T>(
  searchString: string,
  items: T[],
  fields: (keyof T | ((item: T) => string))[],
  minThreshold = 0.5,
  limit = 3
): FuzzyMatchResult<T>[] {
  // Get matches with lower threshold for suggestions
  return fuzzyMatch(searchString, items, fields, minThreshold, limit);
}
