// API response types cho CodeLand.io platform

// Base// Test case types
export interface TestCase {
  input: string;
  expected: string;
}

// Exercise types  
export interface Exercise {
  id: number;
  title: string;
  body: string;
  difficulty: number; // 0=easy, 1=medium, 2=hard
  test_cases: (string | TestCase)[];
  solutions: string[];
}
export interface ApiResponse<T = any> {
  status: 'success' | 'fail' | 'error';
  message: string;
  data?: T;
}

// Authentication response
export interface AuthResponse {
  status: string;
  message: string;
  auth_token: string;
}

// Success response
export interface SuccessResponse {
  status: string;
  message: string;
}

// Error response
export interface ErrorResponse {
  status: 'fail' | 'error';
  message: string;
  errors?: Record<string, string[]>;
}

// User-related types
export interface User {
  id: number;
  username: string;
  email: string;
  active: boolean;
  admin: boolean;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
}

export interface AdminUserCreate {
  username: string;
  email: string;
  password: string;
  admin?: boolean;
  active?: boolean;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface ExerciseCreate {
  title: string;
  body: string;
  difficulty: number;
  test_cases: (string | TestCase)[];
  solutions: string[];
}

// Exercise validation response
export interface ExerciseValidationResponse {
  status: string;
  results: boolean[];
  user_results: string[];
  all_correct: boolean;
}

// Exercise validation request
export interface ExerciseValidationRequest {
  answer: string;
  exercise_id: number;
}

// Score-related types
export interface Score {
  id: number;
  user_id: number;
  exercise_id: number;
  answer: string;
  results: boolean[];
  user_results: string[];
  all_correct: boolean;
}

export interface ScoreCreate {
  exercise_id: number;
  answer: string;
  results: boolean[];
  user_results: string[];
}

// API response wrappers
export interface UsersResponse {
  status: string;
  data: {
    users: User[];
  };
}

export interface UserResponse {
  status: string;
  message: string;
  data: User;
}

export interface ExercisesResponse {
  status: string;
  data: {
    exercises: Exercise[];
  };
}

export interface ExerciseResponse {
  status: string;
  data: Exercise;
}

export interface ScoresResponse {
  status: string;
  data: {
    scores: Score[];
  };
}

export interface ScoreResponse {
  status: string;
  data: Score;
}

// Health check response
export interface PingResponse {
  status: string;
  message: string;
}