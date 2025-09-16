import React, { createContext } from 'react';
import type { ReactNode } from 'react';
import { useAuthStatus, useLogin, useRegister, useLogout } from '../hooks/queries/useAuthQueries';
import type { User, UserLogin, UserRegistration } from '../types/api';

// Interface cho AuthContext
interface AuthContextType {
  // User data và loading states
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  
  // Authentication actions
  login: (credentials: UserLogin) => Promise<void>;
  register: (userData: UserRegistration) => Promise<void>;
  logout: () => Promise<void>;
  
  // Mutation states
  isLoginLoading: boolean;
  isRegisterLoading: boolean;
  isLogoutLoading: boolean;
  
  // Error states
  loginError: Error | null;
  registerError: Error | null;
  logoutError: Error | null;
}

// Tạo context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props cho AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Sử dụng các hooks đã có
  const { data: user, isLoading, error } = useAuthStatus();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  // Wrapper functions để handle mutations
  const login = async (credentials: UserLogin): Promise<void> => {
    await loginMutation.mutateAsync(credentials);
    // User data đã được set vào cache trong onSuccess
  };

  const register = async (userData: UserRegistration): Promise<void> => {
    await registerMutation.mutateAsync(userData);
    // User data đã được set vào cache trong onSuccess
  };

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  };

  // Context value
  const value: AuthContextType = {
    // User data
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    error,
    
    // Actions
    login,
    register,
    logout,
    
    // Mutation loading states
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    
    // Mutation error states
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    logoutError: logoutMutation.error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export context để có thể sử dụng trong hooks
export { AuthContext };