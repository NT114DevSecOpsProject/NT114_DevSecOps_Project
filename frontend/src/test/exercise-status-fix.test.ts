import { describe, it, expect } from 'vitest';
import { mapResults, hasCorrectAnswers } from '../utils/scoreUtils';

describe('Exercise Status Fix - API Inconsistency', () => {
  it('should calculate all_correct based on results when API is inconsistent', () => {
    // This is the exact scenario from the bug report
    const mockScore = {
      id: 9,
      user_id: 1,
      exercise_id: 1,
      all_correct: false, // API says false
      results: [true, true, true], // But all results are true
      user_results: ["6", "1", "0"]
    };

    // Simulate the fixed logic
    const results = mapResults(mockScore.results, (r: unknown) => Boolean(r));
    const calculatedAllCorrect = hasCorrectAnswers(mockScore);

    // Test assertions
    expect(mockScore.all_correct).toBe(false); // API value is wrong
    expect(calculatedAllCorrect).toBe(true); // Our calculation is correct
    expect(results).toEqual([true, true, true]); // All results are true

    // The exercise should be marked as completed based on calculated value
    const isCompleted = calculatedAllCorrect;
    expect(isCompleted).toBe(true);
  });

  it('should handle mixed results correctly', () => {
    const mockScore = {
      id: 10,
      user_id: 1,
      exercise_id: 2,
      all_correct: true, // API says true
      results: [true, false, true], // But not all results are true
      user_results: ["5", "wrong", "10"]
    };

    const results = mapResults(mockScore.results, (r: unknown) => Boolean(r));
    const calculatedAllCorrect = hasCorrectAnswers(mockScore);

    expect(mockScore.all_correct).toBe(true); // API value is wrong
    expect(calculatedAllCorrect).toBe(false); // Our calculation is correct
    expect(results).toEqual([true, false, true]); // Mixed results

    const isCompleted = calculatedAllCorrect;
    expect(isCompleted).toBe(false); // Should not be completed
  });

  it('should handle empty results array', () => {
    const mockScore = {
      id: 11,
      user_id: 1,
      exercise_id: 3,
      all_correct: true,
      results: [], // Empty results
      user_results: []
    };

    const results = mapResults(mockScore.results, (r: unknown) => Boolean(r));
    const calculatedAllCorrect = hasCorrectAnswers(mockScore);

    expect(calculatedAllCorrect).toBe(false); // Empty array should not be completed
  });

  it('should handle string boolean values from API', () => {
    const mockScore = {
      id: 12,
      user_id: 1,
      exercise_id: 4,
      all_correct: "false" as any, // String instead of boolean
      results: ["true", "true", "true"] as any, // String booleans
      user_results: ["1", "2", "3"]
    };

    const results = mapResults(mockScore.results, (r: unknown) => Boolean(r));
    const calculatedAllCorrect = hasCorrectAnswers(mockScore);

    // String "true" should convert to boolean true
    expect(results).toEqual([true, true, true]);
    expect(calculatedAllCorrect).toBe(true);
  });

  it('should process multiple scores and find the completed one', () => {
    const mockScores = [
      {
        id: 1,
        exercise_id: 1,
        all_correct: false,
        results: [true, false, true],
        user_results: ["5", "wrong", "10"]
      },
      {
        id: 2,
        exercise_id: 1,
        all_correct: false, // API says false
        results: [true, true, true], // But all are true
        user_results: ["5", "8", "10"]
      }
    ];

    let isCompleted = false;
    let bestScore = null;

    mockScores.forEach(score => {
      const results = mapResults(score.results, (r: unknown) => Boolean(r));
      const calculatedAllCorrect = hasCorrectAnswers(score);

      if (calculatedAllCorrect) {
        isCompleted = true;
      }

      // Update best score based on calculated all_correct
      if (!bestScore || 
          (calculatedAllCorrect && !bestScore.all_correct) ||
          (calculatedAllCorrect && bestScore.all_correct && score.id > bestScore.id)) {
        bestScore = {
          id: score.id,
          all_correct: calculatedAllCorrect,
          results: results,
          user_results: score.user_results
        };
      }
    });

    expect(isCompleted).toBe(true);
    expect(bestScore?.all_correct).toBe(true);
    expect(bestScore?.id).toBe(2); // Should pick the completed attempt
  });

  it('should show correct status based on calculated values', () => {
    const getStatus = (isCompleted: boolean, isAttempted: boolean, bestScore: any) => {
      if (isCompleted) {
        return 'Hoàn thành';
      }
      
      if (isAttempted && bestScore) {
        const hasPartialSuccess = !bestScore.all_correct && 
          hasCorrectAnswers(bestScore);
        
        if (hasPartialSuccess) {
          return 'Một phần đúng';
        }
      }
      
      if (isAttempted) {
        return 'Chưa đúng';
      }
      
      return 'Chưa thử';
    };

    // Test case 1: Completed (API inconsistent but results all true)
    const completedCase = {
      isCompleted: true, // Based on calculated value
      isAttempted: true,
      bestScore: {
        all_correct: true, // Calculated value
        results: [true, true, true]
      }
    };

    expect(getStatus(completedCase.isCompleted, completedCase.isAttempted, completedCase.bestScore))
      .toBe('Hoàn thành');

    // Test case 2: Partial success
    const partialCase = {
      isCompleted: false,
      isAttempted: true,
      bestScore: {
        all_correct: false,
        results: [true, false, true]
      }
    };

    expect(getStatus(partialCase.isCompleted, partialCase.isAttempted, partialCase.bestScore))
      .toBe('Một phần đúng');
  });
});