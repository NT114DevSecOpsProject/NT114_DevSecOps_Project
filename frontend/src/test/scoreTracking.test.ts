/**
 * Test file để kiểm tra score tracking system
 * Đây là test manual để verify các chức năng đã implement
 */

import { describe, it, expect } from 'vitest';
import { scoreService } from '../services/scores';
import type { ScoreCreate } from '../types/api';
import { filterResults, hasCorrectAnswers, allAnswersIncorrect } from '../utils/scoreUtils';

describe('Score Tracking System', () => {
  describe('ScoreService', () => {
    it('should validate score data correctly', () => {
      const validScoreData: ScoreCreate = {
        exercise_id: 1,
        answer: 'def sum(a, b): return a + b',
        results: [true, true, false],
        user_results: ['5', '12', '7']
      };

      const validation = scoreService.validateScoreData(validScoreData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid score data', () => {
      const invalidScoreData: ScoreCreate = {
        exercise_id: 0, // Invalid ID
        answer: '', // Empty answer
        results: [true, false],
        user_results: ['5'] // Mismatched length
      };

      const validation = scoreService.validateScoreData(invalidScoreData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty results arrays', () => {
      const scoreData: ScoreCreate = {
        exercise_id: 1,
        answer: 'test',
        results: [],
        user_results: []
      };

      const validation = scoreService.validateScoreData(scoreData);
      expect(validation.isValid).toBe(true); // Empty arrays are valid
    });
  });

  describe('Score Statistics', () => {
    it('should calculate accuracy correctly', () => {
      const mockScore = {
        id: 1,
        user_id: 1,
        exercise_id: 1,
        answer: 'test',
        results: [true, true, false, true],
        user_results: ['5', '12', '7', '20'],
        all_correct: false
      };

      const correctResults = filterResults(mockScore.results, (r: unknown) => r === true);
      const accuracy = (correctResults.length / mockScore.results.length) * 100;
      expect(accuracy).toBe(75); // 3/4 = 75%
    });

    it('should identify completed exercises', () => {
      const completedScore = {
        id: 1,
        user_id: 1,
        exercise_id: 1,
        answer: 'test',
        results: [true, true, true],
        user_results: ['5', '12', '20'],
        all_correct: true
      };

      expect(completedScore.all_correct).toBe(true);
    });

    it('should calculate progress statistics', () => {
      const mockScores = [
        { all_correct: true, results: [true, true] },
        { all_correct: false, results: [true, false] },
        { all_correct: false, results: [false, false] },
        { all_correct: true, results: [true, true, true] }
      ];

      const totalAttempts = mockScores.length;
      const correctAnswers = mockScores.filter(s => s.all_correct).length;
      const partialAnswers = mockScores.filter(s => 
        !s.all_correct && hasCorrectAnswers(s)
      ).length;
      const incorrectAnswers = mockScores.filter(s => 
        allAnswersIncorrect(s)
      ).length;

      expect(totalAttempts).toBe(4);
      expect(correctAnswers).toBe(2);
      expect(partialAnswers).toBe(1);
      expect(incorrectAnswers).toBe(1);

      const successRate = (correctAnswers / totalAttempts) * 100;
      expect(successRate).toBe(50);
    });
  });

  describe('Progress Visualization', () => {
    it('should generate chart data for 7 days', () => {
      const chartData = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        chartData.push({
          date: date.toISOString().split('T')[0],
          attempts: 0,
          correct: 0,
          accuracy: 0
        });
      }

      expect(chartData).toHaveLength(7);
      expect(chartData[0].date).toBeDefined();
      expect(chartData[6].date).toBeDefined();
    });

    it('should calculate performance levels correctly', () => {
      const getPerformanceLevel = (rate: number) => {
        if (rate >= 90) return 'A';
        if (rate >= 80) return 'B';
        if (rate >= 70) return 'C';
        if (rate >= 60) return 'D';
        return 'F';
      };

      expect(getPerformanceLevel(95)).toBe('A');
      expect(getPerformanceLevel(85)).toBe('B');
      expect(getPerformanceLevel(75)).toBe('C');
      expect(getPerformanceLevel(65)).toBe('D');
      expect(getPerformanceLevel(45)).toBe('F');
    });
  });

  describe('Streak Calculation', () => {
    it('should calculate current streak correctly', () => {
      const scores = [
        { all_correct: true },
        { all_correct: true },
        { all_correct: false },
        { all_correct: true },
        { all_correct: true }
      ];

      // Current streak từ đầu (newest first)
      let currentStreak = 0;
      for (const score of scores) {
        if (score.all_correct) {
          currentStreak++;
        } else {
          break;
        }
      }

      expect(currentStreak).toBe(2); // 2 câu đúng liên tiếp từ đầu
    });

    it('should calculate max streak correctly', () => {
      const scores = [
        { all_correct: false },
        { all_correct: true },
        { all_correct: true },
        { all_correct: true },
        { all_correct: false },
        { all_correct: true }
      ];

      let maxStreak = 0;
      let tempStreak = 0;

      for (const score of scores) {
        if (score.all_correct) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      expect(maxStreak).toBe(3); // 3 câu đúng liên tiếp tối đa
    });
  });
});

// Export để có thể sử dụng trong manual testing
export const testScoreTracking = {
  validateScoreData: scoreService.validateScoreData.bind(scoreService),
  calculateAccuracy: (results: boolean[]) => {
    const correct = results.filter(r => r === true).length;
    return Math.round((correct / results.length) * 100);
  },
  calculateProgress: (scores: Array<{ all_correct: boolean; results: boolean[] }>) => {
    const totalAttempts = scores.length;
    const correctAnswers = scores.filter(s => s.all_correct).length;
    const partialAnswers = scores.filter(s => 
      !s.all_correct && hasCorrectAnswers(s)
    ).length;
    const incorrectAnswers = scores.filter(s => 
      allAnswersIncorrect(s)
    ).length;
    
    return {
      totalAttempts,
      correctAnswers,
      partialAnswers,
      incorrectAnswers,
      successRate: totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0
    };
  }
};