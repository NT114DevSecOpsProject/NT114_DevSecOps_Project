import { QueryClient } from '@tanstack/react-query';

// Cấu hình QueryClient với các options tối ưu
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Thời gian cache dữ liệu (5 phút)
      staleTime: 5 * 60 * 1000,
      // Thời gian giữ dữ liệu trong cache (10 phút)
      gcTime: 10 * 60 * 1000,
      // Retry logic cho failed queries
      retry: (failureCount, error: any) => {
        // Không retry cho lỗi 4xx (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry tối đa 3 lần cho các lỗi khác
        return failureCount < 3;
      },
      // Refetch khi window focus (hữu ích cho real-time data)
      refetchOnWindowFocus: false,
      // Refetch khi reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry logic cho mutations
      retry: (failureCount, error: any) => {
        // Không retry cho lỗi 4xx
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry tối đa 1 lần cho mutations
        return failureCount < 1;
      },
    },
  },
});

// Query keys constants để đảm bảo consistency
export const queryKeys = {
  // Auth queries
  auth: {
    status: ['auth', 'status'] as const,
  },
  // User queries
  users: {
    all: ['users'] as const,
    detail: (id: number) => ['users', id] as const,
  },
  // Exercise queries
  exercises: {
    all: ['exercises'] as const,
    detail: (id: number) => ['exercises', id] as const,
  },
  // Score queries
  scores: {
    all: ['scores'] as const,
    user: ['scores', 'user'] as const,
    detail: (id: number) => ['scores', id] as const,
    byExercise: (exerciseId: number) => ['scores', 'exercise', exerciseId] as const,
  },
} as const;