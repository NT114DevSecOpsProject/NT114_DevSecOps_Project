import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from './useAuth';

// Hook để sử dụng trong components
export const useRequireAuth = (requireAdmin = false) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate({ to: '/auth/login' });
        return;
      }

      if (requireAdmin && !user?.admin) {
        navigate({ to: '/dashboard' });
        return;
      }
    }
  }, [isAuthenticated, user, isLoading, requireAdmin, navigate]);

  return {
    user,
    isAuthenticated,
    isLoading,
    hasAccess: isAuthenticated && (!requireAdmin || user?.admin),
  };
};