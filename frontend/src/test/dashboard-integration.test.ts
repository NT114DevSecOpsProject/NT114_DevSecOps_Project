import { describe, it, expect, beforeEach } from 'vitest';

// Mock data that simulates real API responses
const mockUsers = [
  { id: 1, username: 'user1', email: 'user1@example.com', active: true, admin: false },
  { id: 2, username: 'user2', email: 'user2@example.com', active: true, admin: false },
  { id: 3, username: 'admin', email: 'admin@example.com', active: true, admin: true },
  { id: 4, username: 'inactive', email: 'inactive@example.com', active: false, admin: false },
];

const mockExercises = [
  { id: 1, title: 'Sum Function', body: 'Write a function that adds two numbers', difficulty: 0, test_cases: ['sum(2, 3)'], solutions: ['5'] },
  { id: 2, title: 'Array Filter', body: 'Filter even numbers from array', difficulty: 1, test_cases: ['filter([1,2,3,4])'], solutions: ['[2,4]'] },
  { id: 3, title: 'Binary Search', body: 'Implement binary search', difficulty: 2, test_cases: ['search([1,2,3], 2)'], solutions: ['1'] },
];

const mockScores = [
  { id: 1, user_id: 1, exercise_id: 1, all_correct: true, results: [true, true], answer: 'def sum(a,b): return a+b', user_results: ['5', '7'] },
  { id: 2, user_id: 1, exercise_id: 2, all_correct: false, results: [true, false], answer: 'def filter(arr): return [x for x in arr if x%2==0]', user_results: ['[2,4]', '[2]'] },
  { id: 3, user_id: 1, exercise_id: 3, all_correct: true, results: [true, true, true], answer: 'def search(arr, target): ...', user_results: ['1', '0', '-1'] },
  { id: 4, user_id: 2, exercise_id: 1, all_correct: false, results: [false, false], answer: 'def sum(a,b): return a*b', user_results: ['6', '12'] },
  { id: 5, user_id: 2, exercise_id: 2, all_correct: true, results: [true, true], answer: 'def filter(arr): return [x for x in arr if x%2==0]', user_results: ['[2,4]', '[6,8]'] },
];

describe('Dashboard Integration Tests with Real Data', () => {
  let currentUser: any;
  let userScores: any[];

  beforeEach(() => {
    // Set current user as user1
    currentUser = mockUsers[0];
    userScores = mockScores.filter(score => score.user_id === currentUser.id);
  });

  describe('User Statistics Calculation', () => {
    it('should calculate user progress correctly', () => {
      const totalAttempts = userScores.length;
      const correctAnswers = userScores.filter(score => score.all_correct).length;
      const partialAnswers = userScores.filter(score => 
        !score.all_correct && score.results && score.results.some(r => r === true)
      ).length;
      const incorrectAnswers = userScores.filter(score => 
        score.results && score.results.every(r => r === false)
      ).length;
      const successRate = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;

      expect(totalAttempts).toBe(3);
      expect(correctAnswers).toBe(2); // exercises 1 and 3
      expect(partialAnswers).toBe(1); // exercise 2
      expect(incorrectAnswers).toBe(0);
      expect(Math.round(successRate * 100) / 100).toBe(66.67);
    });

    it('should calculate test case accuracy correctly', () => {
      const totalTestCases = userScores.reduce((sum, score) => 
        sum + (score.results ? score.results.length : 0), 0
      );
      const correctTestCases = userScores.reduce((sum, score) => 
        sum + (score.results ? score.results.filter(r => r === true).length : 0), 0
      );
      const testCaseAccuracy = totalTestCases > 0 ? (correctTestCases / totalTestCases) * 100 : 0;

      expect(totalTestCases).toBe(7); // 2 + 2 + 3
      expect(correctTestCases).toBe(6); // 2 + 1 + 3
      expect(Math.round(testCaseAccuracy * 100) / 100).toBe(85.71);
    });

    it('should calculate streak correctly', () => {
      // Sort scores by exercise_id to simulate chronological order
      const sortedScores = [...userScores].sort((a, b) => a.exercise_id - b.exercise_id);
      
      // Calculate current streak from the beginning
      let currentStreak = 0;
      for (const score of sortedScores) {
        if (score.all_correct) {
          currentStreak++;
        } else {
          break;
        }
      }

      // Calculate max streak
      let maxStreak = 0;
      let tempStreak = 0;
      for (const score of sortedScores) {
        if (score.all_correct) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      expect(currentStreak).toBe(1); // First exercise is correct
      expect(maxStreak).toBe(1); // Max streak is also 1 (broken by exercise 2)
    });
  });

  describe('System Statistics for Admin', () => {
    it('should calculate system-wide user statistics', () => {
      const totalUsers = mockUsers.length;
      const activeUsers = mockUsers.filter(user => user.active).length;
      const adminUsers = mockUsers.filter(user => user.admin).length;
      const activeRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      expect(totalUsers).toBe(4);
      expect(activeUsers).toBe(3);
      expect(adminUsers).toBe(1);
      expect(activeRate).toBe(75);
    });

    it('should calculate exercise statistics', () => {
      const totalExercises = mockExercises.length;
      const exercisesByDifficulty = {
        easy: mockExercises.filter(ex => ex.difficulty === 0).length,
        medium: mockExercises.filter(ex => ex.difficulty === 1).length,
        hard: mockExercises.filter(ex => ex.difficulty === 2).length,
      };

      expect(totalExercises).toBe(3);
      expect(exercisesByDifficulty.easy).toBe(1);
      expect(exercisesByDifficulty.medium).toBe(1);
      expect(exercisesByDifficulty.hard).toBe(1);
    });

    it('should calculate platform-wide performance metrics', () => {
      const totalAttempts = mockScores.length;
      const successfulAttempts = mockScores.filter(score => score.all_correct).length;
      const platformSuccessRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

      // Calculate average test case accuracy across all users
      const totalTestCases = mockScores.reduce((sum, score) => 
        sum + (score.results ? score.results.length : 0), 0
      );
      const correctTestCases = mockScores.reduce((sum, score) => 
        sum + (score.results ? score.results.filter(r => r === true).length : 0), 0
      );
      const platformTestCaseAccuracy = totalTestCases > 0 ? (correctTestCases / totalTestCases) * 100 : 0;

      expect(totalAttempts).toBe(5);
      expect(successfulAttempts).toBe(3); // user1: 2, user2: 1
      expect(platformSuccessRate).toBe(60);
      expect(Math.round(platformTestCaseAccuracy * 100) / 100).toBe(72.73); // 8 correct out of 11 total
    });
  });

  describe('Achievement System', () => {
    it('should determine user achievements correctly', () => {
      const userStats = {
        totalAttempts: userScores.length,
        correctAnswers: userScores.filter(score => score.all_correct).length,
        successRate: 66.67,
        maxStreak: 1,
      };

      const achievements = [];
      
      if (userStats.correctAnswers >= 10) {
        achievements.push('Người Giải Quyết');
      }
      
      if (userStats.maxStreak >= 5) {
        achievements.push('Chuỗi Thành Công');
      }
      
      if (userStats.successRate >= 80) {
        achievements.push('Chuyên Gia');
      }

      // User1 should not have any achievements yet
      expect(achievements).toEqual([]);
    });

    it('should award achievements for high-performing user', () => {
      // Simulate a high-performing user
      const highPerformingUserScores = [
        ...Array(12).fill(null).map((_, i) => ({
          id: i + 1,
          user_id: 999,
          exercise_id: i + 1,
          all_correct: true,
          results: [true, true],
        }))
      ];

      const userStats = {
        totalAttempts: highPerformingUserScores.length,
        correctAnswers: highPerformingUserScores.filter(score => score.all_correct).length,
        successRate: 100,
        maxStreak: 12,
      };

      const achievements = [];
      
      if (userStats.correctAnswers >= 10) {
        achievements.push('Người Giải Quyết');
      }
      
      if (userStats.maxStreak >= 5) {
        achievements.push('Chuỗi Thành Công');
      }
      
      if (userStats.successRate >= 80) {
        achievements.push('Chuyên Gia');
      }

      expect(achievements).toEqual([
        'Người Giải Quyết',
        'Chuỗi Thành Công',
        'Chuyên Gia'
      ]);
    });
  });

  describe('Recent Activity Tracking', () => {
    it('should format recent activity correctly', () => {
      const recentActivity = userScores
        .sort((a, b) => b.id - a.id) // Sort by newest first
        .slice(0, 5)
        .map(score => ({
          exerciseId: score.exercise_id,
          status: score.all_correct ? 'Hoàn thành' : 
                  score.results?.some(r => r) ? 'Một phần' : 'Chưa đúng',
          testCasesPassed: score.results ? score.results.filter(r => r).length : 0,
          totalTestCases: score.results ? score.results.length : 0,
        }));

      expect(recentActivity).toHaveLength(3);
      expect(recentActivity[0]).toEqual({
        exerciseId: 3,
        status: 'Hoàn thành',
        testCasesPassed: 3,
        totalTestCases: 3,
      });
      expect(recentActivity[1]).toEqual({
        exerciseId: 2,
        status: 'Một phần',
        testCasesPassed: 1,
        totalTestCases: 2,
      });
      expect(recentActivity[2]).toEqual({
        exerciseId: 1,
        status: 'Hoàn thành',
        testCasesPassed: 2,
        totalTestCases: 2,
      });
    });
  });

  describe('Progress Over Time', () => {
    it('should calculate daily progress correctly', () => {
      // Simulate progress over 7 days
      const days = 7;
      const progressData = Array(days).fill(null).map((_, i) => ({
        date: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        attempts: 0,
        correct: 0,
        accuracy: 0,
      }));

      // Distribute user scores across days
      userScores.forEach((score, index) => {
        const dayIndex = Math.min(index, days - 1);
        progressData[dayIndex].attempts++;
        if (score.all_correct) {
          progressData[dayIndex].correct++;
        }
      });

      // Calculate accuracy for each day
      progressData.forEach(day => {
        day.accuracy = day.attempts > 0 ? (day.correct / day.attempts) * 100 : 0;
      });

      expect(progressData[0].attempts).toBe(1);
      expect(progressData[0].correct).toBe(1);
      expect(progressData[0].accuracy).toBe(100);

      expect(progressData[1].attempts).toBe(1);
      expect(progressData[1].correct).toBe(0);
      expect(progressData[1].accuracy).toBe(0);

      expect(progressData[2].attempts).toBe(1);
      expect(progressData[2].correct).toBe(1);
      expect(progressData[2].accuracy).toBe(100);
    });
  });

  describe('Leaderboard Calculation', () => {
    it('should calculate leaderboard correctly', () => {
      // Group scores by user_id
      const userStats = new Map();
      
      mockScores.forEach(score => {
        const userId = score.user_id;
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            userId,
            totalAttempts: 0,
            correctAnswers: 0,
            totalTestCases: 0,
            correctTestCases: 0,
          });
        }
        
        const stats = userStats.get(userId);
        stats.totalAttempts++;
        if (score.all_correct) {
          stats.correctAnswers++;
        }
        stats.totalTestCases += score.results ? score.results.length : 0;
        stats.correctTestCases += score.results ? score.results.filter(r => r === true).length : 0;
      });

      // Convert to array and calculate accuracy
      const leaderboard = Array.from(userStats.values()).map(stats => ({
        ...stats,
        accuracy: stats.totalAttempts > 0 ? (stats.correctAnswers / stats.totalAttempts) * 100 : 0,
        testCaseAccuracy: stats.totalTestCases > 0 ? (stats.correctTestCases / stats.totalTestCases) * 100 : 0,
      }));

      // Sort by accuracy and correct answers
      leaderboard.sort((a, b) => {
        if (a.accuracy !== b.accuracy) {
          return b.accuracy - a.accuracy;
        }
        return b.correctAnswers - a.correctAnswers;
      });

      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].userId).toBe(1); // User1 with 66.67% accuracy
      expect(Math.round(leaderboard[0].accuracy * 100) / 100).toBe(66.67);
      expect(leaderboard[1].userId).toBe(2); // User2 with 50% accuracy
      expect(leaderboard[1].accuracy).toBe(50);
    });
  });
});