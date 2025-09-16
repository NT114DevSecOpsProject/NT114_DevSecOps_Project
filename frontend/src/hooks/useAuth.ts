import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import type { User } from '../types/api';

// Custom hook để sử dụng AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  
  return context;
};

// Hook để check admin permissions
export const useIsAdmin = (): boolean => {
  const { user } = useAuth();
  return user?.admin || false;
};

// Hook để check authentication status
export const useRequireAuth = (): User => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated || !user) {
    throw new Error('Yêu cầu đăng nhập để truy cập tính năng này');
  }
  
  return user;
};