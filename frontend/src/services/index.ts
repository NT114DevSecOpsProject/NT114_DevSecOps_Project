// Export tất cả services cho CodeLand.io platform

// Base API client
export { apiClient, ApiError } from './api';

// Service instances
export { authService, AuthService } from './auth';
export { exerciseService, ExerciseService } from './exercises';
export { scoreService, ScoreService } from './scores';
export { userService, UserService } from './users';

// Re-export types để dễ sử dụng
export type {
  ApiResponse,
  AuthResponse,
  SuccessResponse,
  ErrorResponse,
  User,
  UserRegistration,
  UserLogin,
  Exercise,
  ExerciseCreate,
  Score,
  ScoreCreate,
  UsersResponse,
  UserResponse,
  ExercisesResponse,
  ScoresResponse,
  ScoreResponse,
  PingResponse,
} from '../types/api';