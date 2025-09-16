// Authentication service cho CodeLand.io platform
import { apiClient, ApiError } from './api';
import type {
  AuthResponse,
  SuccessResponse,
  User,
  UserLogin,
  UserRegistration,
  UserResponse,
} from '../types/api';

export class AuthService {
  // Đăng ký tài khoản mới
  async register(userData: UserRegistration): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', userData);
      
      // Lưu token vào localStorage sau khi đăng ký thành công
      if (response.auth_token) {
        localStorage.setItem('auth_token', response.auth_token);
      }
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể đăng ký tài khoản, vui lòng thử lại');
    }
  }

  // Đăng nhập
  async login(credentials: UserLogin): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      
      // Lưu token vào localStorage sau khi đăng nhập thành công
      if (response.auth_token) {
        localStorage.setItem('auth_token', response.auth_token);
      }
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể đăng nhập, vui lòng thử lại');
    }
  }

  // Đăng xuất
  async logout(): Promise<SuccessResponse> {
    try {
      const response = await apiClient.get<SuccessResponse>('/auth/logout', true);
      
      // Xóa token khỏi localStorage
      localStorage.removeItem('auth_token');
      
      return response;
    } catch (error) {
      // Vẫn xóa token local ngay cả khi API call thất bại
      localStorage.removeItem('auth_token');
      
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Có lỗi xảy ra khi đăng xuất');
    }
  }

  // Lấy thông tin user hiện tại
  async getStatus(): Promise<User> {
    try {
      const response = await apiClient.get<UserResponse>('/auth/status', true);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        // Nếu token không hợp lệ, xóa nó khỏi localStorage
        if (error.status === 401) {
          localStorage.removeItem('auth_token');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể lấy thông tin người dùng');
    }
  }

  // Kiểm tra xem user có đang đăng nhập không
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  // Lấy token hiện tại
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Xóa token (logout local)
  clearToken(): void {
    localStorage.removeItem('auth_token');
  }

  // Refresh token (nếu cần thiết trong tương lai)
  async refreshToken(): Promise<string> {
    // Hiện tại API chưa hỗ trợ refresh token
    // Có thể implement sau khi API được cập nhật
    throw new ApiError(501, 'Tính năng refresh token chưa được hỗ trợ');
  }
}

// Export singleton instance
export const authService = new AuthService();