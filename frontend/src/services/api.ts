// Base API client cho CodeLand.io platform

// Lấy API URL từ environment variables hoặc tự detect
function getApiBaseUrl(): string {
  // Try env var first
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.startsWith('http') ? envUrl : `http://${envUrl}`;
  }

  // Auto-detect based on current host
  // If running on localhost:31184 (frontend NodePort), API gateway is at localhost:30336
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // For local development with NodePort services
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:30336';
    }
  }

  // Fallback
  return 'http://localhost:5001';
}

const API_BASE_URL = getApiBaseUrl();

// Log for debugging
if (import.meta.env.DEV) {
  console.log('🌐 API Base URL:', API_BASE_URL);
}

// Custom error class cho API errors
export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Base API client class
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Lấy auth token từ localStorage
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Tạo headers cho request
  private createHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        // Debug log in development
        if (import.meta.env.DEV) {
          console.log('🔐 API Request with auth token:', `${token.substring(0, 20)}...`);
        }
      } else {
        console.warn('⚠️ API Request requires auth but no token found');
      }
    }

    // Debug log in development
    if (import.meta.env.DEV) {
      console.log('📡 API Headers:', headers);
    }

    return headers;
  }

  // Xử lý response và error handling
  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError(
        response.status,
        'Server trả về định dạng không hợp lệ'
      );
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = this.getErrorMessage(data, response.status);
      throw new ApiError(response.status, errorMessage, data);
    }

    return data;
  }

  // Chuyển đổi error messages thành tiếng Việt thân thiện với người dùng
  private getErrorMessage(errorData: any, status: number): string {
    // Nếu có message từ server, sử dụng nó
    if (errorData?.message) {
      return this.translateErrorMessage(errorData.message, status);
    }

    // Fallback messages dựa trên HTTP status
    switch (status) {
      case 400:
        return 'Dữ liệu gửi lên không hợp lệ';
      case 401:
        return 'Bạn cần đăng nhập để thực hiện hành động này';
      case 403:
        return 'Bạn không có quyền thực hiện hành động này';
      case 404:
        return 'Không tìm thấy dữ liệu yêu cầu';
      case 409:
        return 'Dữ liệu đã tồn tại trong hệ thống';
      case 422:
        return 'Dữ liệu không đúng định dạng yêu cầu';
      case 500:
        return 'Lỗi server, vui lòng thử lại sau';
      case 503:
        return 'Hệ thống đang bảo trì, vui lòng thử lại sau';
      default:
        return 'Có lỗi xảy ra, vui lòng thử lại';
    }
  }

  // Dịch error messages từ tiếng Anh sang tiếng Việt
  private translateErrorMessage(message: string, _status: number): string {
    const lowerMessage = message.toLowerCase();

    // Authentication errors
    if (lowerMessage.includes('invalid credentials')) {
      return 'Email hoặc mật khẩu không đúng';
    }
    if (lowerMessage.includes('user already exists')) {
      return 'Email này đã được sử dụng';
    }
    if (lowerMessage.includes('user does not exist')) {
      return 'Tài khoản không tồn tại';
    }
    if (lowerMessage.includes('inactive account')) {
      return 'Tài khoản chưa được kích hoạt';
    }
    if (lowerMessage.includes('unauthorized')) {
      return 'Bạn cần đăng nhập để thực hiện hành động này';
    }

    // Validation errors
    if (lowerMessage.includes('invalid payload')) {
      return 'Dữ liệu gửi lên không hợp lệ';
    }
    if (lowerMessage.includes('required')) {
      return 'Vui lòng điền đầy đủ thông tin bắt buộc';
    }

    // Network errors
    if (lowerMessage.includes('network')) {
      return 'Không thể kết nối đến server';
    }

    // Fallback to original message if no translation found
    return message;
  }

  // GET request
  async get<T>(endpoint: string, requireAuth: boolean = false): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.createHeaders(requireAuth),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Không thể kết nối đến server');
    }
  }

  // POST request
  async post<T>(
    endpoint: string,
    data?: any,
    requireAuth: boolean = false
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.createHeaders(requireAuth),
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Không thể kết nối đến server');
    }
  }

  // PUT request
  async put<T>(
    endpoint: string,
    data?: any,
    requireAuth: boolean = false
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.createHeaders(requireAuth),
        body: data ? JSON.stringify(data) : undefined,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Không thể kết nối đến server');
    }
  }

  // DELETE request
  async delete<T>(endpoint: string, requireAuth: boolean = false): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.createHeaders(requireAuth),
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Không thể kết nối đến server');
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);