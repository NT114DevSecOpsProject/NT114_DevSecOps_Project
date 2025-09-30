// Ví dụ sử dụng các API services
import {
  authService,
  exerciseService,
  scoreService,
  userService,
  ApiError,
} from './index';
import { hasCorrectAnswers } from '../utils/scoreUtils';

// Ví dụ sử dụng Authentication Service
export const authExamples = {
  // Đăng ký tài khoản mới
  async registerUser() {
    try {
      const response = await authService.register({
        username: 'johndoe',
        email: 'john@example.com',
        password: 'securepassword123'
      });
      
      console.log('Đăng ký thành công:', response.message);
      console.log('Token:', response.auth_token);
      
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('Lỗi đăng ký:', error.message);
        
        // Xử lý các lỗi cụ thể
        switch (error.status) {
          case 400:
            console.log('Dữ liệu không hợp lệ hoặc email đã tồn tại');
            break;
          case 500:
            console.log('Lỗi server, vui lòng thử lại sau');
            break;
        }
      }
      throw error;
    }
  },

  // Đăng nhập
  async loginUser() {
    try {
      const response = await authService.login({
        email: 'john@example.com',
        password: 'securepassword123'
      });
      
      console.log('Đăng nhập thành công:', response.message);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        console.error('Lỗi đăng nhập:', error.message);
      }
      throw error;
    }
  },

  // Lấy thông tin user hiện tại
  async getCurrentUser() {
    try {
      const user = await authService.getStatus();
      console.log('Thông tin user:', user);
      return user;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          console.log('Cần đăng nhập lại');
        }
      }
      throw error;
    }
  },

  // Đăng xuất
  async logoutUser() {
    try {
      await authService.logout();
      console.log('Đăng xuất thành công');
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
    }
  }
};

// Ví dụ sử dụng Exercise Service
export const exerciseExamples = {
  // Lấy tất cả bài tập
  async getAllExercises() {
    try {
      const exercises = await exerciseService.getAll();
      console.log(`Tìm thấy ${exercises.length} bài tập`);
      
      exercises.forEach(exercise => {
        console.log(`- Bài ${exercise.id}: ${exercise.body.substring(0, 50)}...`);
      });
      
      return exercises;
    } catch (error) {
      console.error('Không thể tải bài tập:', error);
      throw error;
    }
  },

  // Lấy bài tập theo ID
  async getExerciseById(id: number) {
    try {
      const exercise = await exerciseService.getById(id);
      console.log('Chi tiết bài tập:', exercise);
      return exercise;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        console.log('Không tìm thấy bài tập');
      }
      throw error;
    }
  },

  // Tìm kiếm bài tập
  async searchExercises(query: string) {
    try {
      const results = await exerciseService.search(query);
      console.log(`Tìm thấy ${results.length} bài tập với từ khóa "${query}"`);
      return results;
    } catch (error) {
      console.error('Lỗi tìm kiếm:', error);
      throw error;
    }
  },

  // Tạo bài tập mới (admin only)
  async createExercise() {
    try {
      const newExercise = {
        title: 'Tính tổng hai số',
        body: 'Viết hàm tính tổng hai số nguyên',
        difficulty: 0,
        test_cases: ['sum(2, 3)', 'sum(5, 7)'],
        solutions: ['5', '12']
      };

      const response = await exerciseService.create(newExercise);
      console.log('Tạo bài tập thành công:', response.message);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 403) {
          console.log('Chỉ admin mới có thể tạo bài tập');
        }
      }
      throw error;
    }
  }
};

// Ví dụ sử dụng Score Service
export const scoreExamples = {
  // Lấy điểm số của user
  async getUserScores() {
    try {
      const scores = await scoreService.getUserScores();
      console.log(`User có ${scores.length} điểm số`);
      
      scores.forEach(score => {
        const status = score.all_correct ? 'Đúng' : 
                      hasCorrectAnswers(score) ? 'Một phần đúng' : 'Sai';
        console.log(`- Bài ${score.exercise_id}: ${status}`);
      });
      
      return scores;
    } catch (error) {
      console.error('Không thể tải điểm số:', error);
      throw error;
    }
  },

  // Lấy thống kê điểm số
  async getUserStats() {
    try {
      const stats = await scoreService.getUserStats();
      console.log('Thống kê học tập:');
      console.log(`- Tổng bài tập: ${stats.totalExercises}`);
      console.log(`- Đã hoàn thành: ${stats.completedExercises}`);
      console.log(`- Trả lời đúng: ${stats.correctAnswers}`);
      console.log(`- Trả lời sai: ${stats.incorrectAnswers}`);
      console.log(`- Độ chính xác: ${stats.accuracy}%`);
      
      return stats;
    } catch (error) {
      console.error('Không thể tính thống kê:', error);
      throw error;
    }
  },

  // Submit kết quả bài tập
  async submitExerciseResult(exerciseId: number, isCorrect: boolean) {
    try {
      const response = await scoreService.submitExerciseResult(
        exerciseId, 
        'function sum(a, b) { return a + b; }',
        [isCorrect],
        [isCorrect ? '5' : '0']
      );
      console.log(`Đã lưu kết quả bài ${exerciseId}: ${isCorrect ? 'Đúng' : 'Sai'}`);
      return response;
    } catch (error) {
      console.error('Không thể lưu kết quả:', error);
      throw error;
    }
  },

  // Lấy bài tập chưa hoàn thành
  async getIncompleteExercises() {
    try {
      const incompleteIds = await scoreService.getIncompleteExercises();
      console.log(`Còn ${incompleteIds.length} bài tập chưa hoàn thành:`, incompleteIds);
      return incompleteIds;
    } catch (error) {
      console.error('Không thể tải bài tập chưa hoàn thành:', error);
      throw error;
    }
  }
};

// Ví dụ sử dụng User Service
export const userExamples = {
  // Lấy tất cả users
  async getAllUsers() {
    try {
      const users = await userService.getAll();
      console.log(`Tìm thấy ${users.length} người dùng`);
      
      users.forEach(user => {
        const status = user.active ? 'Hoạt động' : 'Không hoạt động';
        const role = user.admin ? 'Admin' : 'User';
        console.log(`- ${user.username} (${user.email}) - ${role} - ${status}`);
      });
      
      return users;
    } catch (error) {
      console.error('Không thể tải danh sách người dùng:', error);
      throw error;
    }
  },

  // Tìm kiếm user
  async searchUsers(query: string) {
    try {
      const results = await userService.search(query);
      console.log(`Tìm thấy ${results.length} người dùng với từ khóa "${query}"`);
      return results;
    } catch (error) {
      console.error('Lỗi tìm kiếm người dùng:', error);
      throw error;
    }
  },

  // Validate dữ liệu user
  validateUserData() {
    const testData = {
      username: 'testuser',
      email: 'test@example.com',
      password: '123456'
    };

    const validation = userService.validateUserData(testData);
    
    if (validation.isValid) {
      console.log('Dữ liệu hợp lệ');
    } else {
      console.log('Dữ liệu không hợp lệ:');
      validation.errors.forEach(error => console.log(`- ${error}`));
    }
    
    return validation;
  },

  // Kiểm tra độ mạnh mật khẩu
  checkPasswordStrength(password: string) {
    const result = userService.checkPasswordStrength(password);
    
    console.log(`Độ mạnh mật khẩu: ${result.score}/4`);
    if (result.feedback.length > 0) {
      console.log('Gợi ý cải thiện:');
      result.feedback.forEach(tip => console.log(`- ${tip}`));
    }
    
    return result;
  }
};

// Ví dụ workflow hoàn chỉnh
export const workflowExamples = {
  // Workflow đăng ký và làm bài tập
  async completeUserJourney() {
    try {
      console.log('=== Bắt đầu user journey ===');
      
      // 1. Đăng ký tài khoản
      console.log('1. Đăng ký tài khoản...');
      await authExamples.registerUser();
      
      // 2. Lấy danh sách bài tập
      console.log('2. Tải danh sách bài tập...');
      const exercises = await exerciseExamples.getAllExercises();
      
      // 3. Làm bài tập đầu tiên
      if (exercises.length > 0) {
        console.log('3. Làm bài tập đầu tiên...');
        const firstExercise = exercises[0];
        await scoreExamples.submitExerciseResult(firstExercise.id, true);
      }
      
      // 4. Xem thống kê
      console.log('4. Xem thống kê học tập...');
      await scoreExamples.getUserStats();
      
      // 5. Đăng xuất
      console.log('5. Đăng xuất...');
      await authExamples.logoutUser();
      
      console.log('=== Hoàn thành user journey ===');
      
    } catch (error) {
      console.error('Lỗi trong user journey:', error);
      throw error;
    }
  }
};

// Export tất cả examples
export default {
  auth: authExamples,
  exercises: exerciseExamples,
  scores: scoreExamples,
  users: userExamples,
  workflows: workflowExamples,
};