import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/users';
import { queryKeys } from '../../lib/queryClient';
import type { UserRegistration, AdminUserCreate } from '../../types/api';

// Query để lấy tất cả users
export const useUsers = () => {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: userService.getAll,
    staleTime: 5 * 60 * 1000, // 5 phút
  });
};

// Query để lấy user theo ID
export const useUser = (id: number) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => userService.getById(id),
    enabled: !!id && id > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Mutation để tạo user mới (admin only)
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: UserRegistration) => userService.create(userData),
    onSuccess: (newUser) => {
      // Invalidate users list để refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      
      // Add new user to cache nếu có ID
      if (newUser && typeof newUser === 'object' && 'id' in newUser) {
        queryClient.setQueryData(
          queryKeys.users.detail(newUser.id as number),
          newUser
        );
      }
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });
};

// Mutation để tạo user với quyền admin (admin only) - endpoint mới
export const useAdminCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: AdminUserCreate) => userService.adminCreate(userData),
    onSuccess: (response) => {
      // Invalidate users list để refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      
      // Add new user to cache
      if (response?.data?.id) {
        queryClient.setQueryData(
          queryKeys.users.detail(response.data.id),
          response.data
        );
      }
    },
    onError: (error) => {
      console.error('Failed to admin create user:', error);
    },
  });
};

// Hook để prefetch user detail khi hover
export const usePrefetchUser = () => {
  const queryClient = useQueryClient();
  
  return (id: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.users.detail(id),
      queryFn: () => userService.getById(id),
      staleTime: 5 * 60 * 1000,
    });
  };
};

// Mutation để cập nhật user (admin only) - API chưa hỗ trợ
// TODO: Uncomment khi API hỗ trợ endpoint PUT /users/{id}
/*
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, userData }: { userId: number; userData: Partial<any> }) => 
      userService.update(userId, userData),
    onSuccess: (_, { userId }) => {
      // Invalidate users list và user detail
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
    },
    onError: (error) => {
      console.error('Failed to update user:', error);
    },
  });
};
*/

// Mutation để xóa user (admin only) - API chưa hỗ trợ
// TODO: Uncomment khi API hỗ trợ endpoint DELETE /users/{id}
/*
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: number) => userService.delete(userId),
    onSuccess: (_, userId) => {
      // Invalidate users list và remove user detail từ cache
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.removeQueries({ queryKey: queryKeys.users.detail(userId) });
    },
    onError: (error) => {
      console.error('Failed to delete user:', error);
    },
  });
};
*/

// Hook để lấy user statistics
export const useUserStats = () => {
  const { data: users, isLoading, error } = useUsers();
  
  const stats = React.useMemo(() => {
    if (!users) return null;
    
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.active).length;
    const adminUsers = users.filter(user => user.admin).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      adminUsers,
      activeRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
    };
  }, [users]);
  
  return {
    stats,
    isLoading,
    error,
  };
};

