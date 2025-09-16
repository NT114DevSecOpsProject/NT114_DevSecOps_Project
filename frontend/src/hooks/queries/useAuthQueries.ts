import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/auth';
import { queryKeys } from '../../lib/queryClient';
import type { UserLogin, UserRegistration } from '../../types/api';

// Query để lấy trạng thái authentication
export const useAuthStatus = () => {
  return useQuery({
    queryKey: queryKeys.auth.status,
    queryFn: authService.getStatus,
    // Chỉ fetch khi có token
    enabled: !!localStorage.getItem('auth_token'),
    // Retry ít hơn cho auth queries
    retry: (failureCount, error: any) => {
      // Không retry nếu là 401 (unauthorized) hoặc 404 (user not found)
      if (error?.status === 401 || error?.status === 404) {
        return false;
      }
      return failureCount < 1;
    },
    // Stale time ngắn hơn cho auth data
    staleTime: 2 * 60 * 1000, // 2 phút
    // TanStack Query v5 không support onError trong useQuery
    // Error handling được thực hiện trong component hoặc mutation
  });
};

// Mutation cho login
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: UserLogin) => {
      // Gọi login API
      const authResponse = await authService.login(credentials);

      // Lưu token vào localStorage
      localStorage.setItem('auth_token', authResponse.auth_token);

      // Gọi /auth/status để lấy thông tin user đầy đủ
      const userStatus = await authService.getStatus();

      return {
        authResponse,
        user: userStatus,
      };
    },
    onSuccess: ({ user }) => {
      // Set user data vào cache
      queryClient.setQueryData(queryKeys.auth.status, user);

      // Invalidate auth queries để đảm bảo consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.status });
    },
    onError: (error) => {
      // Log error cho debugging
      console.error('Login failed:', error);

      // Clear any existing token
      localStorage.removeItem('auth_token');
    },
  });
};

// Mutation cho register
export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: UserRegistration) => {
      // Gọi register API
      const authResponse = await authService.register(userData);

      // Lưu token vào localStorage
      localStorage.setItem('auth_token', authResponse.auth_token);

      // Gọi /auth/status để lấy thông tin user đầy đủ
      const userStatus = await authService.getStatus();

      return {
        authResponse,
        user: userStatus,
      };
    },
    onSuccess: ({ user }) => {
      // Set user data vào cache
      queryClient.setQueryData(queryKeys.auth.status, user);

      // Invalidate auth queries để đảm bảo consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.status });
    },
    onError: (error) => {
      console.error('Registration failed:', error);
      localStorage.removeItem('auth_token');
    },
  });
};

// Mutation cho logout
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      // Clear token
      localStorage.removeItem('auth_token');

      // Clear all cached data
      queryClient.clear();

      // Reset auth status
      queryClient.setQueryData(queryKeys.auth.status, null);
    },
    onError: (error) => {
      console.error('Logout failed:', error);

      // Vẫn clear token và cache ngay cả khi API call failed
      localStorage.removeItem('auth_token');
      queryClient.clear();
    },
    // Luôn thực hiện cleanup ngay cả khi mutation failed
    onSettled: () => {
      localStorage.removeItem('auth_token');
      queryClient.clear();
    },
  });
};

// Hook để check authentication status
export const useIsAuthenticated = () => {
  const { data: user, isLoading } = useAuthStatus();

  return {
    isAuthenticated: !!user,
    user,
    isLoading,
  };
};