import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import DashboardHome from '../pages/dashboard/DashboardHome';
import UserProfile from '../pages/dashboard/UserProfile';
import { useAuth } from '../hooks/useAuth';
import { useUserStats } from '../hooks/queries/useUserQueries';
import { useExercises } from '../hooks/queries/useExerciseQueries';
import { useUserProgress, useUserStatistics } from '../hooks/queries/useScoreQueries';

// Mock các hooks
vi.mock('../hooks/useAuth');
vi.mock('../hooks/queries/useUserQueries');
vi.mock('../hooks/queries/useExerciseQueries');
vi.mock('../hooks/queries/useScoreQueries');

const mockUseAuth = vi.mocked(useAuth);
const mockUseUserStats = vi.mocked(useUserStats);
const mockUseExercises = vi.mocked(useExercises);
const mockUseUserProgress = vi.mocked(useUserProgress);
const mockUseUserStatistics = vi.mocked(useUserStatistics);

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(ChakraProvider, null, children)
  );
};

describe('Dashboard Components', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        active: true,
        admin: false,
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });

    mockUseUserStats.mockReturnValue({
      stats: {
        totalUsers: 100,
        activeUsers: 85,
        inactiveUsers: 15,
        adminUsers: 5,
        activeRate: 85,
      },
      isLoading: false,
      error: null,
    });

    mockUseExercises.mockReturnValue({
      data: [
        { id: 1, title: 'Test Exercise 1', body: 'Test body', difficulty: 0, test_cases: ['test1'], solutions: ['solution1'] },
        { id: 2, title: 'Test Exercise 2', body: 'Test body 2', difficulty: 1, test_cases: ['test2'], solutions: ['solution2'] },
      ],
      isLoading: false,
      error: null,
    });

    mockUseUserProgress.mockReturnValue({
      progress: {
        totalAttempts: 10,
        correctAnswers: 7,
        partialAnswers: 2,
        incorrectAnswers: 1,
        successRate: 70,
      },
      isLoading: false,
      error: null,
    });

    mockUseUserStatistics.mockReturnValue({
      statistics: {
        totalAttempts: 10,
        correctAnswers: 7,
        partialAnswers: 2,
        incorrectAnswers: 1,
        successRate: 70,
        testCaseAccuracy: 85,
        currentStreak: 3,
        maxStreak: 5,
        difficultyStats: {
          easy: { attempted: 5, correct: 4 },
          medium: { attempted: 3, correct: 2 },
          hard: { attempted: 2, correct: 1 },
        },
        recentActivity: [
          { id: 1, exercise_id: 1, all_correct: true, results: [true, true] },
          { id: 2, exercise_id: 2, all_correct: false, results: [true, false] },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  describe('DashboardHome', () => {
    it('should render dashboard with user statistics', async () => {
      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      // Kiểm tra page header
      await waitFor(() => {
        expect(screen.getByText(/Chào mừng trở lại, testuser!/)).toBeInTheDocument();
      });

      // Kiểm tra stats cards
      expect(screen.getByText('10')).toBeInTheDocument(); // Total attempts
      expect(screen.getByText('70%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('3')).toBeInTheDocument(); // Current streak
      expect(screen.getByText('85%')).toBeInTheDocument(); // Test case accuracy
    });

    it('should show admin section for admin users', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          active: true,
          admin: true,
        },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Tổng Quan Hệ Thống (Quản trị viên)')).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      mockUseUserStatistics.mockReturnValue({
        statistics: null,
        isLoading: true,
        error: null,
      });

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      expect(screen.getByText('Đang tải dashboard...')).toBeInTheDocument();
    });

    it('should handle empty statistics gracefully', async () => {
      mockUseUserStatistics.mockReturnValue({
        statistics: null,
        isLoading: false,
        error: null,
      });

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Chào mừng trở lại/)).toBeInTheDocument();
      });

      // Should show 0 values when no statistics
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('UserProfile', () => {
    it('should render user profile information', async () => {
      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Hồ Sơ Cá Nhân')).toBeInTheDocument();
      });

      // Kiểm tra user info
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    });

    it('should show user statistics', async () => {
      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Tiến Độ Học Tập')).toBeInTheDocument();
      });

      // Kiểm tra statistics
      expect(screen.getByText('70%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('85%')).toBeInTheDocument(); // Test case accuracy
      expect(screen.getByText('7')).toBeInTheDocument(); // Correct answers
      expect(screen.getByText('10')).toBeInTheDocument(); // Total attempts
    });

    it('should show achievements for qualified users', async () => {
      mockUseUserStatistics.mockReturnValue({
        statistics: {
          totalAttempts: 15,
          correctAnswers: 12,
          partialAnswers: 2,
          incorrectAnswers: 1,
          successRate: 80,
          testCaseAccuracy: 90,
          currentStreak: 5,
          maxStreak: 8,
          difficultyStats: {
            easy: { attempted: 8, correct: 7 },
            medium: { attempted: 5, correct: 4 },
            hard: { attempted: 2, correct: 1 },
          },
          recentActivity: [],
        },
        isLoading: false,
        error: null,
      });

      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Thành Tích')).toBeInTheDocument();
      });

      // Should show achievements
      expect(screen.getByText('Người Giải Quyết')).toBeInTheDocument();
      expect(screen.getByText('Chuỗi Thành Công')).toBeInTheDocument();
      expect(screen.getByText('Chuyên Gia')).toBeInTheDocument();
    });

    it('should show admin badge for admin users', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          active: true,
          admin: true,
        },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
      });

      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
      });
    });

    it('should show message for users with no achievements', async () => {
      mockUseUserStatistics.mockReturnValue({
        statistics: {
          totalAttempts: 0,
          correctAnswers: 0,
          partialAnswers: 0,
          incorrectAnswers: 0,
          successRate: 0,
          testCaseAccuracy: 0,
          currentStreak: 0,
          maxStreak: 0,
          difficultyStats: {
            easy: { attempted: 0, correct: 0 },
            medium: { attempted: 0, correct: 0 },
            hard: { attempted: 0, correct: 0 },
          },
          recentActivity: [],
        },
        isLoading: false,
        error: null,
      });

      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText('Hoàn thành bài tập đầu tiên để mở khóa thành tích!')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      await waitFor(() => {
        expect(screen.getByText(/Chào mừng trở lại/)).toBeInTheDocument();
      });

      // Cards should stack on mobile (this would need more specific testing with actual DOM queries)
      // For now, just ensure the component renders without errors on mobile
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockUseUserStatistics.mockReturnValue({
        statistics: null,
        isLoading: false,
        error: new Error('API Error'),
      });

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      await waitFor(() => {
        // Should show error boundary or error message
        // The exact implementation depends on how QueryErrorBoundary works
        expect(screen.getByText(/error/i) || screen.getByText(/lỗi/i)).toBeInTheDocument();
      });
    });
  });
});