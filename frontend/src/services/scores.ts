// Score service cho CodeLand.io platform
import { apiClient, ApiError } from './api';
import { hasCorrectAnswers, allAnswersIncorrect } from '../utils/scoreUtils';
import type {
  Score,
  ScoreCreate,
  ScoresResponse,
  ScoreResponse,
  SuccessResponse,
  PingResponse,
} from '../types/api';

export class ScoreService {
  // Ping scores service để kiểm tra health
  async ping(): Promise<PingResponse> {
    try {
      return await apiClient.get<PingResponse>('/scores/ping');
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể kết nối đến dịch vụ điểm số');
    }
  }

  // Lấy tất cả điểm số (admin only)
  async getAll(): Promise<Score[]> {
    try {
      const response = await apiClient.get<ScoresResponse>('/scores/', true);
      return response.data.scores;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để xem điểm số');
        }
        if (error.status === 403) {
          throw new ApiError(403, 'Bạn không có quyền xem tất cả điểm số');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể tải danh sách điểm số');
    }
  }

  // Lấy điểm số của user hiện tại
  async getUserScores(): Promise<Score[]> {
    try {
      const response = await apiClient.get<ScoresResponse>('/scores/user', true);
      return response.data.scores;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để xem điểm số của mình');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể tải điểm số của bạn');
    }
  }

  // Lấy điểm số cụ thể của user
  async getUserScoreById(scoreId: number): Promise<Score> {
    try {
      const response = await apiClient.get<ScoreResponse>(`/scores/user/${scoreId}`, true);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để xem điểm số');
        }
        if (error.status === 404) {
          throw new ApiError(404, 'Không tìm thấy điểm số');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể tải điểm số');
    }
  }

  // Tạo điểm số mới
  async createScore(scoreData: ScoreCreate): Promise<SuccessResponse> {
    try {
      // Validate dữ liệu trước khi gửi
      const validation = this.validateScoreData(scoreData);
      if (!validation.isValid) {
        throw new ApiError(400, validation.errors.join(', '));
      }

      return await apiClient.post<SuccessResponse>('/scores/', scoreData, true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để lưu điểm số');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể lưu điểm số');
    }
  }

  // Cập nhật điểm số cho bài tập
  async updateScore(exerciseId: number, correct: boolean): Promise<SuccessResponse> {
    try {
      return await apiClient.put<SuccessResponse>(
        `/scores/${exerciseId}`,
        { correct },
        true
      );
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          throw new ApiError(401, 'Bạn cần đăng nhập để cập nhật điểm số');
        }
        if (error.status === 400) {
          throw new ApiError(400, 'Không thể cập nhật điểm số cho bài tập này');
        }
        throw error;
      }
      throw new ApiError(500, 'Không thể cập nhật điểm số');
    }
  }

  // Lấy điểm số của user cho một bài tập cụ thể
  async getUserScoreForExercise(exerciseId: number): Promise<Score | null> {
    try {
      const userScores = await this.getUserScores();
      return userScores.find(score => score.exercise_id === exerciseId) || null;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tải điểm số cho bài tập');
    }
  }



  // Tính toán thống kê điểm số của user
  async getUserStats(): Promise<{
    totalExercises: number;
    completedExercises: number;
    correctAnswers: number;
    partialAnswers: number;
    incorrectAnswers: number;
    accuracy: number;
  }> {
    try {
      const userScores = await this.getUserScores();
      
      const completedExercises = userScores.length;
      const correctAnswers = userScores.filter(score => score.all_correct === true).length;
      const partialAnswers = userScores.filter(score => 
        !score.all_correct && hasCorrectAnswers(score)
      ).length;
      const incorrectAnswers = userScores.filter(score => 
        allAnswersIncorrect(score)
      ).length;
      const accuracy = completedExercises > 0 ? (correctAnswers / completedExercises) * 100 : 0;

      return {
        totalExercises: userScores.length,
        completedExercises,
        correctAnswers,
        partialAnswers,
        incorrectAnswers,
        accuracy: Math.round(accuracy * 100) / 100, // Làm tròn 2 chữ số thập phân
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tính toán thống kê điểm số');
    }
  }

  // Lấy danh sách bài tập chưa hoàn thành
  async getIncompleteExercises(): Promise<number[]> {
    try {
      const userScores = await this.getUserScores();
      return userScores
        .filter(score => !score.all_correct)
        .map(score => score.exercise_id);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tải danh sách bài tập chưa hoàn thành');
    }
  }

  // Lấy danh sách bài tập đã hoàn thành
  async getCompletedExercises(): Promise<number[]> {
    try {
      const userScores = await this.getUserScores();
      return userScores
        .filter(score => score.all_correct === true)
        .map(score => score.exercise_id);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể tải danh sách bài tập đã hoàn thành');
    }
  }

  // Validate score data trước khi gửi
  validateScoreData(data: ScoreCreate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.exercise_id || data.exercise_id <= 0) {
      errors.push('ID bài tập không hợp lệ');
    }

    if (!data.answer || data.answer.trim().length === 0) {
      errors.push('Câu trả lời không được để trống');
    }

    if (!data.results || !Array.isArray(data.results)) {
      errors.push('Kết quả test cases không hợp lệ');
    }

    if (!data.user_results || !Array.isArray(data.user_results)) {
      errors.push('Kết quả của user không hợp lệ');
    }

    if (data.results && data.user_results && data.results.length !== data.user_results.length) {
      errors.push('Số lượng kết quả test cases và kết quả user phải bằng nhau');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Submit kết quả bài tập với validation results
  async submitExerciseResult(
    exerciseId: number, 
    answer: string,
    results: boolean[],
    userResults: string[]
  ): Promise<SuccessResponse> {
    try {
      return await this.createScore({
        exercise_id: exerciseId,
        answer,
        results,
        user_results: userResults,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Không thể lưu kết quả bài tập');
    }
  }
}

// Export singleton instance
export const scoreService = new ScoreService();