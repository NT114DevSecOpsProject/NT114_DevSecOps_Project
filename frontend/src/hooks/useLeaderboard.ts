import { useQuery } from '@tanstack/react-query';
import { scoreService } from '../services/scores';
import { userService } from '../services/users';
import { exerciseService } from '../services/exercises';
import { calculateAccuracy } from '../utils/scoreUtils';
import type { User, Score, Exercise } from '../types/api';

export interface LeaderboardUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  totalScore: number;
  completedExercises: number;
  rank: number;
  lastActiveAt?: string;
  // Additional stats for detailed ranking (made optional to match usage and fix TS2339 errors)
  totalAttempts?: number;
  averageAccuracy?: number;
  easyCompleted?: number;
  mediumCompleted?: number;
  hardCompleted?: number;
}

// Calculate leaderboard từ real data với logic tính điểm advanced
const calculateLeaderboard = (users: User[], scores: Score[], exercises: Exercise[]): LeaderboardUser[] => {
  // Create exercise difficulty map for scoring
  const exerciseMap = new Map<number, Exercise>();
  exercises.forEach(exercise => {
    exerciseMap.set(exercise.id, exercise);
  });

  // Define scoring system based on difficulty - more reasonable points
  const getExercisePoints = (exercise: Exercise, isComplete: boolean, accuracy: number): number => {
    const difficultyPoints: Record<number, number> = {
      0: 10,   // Easy: 10 points max
      1: 20,   // Medium: 20 points max  
      2: 30    // Hard: 30 points max
    };

    const basePoints = difficultyPoints[exercise.difficulty] || 10;
    
    if (isComplete) {
      return basePoints; // Full points for completion
    } else {
      // Partial points based on accuracy (minimum 20% of base points)
      return Math.floor(Math.max(basePoints * 0.2, basePoints * accuracy));
    }
  };

  // Group scores by user_id and get best score per exercise
  const userBestScores = new Map<number, Map<number, Score>>();
  
  scores.forEach(score => {
    if (!userBestScores.has(score.user_id)) {
      userBestScores.set(score.user_id, new Map());
    }
    
    const userScores = userBestScores.get(score.user_id)!;
    const existingScore = userScores.get(score.exercise_id);
    
    // Keep the best score (highest accuracy or completion)
    if (!existingScore) {
      userScores.set(score.exercise_id, score);
    } else {
      const existingAccuracy = calculateAccuracy(existingScore.results) / 100;
      const currentAccuracy = calculateAccuracy(score.results) / 100;
      
      // Prioritize completed > accuracy > newer attempt
      if (score.all_correct && !existingScore.all_correct) {
        userScores.set(score.exercise_id, score);
      } else if (score.all_correct === existingScore.all_correct && currentAccuracy > existingAccuracy) {
        userScores.set(score.exercise_id, score);
      }
    }
  });

  // Calculate stats for each user
  const leaderboardData = users.map(user => {
    const userScores = userBestScores.get(user.id) || new Map();
    
    let totalScore = 0;
    let completedExercises = 0;
    let totalAttempts = 0;
    let totalAccuracy = 0;
    let easyCompleted = 0;
    let mediumCompleted = 0;
    let hardCompleted = 0;

    // Calculate scores for each attempted exercise
    userScores.forEach((score, exerciseId) => {
      const exercise = exerciseMap.get(exerciseId);
      if (!exercise) return;

      totalAttempts++;
      
      const accuracy = calculateAccuracy(score.results) / 100;
      
      totalAccuracy += accuracy;
      
      if (score.all_correct) {
        completedExercises++;
        if (exercise.difficulty === 0) easyCompleted++;
        else if (exercise.difficulty === 1) mediumCompleted++;
        else if (exercise.difficulty === 2) hardCompleted++;
      }

      // Add points based on exercise difficulty and performance
      totalScore += getExercisePoints(exercise, score.all_correct, accuracy);
    });

    const averageAccuracy = totalAttempts > 0 ? totalAccuracy / totalAttempts : 0;

    return {
      id: user.id.toString(),
      name: user.username, // Fix: use username instead of name
      email: user.email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=150&background=random`, // Generate avatar
      totalScore: Math.floor(totalScore),
      completedExercises,
      rank: 0, // Will be set after sorting
      lastActiveAt: new Date().toISOString(),
      // Additional stats for detailed ranking
      totalAttempts,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      easyCompleted,
      mediumCompleted,
      hardCompleted
    };
  });

  // Advanced sorting algorithm
  leaderboardData.sort((a, b) => {
    // Primary: Total score
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    
    // Secondary: Number of completed exercises
    if (b.completedExercises !== a.completedExercises) {
      return b.completedExercises - a.completedExercises;
    }
    
    // Tertiary: Average accuracy
    if (b.averageAccuracy !== a.averageAccuracy) {
      return b.averageAccuracy - a.averageAccuracy;
    }
    
    // Quaternary: Hard exercises completed (bonus points)
    if (b.hardCompleted !== a.hardCompleted) {
      return b.hardCompleted - a.hardCompleted;
    }
    
    // Final: Medium exercises completed
    return b.mediumCompleted - a.mediumCompleted;
  });

  // Set ranks with tie handling
  let currentRank = 1;
  leaderboardData.forEach((user, index) => {
    if (index > 0) {
      const prevUser = leaderboardData[index - 1];
      // Check if current user has same score as previous user
      if (user.totalScore !== prevUser.totalScore || 
          user.completedExercises !== prevUser.completedExercises ||
          user.averageAccuracy !== prevUser.averageAccuracy) {
        currentRank = index + 1;
      }
    }
    user.rank = currentRank;
  });

  return leaderboardData;
};

// API function để lấy leaderboard
const fetchLeaderboard = async (limit = 50): Promise<LeaderboardUser[]> => {
  try {
    // Calculate leaderboard from users, scores, and exercises
    console.log('🔄 Calculating leaderboard from users, scores, and exercises APIs...');
    
    const [users, scores, exercises] = await Promise.all([
      userService.getAll(),
      scoreService.getAll(),
      exerciseService.getAll()
    ]);

    console.log(`✅ Data fetched successfully:`, {
      users: users.length,
      scores: scores.length,
      exercises: exercises.length
    });

    // Filter out users with no scores to make leaderboard more meaningful
    const usersWithScores = users.filter(user => 
      scores.some(score => score.user_id === user.id)
    );

    if (usersWithScores.length === 0) {
      console.warn('⚠️ No users with scores found, using all users');
      const leaderboard = calculateLeaderboard(users, scores, exercises);
      return leaderboard.slice(0, limit);
    }

    const leaderboard = calculateLeaderboard(usersWithScores, scores, exercises);
    console.log(`🏆 Leaderboard calculated with ${leaderboard.length} ranked users`);
    
    return leaderboard.slice(0, limit);
    
  } catch (error) {
    console.warn('❌ Failed to fetch real data, using mock data:', error);
    // Fallback với mock data nếu APIs không sẵn sàng
    return generateMockLeaderboard();
  }
};

// Mock data cho development - realistic scoring
const generateMockLeaderboard = (): LeaderboardUser[] => {
  const names = [
    'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thị Dung',
    'Hoàng Minh Hiếu', 'Vũ Thị Kim', 'Đỗ Văn Long', 'Bùi Thị Mai',
    'Ngô Văn Nam', 'Đặng Thị Oanh', 'Lý Văn Phúc', 'Châu Thị Quỳnh',
    'Tô Văn Sơn', 'Võ Thị Tuyết', 'Phan Văn Ước', 'Lương Thị Vân',
    'Đinh Văn Xuân', 'Trịnh Thị Yến', 'Dương Văn Zung', 'Cao Thị Ánh'
  ];

  return names.map((name, index) => {
    // More realistic scoring: 10-30 points per exercise
    const completedExercises = Math.max(1, Math.floor(Math.random() * 15) + 1);
    const baseScore = completedExercises * (10 + Math.random() * 20); // 10-30 points per exercise
    const totalScore = Math.floor(baseScore * (1 - index * 0.05)); // Decrease by rank
    
    return {
      id: `user-${index + 1}`,
      name,
      email: `user${index + 1}@example.com`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=150&background=random`,
      totalScore: Math.max(10, totalScore), // Minimum 10 points
      completedExercises,
      rank: index + 1,
      lastActiveAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalAttempts: completedExercises + Math.floor(Math.random() * 5),
      averageAccuracy: 0.6 + Math.random() * 0.4, // 60-100% accuracy
      easyCompleted: Math.floor(completedExercises * 0.4),
      mediumCompleted: Math.floor(completedExercises * 0.4),
      hardCompleted: Math.floor(completedExercises * 0.2)
    };
  }).sort((a, b) => b.totalScore - a.totalScore)
    .map((user, index) => ({ ...user, rank: index + 1 }));
};

// React Query hook với advanced configuration
export const useLeaderboard = (limit = 50) => {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => fetchLeaderboard(limit),
    staleTime: 3 * 60 * 1000, // 3 minutes - balance between freshness and performance
    gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always refetch on mount for fresh leaderboard
    retry: (failureCount, error) => {
      // Smart retry logic
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        // Don't retry auth errors or client errors
        if (status === 401 || status === 403 || status === 404) return false;
      }
      return failureCount < 3; // Allow 3 retries for better reliability
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable background refetch for real-time updates
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes in background
    refetchIntervalInBackground: false, // Only when tab is active
  });
};

// Hook để lấy top users
export const useTopUsers = (count = 3) => {
  const { data, ...rest } = useLeaderboard(count);
  
  return {
    ...rest,
    data: data?.slice(0, count) || []
  };
};

// Hook để lấy position của user hiện tại
export const useUserRank = (userId: string) => {
  const { data: leaderboard, ...rest } = useLeaderboard();
  
  const userRank = leaderboard?.find(user => user.id === userId);
  
  return {
    ...rest,
    data: userRank || null,
    rank: userRank?.rank || null,
    totalUsers: leaderboard?.length || 0
  };
};

// Utility functions
export const getLeaderboardStats = (leaderboard: LeaderboardUser[]) => {
  if (!leaderboard || leaderboard.length === 0) {
    return {
      totalUsers: 0,
      averageScore: 0,
      topScore: 0,
      totalExercises: 0
    };
  }

  const totalUsers = leaderboard.length;
  const totalScore = leaderboard.reduce((sum, user) => sum + user.totalScore, 0);
  const averageScore = Math.floor(totalScore / totalUsers);
  const topScore = Math.max(...leaderboard.map(user => user.totalScore));
  const totalExercises = leaderboard.reduce((sum, user) => sum + user.completedExercises, 0);

  return {
    totalUsers,
    averageScore,
    topScore,
    totalExercises
  };
};

export const getRankBadge = (rank: number) => {
  if (rank === 1) return { label: 'Quán quân', color: 'yellow' };
  if (rank === 2) return { label: 'Á quân', color: 'gray' };
  if (rank === 3) return { label: 'Hạng ba', color: 'orange' };
  if (rank <= 10) return { label: `Top ${rank}`, color: 'blue' };
  if (rank <= 50) return { label: `Top 50`, color: 'green' };
  if (rank <= 100) return { label: `Top 100`, color: 'purple' };
  return { label: `#${rank}`, color: 'gray' };
};