// Utility functions for handling score results data
// Backend may return results as objects or arrays, these functions normalize them

export interface ScoreResultsUtils {
  results?: unknown;
}

/**
 * Safely converts results to boolean array, handling both array and object formats
 */
export function getResultsArray(results: unknown): boolean[] {
  if (!results) return [];
  
  // If already array, return as is
  if (Array.isArray(results)) {
    return results.map(r => Boolean(r));
  }
  
  // If object format from backend, convert to array
  if (typeof results === 'object' && results !== null) {
    const obj = results as Record<string, unknown>;
    
    // Handle format like {"passed": true, "score": 95}
    if ('passed' in obj) {
      return [Boolean(obj.passed)];
    }
    // Handle format like {"test_results": [true, false, true]}
    if ('test_results' in obj && Array.isArray(obj.test_results)) {
      return obj.test_results.map(r => Boolean(r));
    }
    // Handle other object formats - convert values to boolean array
    return Object.values(obj).map(v => Boolean(v));
  }
  
  // Single value, convert to array
  return [Boolean(results)];
}

/**
 * Safely check if score has any correct answers
 */
export function hasCorrectAnswers(score: ScoreResultsUtils): boolean {
  const resultsArray = getResultsArray(score.results);
  return resultsArray.some(r => r === true);
}

/**
 * Safely check if all answers are incorrect
 */
export function allAnswersIncorrect(score: ScoreResultsUtils): boolean {
  const resultsArray = getResultsArray(score.results);
  return resultsArray.length > 0 && resultsArray.every(r => r === false);
}

/**
 * Safely filter results array
 */
export function filterResults(results: unknown, predicate: (value: boolean, index: number) => boolean): boolean[] {
  const resultsArray = getResultsArray(results);
  return resultsArray.filter(predicate);
}

/**
 * Safely get count of correct answers
 */
export function getCorrectAnswersCount(results: unknown): number {
  const resultsArray = getResultsArray(results);
  return resultsArray.filter(r => r === true).length;
}

/**
 * Safely get count of incorrect answers
 */
export function getIncorrectAnswersCount(results: unknown): number {
  const resultsArray = getResultsArray(results);
  return resultsArray.filter(r => r === false).length;
}

/**
 * Safely get total count of results
 */
export function getResultsCount(results: unknown): number {
  const resultsArray = getResultsArray(results);
  return resultsArray.length;
}

/**
 * Safely calculate accuracy percentage
 */
export function calculateAccuracy(results: unknown): number {
  const resultsArray = getResultsArray(results);
  if (resultsArray.length === 0) return 0;
  const correctCount = resultsArray.filter(r => r === true).length;
  return (correctCount / resultsArray.length) * 100;
}

/**
 * Safely map over results array
 */
export function mapResults<T>(results: unknown, mapper: (value: boolean, index: number) => T): T[] {
  const resultsArray = getResultsArray(results);
  return resultsArray.map(mapper);
}

/**
 * Get count of correct test cases
 */
export function getCorrectCount(results: unknown): number {
  const resultsArray = getResultsArray(results);
  return resultsArray.filter(r => r === true).length;
}

/**
 * Get total count of test cases
 */
export function getTotalCount(results: unknown): number {
  const resultsArray = getResultsArray(results);
  return resultsArray.length;
}

/**
 * Get accuracy percentage (0-100)
 */
export function getAccuracy(results: unknown): number {
  const resultsArray = getResultsArray(results);
  if (resultsArray.length === 0) return 0;
  const correctCount = resultsArray.filter(r => r === true).length;
  return (correctCount / resultsArray.length) * 100;
}