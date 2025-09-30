import { describe, it, expect } from 'vitest';
import { hasCorrectAnswers } from '../utils/scoreUtils';

describe('Exercise Progress Debug', () => {
  it('should correctly identify completed exercises', () => {
    // Mock data giống như thực tế
    const mockScores = [
      // User thử bài tập 1 lần đầu - chưa đúng hoàn toàn
      {
        id: 1,
        user_id: 1,
        exercise_id: 1,
        all_correct: false,
        results: [true, false, true], // 2/3 test cases đúng
        user_results: ['5', 'wrong', '10'],
      },
      // User thử bài tập 1 lần thứ 2 - hoàn thành
      {
        id: 2,
        user_id: 1,
        exercise_id: 1,
        all_correct: true,
        results: [true, true, true], // 3/3 test cases đúng
        user_results: ['5', '8', '10'],
      },
    ];

    // Simulate logic từ useExerciseProgress
    const exerciseId = 1;
    const progress = {
      exerciseId,
      isCompleted: false,
      isAttempted: false,
      attemptCount: 0,
      bestScore: undefined,
      lastAttempt: undefined,
    };

    // Process scores
    mockScores.forEach(score => {
      if (score.exercise_id === exerciseId) {
        progress.attemptCount += 1;
        progress.isAttempted = true;

        // Update last attempt
        if (!progress.lastAttempt || score.id > progress.lastAttempt.id) {
          progress.lastAttempt = {
            id: score.id,
            all_correct: score.all_correct,
            results: score.results,
            user_results: score.user_results,
          };
        }

        // Update best score
        if (!progress.bestScore || 
            (score.all_correct && !progress.bestScore.all_correct) ||
            (score.all_correct && progress.bestScore.all_correct && score.id > progress.bestScore.id) ||
            (!score.all_correct && !progress.bestScore.all_correct && 
             (score.results?.filter(r => r).length || 0) > (progress.bestScore.results?.filter(r => r).length || 0))) {
          progress.bestScore = {
            id: score.id,
            all_correct: score.all_correct,
            results: score.results,
            user_results: score.user_results,
          };
        }

        // Mark as completed if any score has all_correct = true
        if (score.all_correct) {
          progress.isCompleted = true;
        }
      }
    });

    // Test assertions
    expect(progress.isCompleted).toBe(true);
    expect(progress.isAttempted).toBe(true);
    expect(progress.attemptCount).toBe(2);
    expect(progress.bestScore?.all_correct).toBe(true);
    expect(progress.lastAttempt?.all_correct).toBe(true);
    expect(progress.bestScore?.id).toBe(2); // Should be the completed attempt
  });

  it('should correctly identify partial success', () => {
    const mockScores = [
      {
        id: 1,
        user_id: 1,
        exercise_id: 1,
        all_correct: false,
        results: [true, false, true], // 2/3 test cases đúng
        user_results: ['5', 'wrong', '10'],
      },
    ];

    const exerciseId = 1;
    const progress = {
      exerciseId,
      isCompleted: false,
      isAttempted: false,
      attemptCount: 0,
      bestScore: undefined,
      lastAttempt: undefined,
    };

    // Process scores
    mockScores.forEach(score => {
      if (score.exercise_id === exerciseId) {
        progress.attemptCount += 1;
        progress.isAttempted = true;

        if (!progress.bestScore) {
          progress.bestScore = {
            id: score.id,
            all_correct: score.all_correct,
            results: score.results,
            user_results: score.user_results,
          };
        }

        if (score.all_correct) {
          progress.isCompleted = true;
        }
      }
    });

    // Test status logic
    const isCompleted = progress.isCompleted;
    const isAttempted = progress.isAttempted;
    const hasPartialSuccess = isAttempted && progress.bestScore && 
      !progress.bestScore.all_correct && 
      hasCorrectAnswers(progress.bestScore);

    expect(isCompleted).toBe(false);
    expect(isAttempted).toBe(true);
    expect(hasPartialSuccess).toBe(true);

    // Status should be "Một phần đúng"
    let status = 'Chưa thử';
    if (isCompleted) {
      status = 'Hoàn thành';
    } else if (hasPartialSuccess) {
      status = 'Một phần đúng';
    } else if (isAttempted) {
      status = 'Chưa đúng';
    }

    expect(status).toBe('Một phần đúng');
  });

  it('should show completed status when user passes all test cases', () => {
    const mockScores = [
      // First attempt - partial success
      {
        id: 1,
        user_id: 1,
        exercise_id: 1,
        all_correct: false,
        results: [true, false, true],
        user_results: ['5', 'wrong', '10'],
      },
      // Second attempt - completed
      {
        id: 2,
        user_id: 1,
        exercise_id: 1,
        all_correct: true,
        results: [true, true, true],
        user_results: ['5', '8', '10'],
      },
    ];

    const exerciseId = 1;
    const progress = {
      exerciseId,
      isCompleted: false,
      isAttempted: false,
      attemptCount: 0,
      bestScore: undefined,
      lastAttempt: undefined,
    };

    // Process scores (same logic as useExerciseProgress)
    mockScores.forEach(score => {
      if (score.exercise_id === exerciseId) {
        progress.attemptCount += 1;
        progress.isAttempted = true;

        // Update last attempt
        if (!progress.lastAttempt || score.id > progress.lastAttempt.id) {
          progress.lastAttempt = {
            id: score.id,
            all_correct: score.all_correct,
            results: score.results,
            user_results: score.user_results,
          };
        }

        // Update best score (prioritize all_correct)
        if (!progress.bestScore || 
            (score.all_correct && !progress.bestScore.all_correct) ||
            (score.all_correct && progress.bestScore.all_correct && score.id > progress.bestScore.id) ||
            (!score.all_correct && !progress.bestScore.all_correct && 
             (score.results?.filter(r => r).length || 0) > (progress.bestScore.results?.filter(r => r).length || 0))) {
          progress.bestScore = {
            id: score.id,
            all_correct: score.all_correct,
            results: score.results,
            user_results: score.user_results,
          };
        }

        // Mark as completed
        if (score.all_correct) {
          progress.isCompleted = true;
        }
      }
    });

    // Test the status logic (same as ExerciseCard)
    const isCompleted = progress.isCompleted;
    const isAttempted = progress.isAttempted;

    let status = 'Chưa thử';
    if (isCompleted) {
      status = 'Hoàn thành';
    } else if (isAttempted && progress.bestScore) {
      const hasPartialSuccess = !progress.bestScore.all_correct && 
        hasCorrectAnswers(progress.bestScore);
      
      if (hasPartialSuccess) {
        status = 'Một phần đúng';
      }
    } else if (isAttempted) {
      status = 'Chưa đúng';
    }

    // Assertions
    expect(progress.isCompleted).toBe(true);
    expect(progress.bestScore?.all_correct).toBe(true);
    expect(progress.lastAttempt?.all_correct).toBe(true);
    expect(status).toBe('Hoàn thành'); // This should be "Hoàn thành", not "Một phần đúng"
  });
});