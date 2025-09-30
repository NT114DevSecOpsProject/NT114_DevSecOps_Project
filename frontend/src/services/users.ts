// User service cho CodeLand.io platform
import { apiClient, ApiError } from './api';
import type {
  User,
  UserRegistration,
  AdminUserCreate,
  UsersResponse,
  UserResponse,
  SuccessResponse,
  PingResponse,
} from '../types/api';

export class UserService {
  // Ping users service để kiểm tra health
  async ping(): Promise<PingResponse> {
    try {
      return await apiClient.get<PingResponse>('/users/ping');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể kết nối đến dịch vụ người dùng');
    }
  }

  // Lấy tất cả người dùng
  async getAll(): Promise<User[]> {
    try {
      const response = await apiClient.get<UsersResponse>('/users/', true);
      return response.data.users;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tải danh sách người dùng');
    }
  }

  // Lấy người dùng theo ID
  async getById(userId: number): Promise<User> {
    try {
      const response = await apiClient.get<UserResponse>(`/users/${userId}`, true);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          throw new ApiError(404, 'Không tìm thấy người dùng');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể tải thông tin người dùng');
    }
  }

  // Tạo người dùng mới (admin only)
  async create(userData: UserRegistration): Promise<SuccessResponse> {
    try {
      // Validate dữ liệu trước khi gửi
      const validation = this.validateUserData(userData);
      if (!validation.isValid) {
        throw new ApiError(400, validation.errors.join(', '));
      }

      return await apiClient.post<SuccessResponse>('/users/', userData, true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để tạo người dùng');
        }
        if (error.status === 403) {
          throw new ApiError(403, 'Chỉ admin mới có thể tạo người dùng');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể tạo người dùng mới');
    }
  }

  // Tạo người dùng với quyền admin (admin only) - endpoint mới
  async adminCreate(userData: AdminUserCreate): Promise<{ status: string; message: string; data: User }> {
    try {
      // Validate dữ liệu cơ bản trước khi gửi
      const validation = this.validateUserData({
        username: userData.username,
        email: userData.email,
        password: userData.password,
      });
      if (!validation.isValid) {
        throw new ApiError(400, validation.errors.join(', '));
      }

      // Prepare data với defaults
      const requestData: AdminUserCreate = {
        username: userData.username.trim(),
        email: userData.email.trim(),
        password: userData.password,
        admin: userData.admin ?? false,
        active: userData.active ?? true,
      };

      return await apiClient.post<{ status: string; message: string; data: User }>('/users/admin_create', requestData, true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để tạo người dùng');
        }
        if (error.status === 403) {
          throw new ApiError(403, 'Chỉ admin mới có thể tạo người dùng với quyền admin');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể tạo người dùng mới');
    }
  }

  // Tìm kiếm người dùng theo username hoặc email
  async search(query: string): Promise<User[]> {
    try {
      const users = await this.getAll();
      const lowerQuery = query.toLowerCase();
      
      return users.filter(user => 
        user.username.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tìm kiếm người dùng');
    }
  }

  // Lấy danh sách admin users
  async getAdmins(): Promise<User[]> {
    try {
      const users = await this.getAll();
      return users.filter(user => user.admin === true);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tải danh sách admin');
    }
  }

  // Lấy danh sách active users
  async getActiveUsers(): Promise<User[]> {
    try {
      const users = await this.getAll();
      return users.filter(user => user.active === true);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tải danh sách người dùng hoạt động');
    }
  }

  // Kiểm tra xem email đã tồn tại chưa
  async isEmailExists(email: string): Promise<boolean> {
    try {
      const users = await this.getAll();
      return users.some(user => user.email.toLowerCase() === email.toLowerCase());
    } catch {
      // Nếu không thể kiểm tra, return false để không block user
      return false;
    }
  }

  // Kiểm tra xem username đã tồn tại chưa
  async isUsernameExists(username: string): Promise<boolean> {
    try {
      const users = await this.getAll();
      return users.some(user => user.username.toLowerCase() === username.toLowerCase());
    } catch {
      // Nếu không thể kiểm tra, return false để không block user
      return false;
    }
  }

  // Validate user data trước khi gửi
  validateUserData(data: UserRegistration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate username
    if (!data.username || data.username.trim().length === 0) {
      errors.push('Tên người dùng không được để trống');
    } else if (data.username.length < 3) {
      errors.push('Tên người dùng phải có ít nhất 3 ký tự');
    } else if (data.username.length > 128) {
      errors.push('Tên người dùng không được vượt quá 128 ký tự');
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.push('Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới');
    }

    // Validate email
    if (!data.email || data.email.trim().length === 0) {
      errors.push('Email không được để trống');
    } else if (data.email.length > 128) {
      errors.push('Email không được vượt quá 128 ký tự');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Email không đúng định dạng');
    }

    // Validate password
    if (!data.password || data.password.length === 0) {
      errors.push('Mật khẩu không được để trống');
    } else if (data.password.length < 6) {
      errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    } else if (data.password.length > 128) {
      errors.push('Mật khẩu không được vượt quá 128 ký tự');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate email format
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Validate username format
  isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,128}$/.test(username);
  }

  // Check password strength
  checkPasswordStrength(password: string): {
    score: number; // 0-4
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score++;
    } else {
      feedback.push('Mật khẩu nên có ít nhất 8 ký tự');
    }

    if (/[a-z]/.test(password)) {
      score++;
    } else {
      feedback.push('Mật khẩu nên có ít nhất 1 chữ thường');
    }

    if (/[A-Z]/.test(password)) {
      score++;
    } else {
      feedback.push('Mật khẩu nên có ít nhất 1 chữ hoa');
    }

    if (/[0-9]/.test(password)) {
      score++;
    } else {
      feedback.push('Mật khẩu nên có ít nhất 1 số');
    }

    if (/[^a-zA-Z0-9]/.test(password)) {
      score++;
    } else {
      feedback.push('Mật khẩu nên có ít nhất 1 ký tự đặc biệt');
    }

    return { score, feedback };
  }
}

// Export singleton instance
export const userService = new UserService();