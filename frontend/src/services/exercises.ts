// Exercise service cho CodeLand.io platform
import { apiClient, ApiError } from './api';
import type {
  Exercise,
  ExerciseCreate,
  ExercisesResponse,
  ExerciseResponse,
  ExerciseValidationRequest,
  ExerciseValidationResponse,
  SuccessResponse,
  PingResponse,
} from '../types/api';

export class ExerciseService {
  // Ping exercises service để kiểm tra health
  async ping(): Promise<PingResponse> {
    try {
      return await apiClient.get<PingResponse>('/exercises/ping');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể kết nối đến dịch vụ bài tập');
    }
  }

  // Lấy tất cả bài tập
  async getAll(): Promise<Exercise[]> {
    try {
      const response = await apiClient.get<ExercisesResponse>('/exercises/', true);
      return response.data.exercises;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tải danh sách bài tập');
    }
  }

  // Lấy bài tập theo ID
  async getById(id: number): Promise<Exercise> {
    try {
      const response = await apiClient.get<ExerciseResponse>(`/exercises/${id}`, true);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tải bài tập');
    }
  }

  // Tạo bài tập mới
  async create(exerciseData: ExerciseCreate): Promise<SuccessResponse> {
    try {
      return await apiClient.post<SuccessResponse>('/exercises/', exerciseData, true);
    } catch (error) {
      if (error instanceof ApiError) {
        // Customize error messages cho exercise creation
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để tạo bài tập');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể tạo bài tập mới');
    }
  }

  // Cập nhật bài tập
  async update(id: number, exerciseData: Partial<ExerciseCreate>): Promise<SuccessResponse> {
    try {
      return await apiClient.put<SuccessResponse>(`/exercises/${id}`, exerciseData, true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để cập nhật bài tập');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể cập nhật bài tập');
    }
  }

  // Xóa bài tập (API chưa hỗ trợ, chuẩn bị cho tương lai)
  async delete(id: number): Promise<SuccessResponse> {
    // API hiện tại chưa có endpoint delete exercise
    // Sẽ được hỗ trợ trong phiên bản tương lai của API
    console.log(`Attempted to delete exercise with id: ${id}`);
    throw new ApiError(501, 'API hiện tại chưa hỗ trợ xóa bài tập. Vui lòng liên hệ admin để được hỗ trợ.');
  }

  // Tìm kiếm bài tập (local search trong danh sách đã tải)
  async search(query: string): Promise<Exercise[]> {
    try {
      const exercises = await this.getAll();
      const lowerQuery = query.toLowerCase();
      
      return exercises.filter(exercise => 
        exercise.body.toLowerCase().includes(lowerQuery) ||
        exercise.test_cases.some(tc => tc.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tìm kiếm bài tập');
    }
  }

  // Validate code của user
  async validateCode(request: ExerciseValidationRequest): Promise<ExerciseValidationResponse> {
    try {
      return await apiClient.post<ExerciseValidationResponse>('/exercises/validate_code', request, true);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể validate code');
    }
  }

  // Lọc bài tập theo độ khó
  async getByDifficulty(difficulty: 0 | 1 | 2): Promise<Exercise[]> {
    try {
      const exercises = await this.getAll();
      return exercises.filter(exercise => exercise.difficulty === difficulty);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể lọc bài tập theo độ khó');
    }
  }

  // Validate exercise data trước khi gửi
  validateExerciseData(data: ExerciseCreate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Tiêu đề bài tập không được để trống');
    }

    if (!data.body || data.body.trim().length === 0) {
      errors.push('Nội dung bài tập không được để trống');
    }

    if (!data.test_cases || data.test_cases.length === 0) {
      errors.push('Phải có ít nhất một test case');
    }

    if (!data.solutions || data.solutions.length === 0) {
      errors.push('Phải có ít nhất một solution');
    }

    if (data.test_cases && data.solutions && data.test_cases.length !== data.solutions.length) {
      errors.push('Số lượng test cases và solutions phải bằng nhau');
    }

    if (data.difficulty < 0 || data.difficulty > 2) {
      errors.push('Độ khó phải từ 0 đến 2');
    }

    if (data.title && data.title.length > 200) {
      errors.push('Tiêu đề không được vượt quá 200 ký tự');
    }

    if (data.body && data.body.length > 2000) {
      errors.push('Nội dung bài tập không được vượt quá 2000 ký tự');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper để get difficulty label
  getDifficultyLabel(difficulty: number): string {
    switch (difficulty) {
      case 0: return 'Dễ';
      case 1: return 'Trung bình';
      case 2: return 'Khó';
      default: return 'Không xác định';
    }
  }

  // Helper để get difficulty color
  getDifficultyColor(difficulty: number): string {
    switch (difficulty) {
      case 0: return 'green';
      case 1: return 'orange';
      case 2: return 'red';
      default: return 'gray';
    }
  }
}

// Export singleton instance
export const exerciseService = new ExerciseService();