import { useMemo } from 'react';
import { 
  useUserScores, 
  useUserProgress, 
  useUserStatistics,
  useCreateScore,
  useScores as useAllScores,
} from './queries/useScoreQueries';
import { useExercises } from './queries/useExerciseQueries';
import { getCorrectAnswersCount, getResultsCount, calculateAccuracy } from '../utils/scoreUtils';
import type { Score, ScoreCreate } from '../types/api';

/**
 * Hook tổng hợp để quản lý tất cả score-related state và operations
 * Cung cấp interface đơn giản cho components sử dụng
 */
export const useScores = () => {
  // Queries
  const { data: userScores, isLoading: userScoresLoading, error: userScoresError, refetch: refetchUserScores } = useUserScores();
  const { data: allScores, isLoading: allScoresLoading, error: allScoresError } = useAllScores();
  const { progress, isLoading: progressLoading, error: progressError } = useUserProgress();
  const { statistics, isLoading: statisticsLoading, error: statisticsError } = useUserStatistics();
  const { data: exercises } = useExercises();

  // Mutations
  const createScoreMutation = useCreateScore();

  // Computed values
  const computedData = useMemo(() => {
    if (!userScores || !exercises) {
      return {
        scoresByExercise: new Map(),
        completedExercises: [],
        incompleteExercises: [],
        exerciseProgress: [],
        recentActivity: [],
      };
    }

    // Map scores by exercise ID
    const scoresByExercise = new Map<number, Score>();
    userScores.forEach(score => {
      scoresByExercise.set(score.exercise_id, score);
    });

    // Completed và incomplete exercises
    const completedExercises = userScores
      .filter(score => score.all_correct)
      .map(score => score.exercise_id);

    const incompleteExercises = userScores
      .filter(score => !score.all_correct)
      .map(score => score.exercise_id);

    // Exercise progress với thông tin chi tiết
    const exerciseProgress = exercises.map(exercise => {
      const score = scoresByExercise.get(exercise.id);
      const accuracy = score ? calculateAccuracy(score.results) : 0;
      
      return {
        exercise,
        score,
        isCompleted: score?.all_correct || false,
        isAttempted: !!score,
        accuracy: Math.round(accuracy),
        status: !score ? 'not_attempted' : 
                score.all_correct ? 'completed' : 
                accuracy > 0 ? 'partial' : 'failed'
      };
    });

    // Recent activity (10 scores gần nhất)
    const recentActivity = [...userScores]
      .reverse() // Giả sử scores được sắp xếp theo thời gian tạo
      .slice(0, 10)
      .map(score => {
        const exercise = exercises.find(ex => ex.id === score.exercise_id);
        const accuracy = calculateAccuracy(score.results);
        
        return {
          score,
          exercise,
          accuracy: Math.round(accuracy),
          timestamp: new Date(), // Giả lập timestamp
        };
      });

    return {
      scoresByExercise,
      completedExercises,
      incompleteExercises,
      exerciseProgress,
      recentActivity,
    };
  }, [userScores, exercises]);

  // Helper functions
  const getScoreForExercise = (exerciseId: number): Score | undefined => {
    return computedData.scoresByExercise.get(exerciseId);
  };

  const isExerciseCompleted = (exerciseId: number): boolean => {
    const score = getScoreForExercise(exerciseId);
    return score?.all_correct || false;
  };

  const isExerciseAttempted = (exerciseId: number): boolean => {
    return computedData.scoresByExercise.has(exerciseId);
  };

  const getExerciseAccuracy = (exerciseId: number): number => {
    const score = getScoreForExercise(exerciseId);
    if (!score) return 0;
    
    return Math.round(calculateAccuracy(score.results));
  };

  const submitScore = async (scoreData: ScoreCreate) => {
    try {
      await createScoreMutation.mutateAsync(scoreData);
      // Refetch user scores để cập nhật UI
      await refetchUserScores();
      return { success: true };
    } catch (error) {
      console.error('Failed to submit score:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Không thể lưu điểm số' 
      };
    }
  };

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (!statistics) return null;

    return {
      overall: {
        grade: statistics.successRate >= 90 ? 'A' :
               statistics.successRate >= 80 ? 'B' :
               statistics.successRate >= 70 ? 'C' :
               statistics.successRate >= 60 ? 'D' : 'F',
        level: statistics.successRate >= 80 ? 'Xuất sắc' :
               statistics.successRate >= 60 ? 'Tốt' :
               statistics.successRate >= 40 ? 'Khá' : 'Cần cải thiện',
        color: statistics.successRate >= 80 ? 'green' :
               statistics.successRate >= 60 ? 'blue' :
               statistics.successRate >= 40 ? 'yellow' : 'red'
      },
      streaks: {
        current: statistics.currentStreak,
        max: statistics.maxStreak,
        isOnStreak: statistics.currentStreak > 0
      },
      accuracy: {
        overall: statistics.successRate,
        testCases: statistics.testCaseAccuracy,
        trend: statistics.successRate >= 70 ? 'improving' : 'needs_work'
      }
    };
  }, [statistics]);

  // Loading states
  const isLoading = userScoresLoading || progressLoading || statisticsLoading;
  const isSubmitting = createScoreMutation.isPending;

  // Error states
  const error = userScoresError || progressError || statisticsError;

  return {
    // Data
    userScores,
    allScores,
    progress,
    statistics,
    exercises,
    
    // Computed data
    ...computedData,
    performanceMetrics,
    
    // Helper functions
    getScoreForExercise,
    isExerciseCompleted,
    isExerciseAttempted,
    getExerciseAccuracy,
    
    // Actions
    submitScore,
    refetchUserScores,
    
    // States
    isLoading,
    isSubmitting,
    error,
    
    // Loading states chi tiết
    loadingStates: {
      userScores: userScoresLoading,
      allScores: allScoresLoading,
      progress: progressLoading,
      statistics: statisticsLoading,
    },
    
    // Error states chi tiết
    errors: {
      userScores: userScoresError,
      allScores: allScoresError,
      progress: progressError,
      statistics: statisticsError,
    }
  };
};

export default useScores;