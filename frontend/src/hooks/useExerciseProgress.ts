import { useMemo } from 'react';
import { useUserScores } from './queries/useScoreQueries';
import { useExercises } from './queries/useExerciseQueries';
import { getCorrectAnswersCount, getResultsArray, hasCorrectAnswers } from '../utils/scoreUtils';

export interface ExerciseProgress {
  exerciseId: number;
  isCompleted: boolean;
  isAttempted: boolean;
  attemptCount: number;
  bestScore?: {
    id: number;
    all_correct: boolean;
    results: boolean[];
    user_results: string[];
  };
  lastAttempt?: {
    id: number;
    all_correct: boolean;
    results: boolean[];
    user_results: string[];
  };
}

export const useExerciseProgress = () => {
  const { data: userScores, isLoading: scoresLoading, error: scoresError } = useUserScores();
  const { data: exercises, isLoading: exercisesLoading, error: exercisesError } = useExercises();

  const exerciseProgress = useMemo(() => {
    if (!userScores || !exercises) return [];

    const progressMap = new Map<number, ExerciseProgress>();

    // Khởi tạo tất cả bài tập với trạng thái chưa thử
    exercises.forEach(exercise => {
      progressMap.set(exercise.id, {
        exerciseId: exercise.id,
        isCompleted: false,
        isAttempted: false,
        attemptCount: 0,
      });
    });

    // Xử lý scores của user
    userScores.forEach(score => {
      const exerciseId = score.exercise_id;
      const currentProgress = progressMap.get(exerciseId);

      if (currentProgress) {
        // Cập nhật số lần thử
        currentProgress.attemptCount += 1;
        currentProgress.isAttempted = true;

        // Ensure proper type conversion
        const userResults = score.user_results || [];

        // Calculate all_correct based on results (don't trust API field)
        const allCorrect = hasCorrectAnswers(score);

        // Debug log to see the difference
        if (Boolean(score.all_correct) !== allCorrect) {
          console.log(`Exercise ${exerciseId} Score ${score.id}: API all_correct=${score.all_correct}, Calculated=${allCorrect}, Results=${JSON.stringify(score.results)}`);
        }

        // Cập nhật lần thử gần nhất
        if (!currentProgress.lastAttempt || score.id > currentProgress.lastAttempt.id) {
          currentProgress.lastAttempt = {
            id: score.id,
            all_correct: allCorrect,
            results: getResultsArray(score.results),
            user_results: userResults,
          };
        }

        // Cập nhật điểm tốt nhất (ưu tiên all_correct, sau đó là score mới nhất nếu cùng all_correct, cuối cùng là số test case đúng nhiều nhất)
        if (!currentProgress.bestScore ||
          (allCorrect && !currentProgress.bestScore.all_correct) ||
          (allCorrect && currentProgress.bestScore.all_correct && score.id > currentProgress.bestScore.id) ||
          (!allCorrect && !currentProgress.bestScore.all_correct &&
            (getCorrectAnswersCount(score.results) > getCorrectAnswersCount(currentProgress.bestScore.results) ||
              (getCorrectAnswersCount(score.results) === getCorrectAnswersCount(currentProgress.bestScore.results) &&
                score.id > currentProgress.bestScore.id)))) {
          currentProgress.bestScore = {
            id: score.id,
            all_correct: allCorrect,
            results: getResultsArray(score.results),
            user_results: userResults,
          };
        }

        // Đánh dấu hoàn thành nếu có ít nhất một lần all_correct = true (calculated)
        if (allCorrect) {
          currentProgress.isCompleted = true;
        }
      }
    });

    return Array.from(progressMap.values());
  }, [userScores, exercises]);

  // Tính toán thống kê tổng quan
  const progressStats = useMemo(() => {
    const totalExercises = exerciseProgress.length;
    const completedExercises = exerciseProgress.filter(p => p.isCompleted).length;
    const attemptedExercises = exerciseProgress.filter(p => p.isAttempted).length;
    const notAttemptedExercises = totalExercises - attemptedExercises;

    return {
      totalExercises,
      completedExercises,
      attemptedExercises,
      notAttemptedExercises,
      completionRate: totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0,
      attemptRate: totalExercises > 0 ? (attemptedExercises / totalExercises) * 100 : 0,
    };
  }, [exerciseProgress]);

  // Helper functions
  const getExerciseProgress = (exerciseId: number): ExerciseProgress | undefined => {
    return exerciseProgress.find(p => p.exerciseId === exerciseId);
  };

  const isExerciseCompleted = (exerciseId: number): boolean => {
    return getExerciseProgress(exerciseId)?.isCompleted || false;
  };

  const isExerciseAttempted = (exerciseId: number): boolean => {
    return getExerciseProgress(exerciseId)?.isAttempted || false;
  };

  const getExerciseAttemptCount = (exerciseId: number): number => {
    return getExerciseProgress(exerciseId)?.attemptCount || 0;
  };

  return {
    exerciseProgress,
    progressStats,
    getExerciseProgress,
    isExerciseCompleted,
    isExerciseAttempted,
    getExerciseAttemptCount,
    isLoading: scoresLoading || exercisesLoading,
    error: scoresError || exercisesError,
  };
};

// Hook để lấy progress của một bài tập cụ thể
export const useExerciseProgressById = (exerciseId: number) => {
  const { getExerciseProgress, isExerciseCompleted, isExerciseAttempted, getExerciseAttemptCount, isLoading, error } = useExerciseProgress();

  return {
    progress: getExerciseProgress(exerciseId),
    isCompleted: isExerciseCompleted(exerciseId),
    isAttempted: isExerciseAttempted(exerciseId),
    attemptCount: getExerciseAttemptCount(exerciseId),
    isLoading,
    error,
  };
};