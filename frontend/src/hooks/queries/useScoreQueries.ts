import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scoreService } from '../../services/scores';
import { queryKeys } from '../../lib/queryClient';
import type { ScoreCreate } from '../../types/api';
import React from 'react';

// Query để lấy tất cả scores
export const useScores = () => {
  return useQuery({
    queryKey: queryKeys.scores.all,
    queryFn: scoreService.getAll,
    staleTime: 5 * 60 * 1000, // 5 phút
  });
};

// Query để lấy scores của user hiện tại
export const useUserScores = () => {
  return useQuery({
    queryKey: queryKeys.scores.user,
    queryFn: scoreService.getUserScores,
    // Chỉ fetch khi user đã authenticated
    enabled: !!localStorage.getItem('auth_token'),
    staleTime: 2 * 60 * 1000, // 2 phút (fresher data cho user scores)
  });
};

// Query để lấy score của user cho exercise cụ thể
export const useUserScore = (exerciseId?: number) => {
  const { data: userScores } = useUserScores();
  
  return React.useMemo(() => {
    if (!userScores || !exerciseId) return { data: undefined };
    
    const score = userScores.find(score => score.exercise_id === exerciseId);
    return { data: score };
  }, [userScores, exerciseId]);
};

// Query để lấy score theo ID
export const useScore = (id: number) => {
  return useQuery({
    queryKey: queryKeys.scores.detail(id),
    queryFn: () => scoreService.getUserScoreById(id),
    enabled: !!id && id > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Mutation để tạo score mới
export const useCreateScore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (scoreData: ScoreCreate) => scoreService.createScore(scoreData),
    onSuccess: (newScore) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.scores.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scores.user });
      
      // Update cache với score mới nếu có id
      if ('id' in newScore) {
        queryClient.setQueryData(
          queryKeys.scores.detail((newScore as any).id),
          newScore
        );
      }
      
      // Có thể update exercise-specific score cache
      if ('exercise_id' in newScore) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.scores.byExercise((newScore as any).exercise_id)
        });
      }
    },
    onError: (error) => {
      console.error('Failed to create score:', error);
    },
  });
};

// Note: Update score functionality removed as new API doesn't support it
// Scores are now created with full validation results

// Hook để lấy user progress statistics
export const useUserProgress = () => {
  const { data: userScores, isLoading, error } = useUserScores();
  
  const progress = React.useMemo(() => {
    if (!userScores) return null;
    
    const totalAttempts = userScores.length;
    const correctAnswers = userScores.filter(score => score.all_correct === true).length;
    const partialAnswers = userScores.filter(score => 
      !score.all_correct && score.results && score.results.some(r => r === true)
    ).length;
    const incorrectAnswers = userScores.filter(score => 
      score.results && score.results.every(r => r === false)
    ).length;
    
    const successRate = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;
    
    return {
      totalAttempts,
      correctAnswers,
      partialAnswers,
      incorrectAnswers,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
    };
  }, [userScores]);
  
  return {
    progress,
    isLoading,
    error,
  };
};

// Hook để lấy scores theo exercise ID
export const useScoresByExercise = (exerciseId: number) => {
  return useQuery({
    queryKey: queryKeys.scores.byExercise(exerciseId),
    queryFn: async () => {
      const allScores = await scoreService.getAll();
      return allScores.filter(score => score.exercise_id === exerciseId);
    },
    enabled: !!exerciseId && exerciseId > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook để lấy user statistics chi tiết
export const useUserStatistics = () => {
  const { data: userScores, isLoading, error } = useUserScores();
  
  const statistics = React.useMemo(() => {
    if (!userScores) return null;
    
    // Tính toán các thống kê cơ bản
    const totalAttempts = userScores.length;
    const correctAnswers = userScores.filter(score => score.all_correct === true).length;
    const partialAnswers = userScores.filter(score => 
      !score.all_correct && score.results && score.results.some(r => r === true)
    ).length;
    const incorrectAnswers = userScores.filter(score => 
      score.results && score.results.every(r => r === false)
    ).length;
    
    const successRate = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0;
    
    // Tính toán theo độ khó (giả sử có thông tin exercise)
    const difficultyStats = {
      easy: { attempted: 0, correct: 0 },
      medium: { attempted: 0, correct: 0 },
      hard: { attempted: 0, correct: 0 }
    };
    
    // Tính toán streak (chuỗi thành công)
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    
    // Sắp xếp scores theo thời gian (giả sử có created_at)
    const sortedScores = [...userScores].reverse(); // Mới nhất trước
    
    for (const score of sortedScores) {
      if (score.all_correct) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Current streak tính từ đầu (scores mới nhất)
    for (const score of sortedScores) {
      if (score.all_correct) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Tính toán accuracy theo test cases
    const totalTestCases = userScores.reduce((sum, score) => 
      sum + (score.results ? score.results.length : 0), 0
    );
    const correctTestCases = userScores.reduce((sum, score) => 
      sum + (score.results ? score.results.filter(r => r === true).length : 0), 0
    );
    const testCaseAccuracy = totalTestCases > 0 ? (correctTestCases / totalTestCases) * 100 : 0;
    
    return {
      totalAttempts,
      correctAnswers,
      partialAnswers,
      incorrectAnswers,
      successRate: Math.round(successRate * 100) / 100,
      testCaseAccuracy: Math.round(testCaseAccuracy * 100) / 100,
      currentStreak,
      maxStreak,
      difficultyStats,
      recentActivity: sortedScores.slice(0, 10), // 10 hoạt động gần nhất
    };
  }, [userScores]);
  
  return {
    statistics,
    isLoading,
    error,
  };
};

// Hook để theo dõi tiến độ theo thời gian
export const useProgressOverTime = (days: number = 7) => {
  const { data: userScores, isLoading, error } = useUserScores();
  
  const progressData = React.useMemo(() => {
    if (!userScores) return null;
    
    const now = new Date();
    
    // Tạo array các ngày
    const dateRange: Array<{
      date: string;
      attempts: number;
      correct: number;
      accuracy: number;
      hasData: boolean;
    }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dateRange.push({
        date: date.toISOString().split('T')[0],
        attempts: 0,
        correct: 0,
        accuracy: 0,
        hasData: false
      });
    }
    
    // Vì API không có timestamp, tất cả scores được gán vào hôm nay
    if (userScores.length > 0) {
      const todayIndex = dateRange.length - 1;
      dateRange[todayIndex].attempts = userScores.length;
      dateRange[todayIndex].hasData = true;
      
      // Calculate correct scores using our fixed logic
      dateRange[todayIndex].correct = userScores.filter(score => {
        const results = (score.results || []).map(r => Boolean(r));
        return results.length > 0 && results.every(r => r === true);
      }).length;
      
      dateRange[todayIndex].accuracy = dateRange[todayIndex].attempts > 0 
        ? (dateRange[todayIndex].correct / dateRange[todayIndex].attempts) * 100 
        : 0;
    }
    
    return dateRange;
  }, [userScores, days]);
  
  return {
    progressData,
    isLoading,
    error,
    hasTimestampData: false, // Indicate that we don't have real timestamp data
    dataLimitation: 'API không cung cấp timestamp. Tất cả dữ liệu hiển thị trong ngày hôm nay.',
  };
};

// Hook để lấy leaderboard (top performers)
export const useLeaderboard = (limit: number = 10) => {
  const { data: allScores, isLoading, error } = useScores();
  
  const leaderboard = React.useMemo(() => {
    if (!allScores) return null;
    
    // Group scores by user_id
    const userStats = new Map();
    
    allScores.forEach(score => {
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
    
    // Convert to array và tính accuracy
    const leaderboardData = Array.from(userStats.values()).map(stats => ({
      ...stats,
      accuracy: stats.totalAttempts > 0 ? (stats.correctAnswers / stats.totalAttempts) * 100 : 0,
      testCaseAccuracy: stats.totalTestCases > 0 ? (stats.correctTestCases / stats.totalTestCases) * 100 : 0,
    }));
    
    // Sắp xếp theo accuracy và số câu đúng
    leaderboardData.sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }
      return b.correctAnswers - a.correctAnswers;
    });
    
    return leaderboardData.slice(0, limit);
  }, [allScores, limit]);
  
  return {
    leaderboard,
    isLoading,
    error,
  };
};