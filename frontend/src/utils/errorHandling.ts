// Error handling utilities cho CodeLand.io platform
import { ApiError } from '../services/api';

// Interface cho error context
export interface ErrorContext {
  action: string;
  component?: string;
  userId?: number;
  timestamp: Date;
  userAgent?: string;
  url?: string;
}

// Error logger
export class ErrorLogger {
  private static instance: ErrorLogger;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  // Log error với context
  logError(error: Error | ApiError, context?: Partial<ErrorContext>): void {
    const errorInfo = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: {
        action: context?.action || 'unknown',
        component: context?.component || 'unknown',
        userId: context?.userId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context,
      },
    };

    // Log to console trong development
    if (import.meta.env.DEV) {
      console.error('Error logged:', errorInfo);
    }

    // Trong production, có thể gửi lên error tracking service
    if (import.meta.env.PROD) {
      this.sendToErrorService(errorInfo);
    }
  }

  // Gửi error lên external service (implement sau)
  private sendToErrorService(_errorInfo: any): void {
    // Có thể integrate với Sentry, LogRocket, hoặc service khác
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorInfo)
    // }).catch(() => {
    //   // Ignore errors when logging errors
    // });
  }
}

// Error boundary helper
export const handleError = (
  error: Error | ApiError,
  context?: Partial<ErrorContext>
): void => {
  const logger = ErrorLogger.getInstance();
  logger.logError(error, context);
};

// Convert error thành user-friendly message
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Translate common error messages
    const message = error.message.toLowerCase();
    
    if (message.includes('network')) {
      return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.';
    }
    
    if (message.includes('timeout')) {
      return 'Yêu cầu bị timeout. Vui lòng thử lại.';
    }
    
    if (message.includes('cors')) {
      return 'Lỗi CORS. Vui lòng liên hệ admin.';
    }
    
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Có lỗi không xác định xảy ra';
};

// Retry mechanism cho API calls
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Không retry cho một số lỗi cụ thể
      if (error instanceof ApiError) {
        // Không retry cho authentication errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }
        
        // Không retry cho validation errors
        if (error.status === 400 || error.status === 422) {
          throw error;
        }
        
        // Không retry cho not found
        if (error.status === 404) {
          throw error;
        }
      }

      // Chờ trước khi retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError!;
};

// Debounce function cho API calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function cho API calls
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Error boundary component helper
// Note: Để sử dụng được, cần import React trong component sử dụng
export const createErrorBoundaryClass = (
  fallbackComponent: any // React.ComponentType<{ error: Error; resetError: () => void }>
) => {
  // Trả về class definition để sử dụng với React
  return {
    createBoundary: (React: any) => {
      return class ErrorBoundary extends React.Component {
        constructor(props: any) {
          super(props);
          this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error: Error) {
          return { hasError: true, error };
        }

        componentDidCatch(error: Error, _errorInfo: any) {
          handleError(error, {
            action: 'component_error',
            component: 'ErrorBoundary',
          });
        }

        resetError = () => {
          this.setState({ hasError: false, error: null });
        };

        render() {
          const state = this.state as { hasError: boolean; error: Error | null };
          if (state.hasError && state.error) {
            const FallbackComponent = fallbackComponent;
            return React.createElement(FallbackComponent, {
              error: state.error,
              resetError: this.resetError
            });
          }

          return (this.props as any).children;
        }
      };
    }
  };
};

// Validation helpers
export const validateRequired = (value: any, fieldName: string): string | null => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} là bắt buộc`;
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  if (!email) return 'Email là bắt buộc';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email không đúng định dạng';
  }
  
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Mật khẩu là bắt buộc';
  
  if (password.length < 6) {
    return 'Mật khẩu phải có ít nhất 6 ký tự';
  }
  
  return null;
};

export const validateUsername = (username: string): string | null => {
  if (!username) return 'Tên người dùng là bắt buộc';
  
  if (username.length < 3) {
    return 'Tên người dùng phải có ít nhất 3 ký tự';
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới';
  }
  
  return null;
};