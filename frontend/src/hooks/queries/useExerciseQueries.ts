import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exerciseService } from '../../services/exercises';
import { queryKeys } from '../../lib/queryClient';
import type { ExerciseCreate, ExerciseValidationRequest } from '../../types/api';

// Query để lấy tất cả exercises
export const useExercises = () => {
  return useQuery({
    queryKey: queryKeys.exercises.all,
    queryFn: exerciseService.getAll,
    // Cache lâu hơn cho exercises vì ít thay đổi
    staleTime: 10 * 60 * 1000, // 10 phút
  });
};

// Query để lấy exercise theo ID
export const useExercise = (id: number) => {
  return useQuery({
    queryKey: queryKeys.exercises.detail(id),
    queryFn: () => exerciseService.getById(id),
    // Chỉ fetch khi có ID hợp lệ
    enabled: !!id && id > 0,
    staleTime: 10 * 60 * 1000,
  });
};

// Mutation để tạo exercise mới (admin only)
export const useCreateExercise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (exerciseData: ExerciseCreate) => exerciseService.create(exerciseData),
    onSuccess: (newExercise) => {
      // Invalidate exercises list để refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.exercises.all });
      
      // Optionally add the new exercise to cache if it has an id
      if ('id' in newExercise && typeof newExercise.id === 'number') {
        queryClient.setQueryData(
          queryKeys.exercises.detail(newExercise.id),
          newExercise
        );
      }
    },
    onError: (error) => {
      console.error('Failed to create exercise:', error);
    },
  });
};

// Hook để prefetch exercise detail khi hover
export const usePrefetchExercise = () => {
  const queryClient = useQueryClient();
  
  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.exercises.detail(id),
      queryFn: () => exerciseService.getById(id),
      // Prefetch data sẽ stale sau 5 phút
      staleTime: 5 * 60 * 1000,
    });
  };
};

// Hook để lấy exercises với filtering và pagination (future enhancement)
export const useExercisesWithFilters = (filters?: {
  difficulty?: number;
  tags?: string[];
  search?: string;
}) => {
  return useQuery({
    queryKey: [...queryKeys.exercises.all, 'filtered', filters],
    queryFn: async () => {
      const exercises = await exerciseService.getAll();
      
      // Client-side filtering (có thể chuyển sang server-side sau)
      let filteredExercises = exercises;
      
      if (filters?.search) {
        filteredExercises = filteredExercises.filter(exercise =>
          exercise.title.toLowerCase().includes(filters.search!.toLowerCase()) ||
          exercise.body.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }
      
      if (filters?.difficulty !== undefined) {
        filteredExercises = filteredExercises.filter(exercise =>
          exercise.difficulty === filters.difficulty
        );
      }
      
      return filteredExercises;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
};

// Mutation để validate code
export const useValidateCode = () => {
  return useMutation({
    mutationFn: (request: ExerciseValidationRequest) => exerciseService.validateCode(request),
    onError: (error) => {
      console.error('Failed to validate code:', error);
    },
  });
};

// Mutation để update exercise (admin only)
export const useUpdateExercise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExerciseCreate> }) => 
      exerciseService.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate exercises list và detail
      queryClient.invalidateQueries({ queryKey: queryKeys.exercises.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.exercises.detail(id) });
    },
    onError: (error) => {
      console.error('Failed to update exercise:', error);
    },
  });
};

// Mutation để delete exercise (admin only)
export const useDeleteExercise = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => exerciseService.delete(id),
    onSuccess: (_, id) => {
      // Invalidate exercises list
      queryClient.invalidateQueries({ queryKey: queryKeys.exercises.all });
      // Remove exercise detail từ cache
      queryClient.removeQueries({ queryKey: queryKeys.exercises.detail(id) });
    },
    onError: (error) => {
      console.error('Failed to delete exercise:', error);
    },
  });
};