// import { describe, it, expect, beforeEach, vi } from 'vitest';
// import { render, screen, waitFor } from '@testing-library/react';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ChakraProvider } from '@chakra-ui/react';
// import React from 'react';
// import DashboardHome from '../pages/dashboard/DashboardHome';
// import UserProfile from '../pages/dashboard/UserProfile';
// import { useAuth } from '../hooks/useAuth';
// import { useUserStats } from '../hooks/queries/useUserQueries';
// import { useExercises } from '../hooks/queries/useExerciseQueries';
// import { useUserProgress, useUserStatistics } from '../hooks/queries/useScoreQueries';

// import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';

// // Mock các hooks
// vi.mock('../hooks/useAuth');
// vi.mock('../hooks/queries/useUserQueries');
// vi.mock('../hooks/queries/useExerciseQueries');
// vi.mock('../hooks/queries/useScoreQueries');

// const mockUseAuth = vi.mocked(useAuth);
// const mockUseUserStats = vi.mocked(useUserStats);
// const mockUseExercises = vi.mocked(useExercises);
// const mockUseUserProgress = vi.mocked(useUserProgress);
// const mockUseUserStatistics = vi.mocked(useUserStatistics);

// // Test wrapper component
// const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const queryClient = new QueryClient({
//     defaultOptions: {
//       queries: {
//         retry: false,
//       },
//     },
//   });

//   // return React.createElement(
//   //   QueryClientProvider,
//   //   { client: queryClient },
//   //   React.createElement(ChakraProvider, null, children)
//   // );
//   //  Mock router đơn giản để tránh lỗi navigate null
//   const rootRoute = createRootRoute();
//   const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' });
//   const routeTree = rootRoute.addChildren([indexRoute]);
//   const router = createRouter({ routeTree });

//   return React.createElement(
//     QueryClientProvider,
//     { client: queryClient },
//     React.createElement(
//       ChakraProvider,
//       null,
//       React.createElement(RouterProvider, { router }, children)
//     )
//   );
// };

// describe('Dashboard Components', () => {
//   beforeEach(() => {
//     // Reset mocks
//     vi.clearAllMocks();
    
//     // Default mock implementations
//     mockUseAuth.mockReturnValue({
//       user: {
//         id: 1,
//         username: 'testuser',
//         email: 'test@example.com',
//         active: true,
//         admin: false,
//       },
//       isLoading: false,
//       isAuthenticated: true,
//       login: vi.fn(),
//       logout: vi.fn(),
//       register: vi.fn(),
//     });

//     mockUseUserStats.mockReturnValue({
//       stats: {
//         totalUsers: 100,
//         activeUsers: 85,
//         inactiveUsers: 15,
//         adminUsers: 5,
//         activeRate: 85,
//       },
//       isLoading: false,
//       error: null,
//     });

//     mockUseExercises.mockReturnValue({
//       data: [
//         { id: 1, title: 'Test Exercise 1', body: 'Test body', difficulty: 0, test_cases: ['test1'], solutions: ['solution1'] },
//         { id: 2, title: 'Test Exercise 2', body: 'Test body 2', difficulty: 1, test_cases: ['test2'], solutions: ['solution2'] },
//       ],
//       isLoading: false,
//       error: null,
//     });

//     mockUseUserProgress.mockReturnValue({
//       progress: {
//         totalAttempts: 10,
//         correctAnswers: 7,
//         partialAnswers: 2,
//         incorrectAnswers: 1,
//         successRate: 70,
//       },
//       isLoading: false,
//       error: null,
//     });

//     mockUseUserStatistics.mockReturnValue({
//       statistics: {
//         totalAttempts: 10,
//         correctAnswers: 7,
//         partialAnswers: 2,
//         incorrectAnswers: 1,
//         successRate: 70,
//         testCaseAccuracy: 85,
//         currentStreak: 3,
//         maxStreak: 5,
//         difficultyStats: {
//           easy: { attempted: 5, correct: 4 },
//           medium: { attempted: 3, correct: 2 },
//           hard: { attempted: 2, correct: 1 },
//         },
//         recentActivity: [
//           { id: 1, exercise_id: 1, all_correct: true, results: [true, true] },
//           { id: 2, exercise_id: 2, all_correct: false, results: [true, false] },
//         ],
//       },
//       isLoading: false,
//       error: null,
//     });
//   });

//   describe('DashboardHome', () => {
//     it('should render dashboard with user statistics', async () => {
//       render(React.createElement(DashboardHome), { wrapper: TestWrapper });

//       // Kiểm tra page header
//       await waitFor(() => {
//         expect(screen.getByText(/Chào mừng trở lại, testuser!/)).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Chào mừng trở lại'))).toBeInTheDocument();
//       });

//       // Kiểm tra stats cards
//       expect(screen.getByText('10')).toBeInTheDocument(); // Total attempts
//       expect(screen.getByText('70%')).toBeInTheDocument(); // Success rate
//       expect(screen.getByText('3')).toBeInTheDocument(); // Current streak
//       expect(screen.getByText('85%')).toBeInTheDocument(); // Test case accuracy
//     });

//     it('should show admin section for admin users', async () => {
//       mockUseAuth.mockReturnValue({
//         user: {
//           id: 1,
//           username: 'admin',
//           email: 'admin@example.com',
//           active: true,
//           admin: true,
//         },
//         isLoading: false,
//         isAuthenticated: true,
//         login: vi.fn(),
//         logout: vi.fn(),
//         register: vi.fn(),
//       });

//       render(React.createElement(DashboardHome), { wrapper: TestWrapper });

//       await waitFor(() => {
//         expect(screen.getByText('Tổng Quan Hệ Thống (Quản trị viên)')).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Tổng Quan Hệ Thống (Quản trị viên)'))).toBeInTheDocument();
//       });
//     });

//     it('should show loading state', () => {
//       mockUseUserStatistics.mockReturnValue({
//         statistics: null,
//         isLoading: true,
//         error: null,
//       });

//       render(React.createElement(DashboardHome), { wrapper: TestWrapper });

//       expect(screen.getByText('Đang tải dashboard...')).toBeInTheDocument();
//       //expect(screen.getByText((content) => content.includes('Đang tải dashboard'))).toBeInTheDocument();

//     });

//     it('should handle empty statistics gracefully', async () => {
//       mockUseUserStatistics.mockReturnValue({
//         statistics: null,
//         isLoading: false,
//         error: null,
//       });

//       render(React.createElement(DashboardHome), { wrapper: TestWrapper });

//       await waitFor(() => {
//         expect(screen.getByText(/Chào mừng trở lại/)).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Chào mừng trở lại'))).toBeInTheDocument();
//       });

//       // Should show 0 values when no statistics
//       expect(screen.getByText('0')).toBeInTheDocument();
//       //expect(screen.getAllByText('0').length).toBeGreaterThan(0);
//     });
//   });

//   describe('UserProfile', () => {
//     it('should render user profile information', async () => {
//       render(React.createElement(UserProfile), { wrapper: TestWrapper });

//       await waitFor(() => {
//         expect(screen.getByText('Hồ Sơ Cá Nhân')).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Hồ Sơ Cá Nhân'))).toBeInTheDocument();
//       });

//       // Kiểm tra user info
//       expect(screen.getByText('testuser')).toBeInTheDocument();
//       expect(screen.getByText('test@example.com')).toBeInTheDocument();
//       expect(screen.getByText('Hoạt động')).toBeInTheDocument();
//     });

//     it('should show user statistics', async () => {
//       render(React.createElement(UserProfile), { wrapper: TestWrapper });

//       await waitFor(() => {
//         expect(screen.getByText('Tiến Độ Học Tập')).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Tiến Độ Học Tập'))).toBeInTheDocument();

//       });

//       // Kiểm tra statistics
//       expect(screen.getByText('70%')).toBeInTheDocument(); // Success rate
//       expect(screen.getByText('85%')).toBeInTheDocument(); // Test case accuracy
//       expect(screen.getByText('7')).toBeInTheDocument(); // Correct answers
//       expect(screen.getByText('10')).toBeInTheDocument(); // Total attempts
//     });

//     it('should show achievements for qualified users', async () => {
//       mockUseUserStatistics.mockReturnValue({
//         statistics: {
//           totalAttempts: 15,
//           correctAnswers: 12,
//           partialAnswers: 2,
//           incorrectAnswers: 1,
//           successRate: 80,
//           testCaseAccuracy: 90,
//           currentStreak: 5,
//           maxStreak: 8,
//           difficultyStats: {
//             easy: { attempted: 8, correct: 7 },
//             medium: { attempted: 5, correct: 4 },
//             hard: { attempted: 2, correct: 1 },
//           },
//           recentActivity: [],
//         },
//         isLoading: false,
//         error: null,
//       });

//       render(React.createElement(UserProfile), { wrapper: TestWrapper });

//       await waitFor(() => {
//         expect(screen.getByText('Thành Tích')).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Thành Tích'))).toBeInTheDocument();
//       });

//       // Should show achievements
//       expect(screen.getByText('Người Giải Quyết')).toBeInTheDocument();
//       expect(screen.getByText('Chuỗi Thành Công')).toBeInTheDocument();
//       expect(screen.getByText('Chuyên Gia')).toBeInTheDocument();
//     });

//     it('should show admin badge for admin users', async () => {
//       mockUseAuth.mockReturnValue({
//         user: {
//           id: 1,
//           username: 'admin',
//           email: 'admin@example.com',
//           active: true,
//           admin: true,
//         },
//         isLoading: false,
//         isAuthenticated: true,
//         login: vi.fn(),
//         logout: vi.fn(),
//         register: vi.fn(),
//       });

//       render(React.createElement(UserProfile), { wrapper: TestWrapper });

//       await waitFor(() => {
//         expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Quản trị viên'))).toBeInTheDocument();
//       });
//     });

//     it('should show message for users with no achievements', async () => {
//       mockUseUserStatistics.mockReturnValue({
//         statistics: {
//           totalAttempts: 0,
//           correctAnswers: 0,
//           partialAnswers: 0,
//           incorrectAnswers: 0,
//           successRate: 0,
//           testCaseAccuracy: 0,
//           currentStreak: 0,
//           maxStreak: 0,
//           difficultyStats: {
//             easy: { attempted: 0, correct: 0 },
//             medium: { attempted: 0, correct: 0 },
//             hard: { attempted: 0, correct: 0 },
//           },
//           recentActivity: [],
//         },
//         isLoading: false,
//         error: null,
//       });

//       render(React.createElement(UserProfile), { wrapper: TestWrapper });

//       await waitFor(() => {
//         expect(screen.getByText('Hoàn thành bài tập đầu tiên để mở khóa thành tích!')).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Hoàn thành bài tập đầu tiên để mở khóa thành tích!'))).toBeInTheDocument();
//       });
//     });
//   });

//   describe('Responsive Design', () => {
//     it('should adapt to mobile viewport', async () => {
//       // Mock mobile viewport
//       Object.defineProperty(window, 'innerWidth', {
//         writable: true,
//         configurable: true,
//         value: 375,
//       });

//       render(React.createElement(DashboardHome), { wrapper: TestWrapper });

//       await waitFor(() => {
//         expect(screen.getByText(/Chào mừng trở lại/)).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Chào mừng trở lại'))).toBeInTheDocument();
//       });
//       });

//       // Cards should stack on mobile (this would need more specific testing with actual DOM queries)
//       // For now, just ensure the component renders without errors on mobile
//     });
//   });

//   describe('Error Handling', () => {
//     it('should handle API errors gracefully', async () => {
//       mockUseUserStatistics.mockReturnValue({
//         statistics: null,
//         isLoading: false,
//         error: new Error('API Error'),
//       });

//       render(React.createElement(DashboardHome), { wrapper: TestWrapper });

//       await waitFor(() => {
//         // Should show error boundary or error message
//         // The exact implementation depends on how QueryErrorBoundary works
//         expect(screen.getByText(/error/i) || screen.getByText(/lỗi/i)).toBeInTheDocument();
//         //expect(screen.getByText((content) => content.includes('Lỗi tải dữ liệu'))).toBeInTheDocument();
//       });
//     });
//   });
// //});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // Add this import for custom matchers
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import DashboardHome from '../pages/dashboard/DashboardHome';
import UserProfile from '../pages/dashboard/UserProfile';
import { useAuth } from '../hooks/useAuth';
import { useUserStats } from '../hooks/queries/useUserQueries';
import { useExercises } from '../hooks/queries/useExerciseQueries';
import { useUserProgress, useUserStatistics } from '../hooks/queries/useScoreQueries';

// ----- STUB / MOCKS -----
// Stub tanstack router so components that call useNavigate / RouterProvider don't crash
vi.mock('@tanstack/react-router', () => {
  return {
    RouterProvider: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useNavigate: () => {
      return () => {}; // noop navigate
    },
    // If your components use other exports (useMatch, useParams...), add lightweight stubs here.
  };
});

// Mock hook modules with simple factories so vi.mocked(...) works and exported hooks exist.
// Mock both relative and alias paths if your project uses '@/...' imports anywhere.
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/queries/useUserQueries', () => ({
  useUserStats: vi.fn(),
  useUsers: vi.fn(),
  useAdminCreateUser: vi.fn(),
}));
vi.mock('../hooks/queries/useExerciseQueries', () => ({ useExercises: vi.fn() }));
vi.mock('../hooks/queries/useScoreQueries', () => ({
  useUserProgress: vi.fn(),
  useUserStatistics: vi.fn(),
}));

// Optional: duplicate mocks for alias paths if project imports via '@/...'
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/queries/useUserQueries', () => ({
  useUserStats: vi.fn(),
  useUsers: vi.fn(),
  useAdminCreateUser: vi.fn(),
}));
vi.mock('@/hooks/queries/useExerciseQueries', () => ({ useExercises: vi.fn() }));
vi.mock('@/hooks/queries/useScoreQueries', () => ({
  useUserProgress: vi.fn(),
  useUserStatistics: vi.fn(),
}));

// Now import the mocked functions as typed wrappers for easier use in tests
const mockUseAuth = vi.mocked(useAuth);
const mockUseUserStats = vi.mocked(useUserStats);
const mockUseExercises = vi.mocked(useExercises);
const mockUseUserProgress = vi.mocked(useUserProgress);
const mockUseUserStatistics = vi.mocked(useUserStatistics);

// ----- Test wrapper (no real router required) -----
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
    React.createElement(ChakraProvider, null, React.createElement(React.Fragment, null, children))
  );
};

// Helper: normalize text (collapse whitespace) to make matchers robust
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('Dashboard Components', () => {
  beforeEach(() => {
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
    } as any);

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
    } as any);

    mockUseExercises.mockReturnValue({
      data: [
        { id: 1, title: 'Test Exercise 1', body: 'Test body', difficulty: 0, test_cases: ['test1'], solutions: ['solution1'] },
        { id: 2, title: 'Test Exercise 2', body: 'Test body 2', difficulty: 1, test_cases: ['test2'], solutions: ['solution2'] },
      ],
      isLoading: false,
      error: null,
    } as any);

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
    } as any);

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
    } as any);
  });

  describe('DashboardHome', () => {
    it('should render dashboard with user statistics', async () => {
      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      // Header (use findByText for async rendering)
      const header = await screen.findByText((content) => normalize(content).includes('Chào mừng trở lại'));
      expect(header).toBeInTheDocument();

      // Stats cards (numbers)
      expect(await screen.findByText('10')).toBeInTheDocument(); // Total attempts
      expect(await screen.findByText('70%')).toBeInTheDocument(); // Success rate
      expect(await screen.findByText('3')).toBeInTheDocument(); // Current streak
      expect(await screen.findByText('85%')).toBeInTheDocument(); // Test case accuracy
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
      } as any);

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      const adminHeading = await screen.findByText((content) =>
        normalize(content).includes('Tổng Quan Hệ Thống (Quản trị viên)')
      );
      expect(adminHeading).toBeInTheDocument();
    });

    it('should show loading state', async () => {
      mockUseUserStatistics.mockReturnValue({
        statistics: null,
        isLoading: true,
        error: null,
      } as any);

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      const loading = await screen.findByText((content) => normalize(content).includes('Đang tải dashboard'));
      expect(loading).toBeInTheDocument();
    });

    it('should handle empty statistics gracefully', async () => {
      mockUseUserStatistics.mockReturnValue({
        statistics: null,
        isLoading: false,
        error: null,
      } as any);

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      const header = await screen.findByText((content) => normalize(content).includes('Chào mừng trở lại'));
      expect(header).toBeInTheDocument();

      // There may be multiple places showing "0" — assert at least one exists
      const zeros = await screen.findAllByText((content) => normalize(content) === '0');
      expect(zeros.length).toBeGreaterThan(0);
    });
  });

  describe('UserProfile', () => {
    it('should render user profile information', async () => {
      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      const title = await screen.findByText((content) => normalize(content).includes('Hồ Sơ Cá Nhân'));
      expect(title).toBeInTheDocument();

      // Kiểm tra user info
      //expect(await screen.findByText('testuser')).toBeInTheDocument();
      const usernameHeading = await screen.findByRole('heading', { name: 'testuser' });
      expect(usernameHeading).toBeInTheDocument();
      
      const emailElements =  await screen.findAllByText('test@example.com');
      expect(emailElements.length).toBeGreaterThan(0);
      //
      //expect(await screen.findByText('test@example.com')).toBeInTheDocument();
      expect(await screen.findByText((content) => normalize(content).includes('Hoạt động'))).toBeInTheDocument();
    });

    it('should show user statistics', async () => {
      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      const statsHeading = await screen.findByText((content) => normalize(content).includes('Tiến Độ Học Tập'));
      expect(statsHeading).toBeInTheDocument();

      // Kiểm tra statistics
      expect(await screen.findByText('70%')).toBeInTheDocument(); // Success rate
      expect(await screen.findByText('85%')).toBeInTheDocument(); // Test case accuracy
      expect(await screen.findByText('7')).toBeInTheDocument(); // Correct answers
      expect(await screen.findByText('10')).toBeInTheDocument(); // Total attempts
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
      } as any);

      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      const badgeArea = await screen.findByText((content) => normalize(content).includes('Thành Tích'));
      expect(badgeArea).toBeInTheDocument();

      // Should show achievements text (these are static strings in UI)
      expect(await screen.findByText('Người Giải Quyết')).toBeInTheDocument();
      expect(await screen.findByText('Chuỗi Thành Công')).toBeInTheDocument();
      expect(await screen.findByText('Chuyên Gia')).toBeInTheDocument();
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
      } as any);

      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      //const adminBadge = await screen.findByText((content) => normalize(content).includes('Quản trị viên'));
      //expect(adminBadge).toBeInTheDocument();
      const adminBadges = await screen.findAllByText((content) => normalize(content).includes('Quản trị viên'));
      expect(adminBadges.length).toBeGreaterThan(0);
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
      } as any);

      render(React.createElement(UserProfile), { wrapper: TestWrapper });

      const msg = await screen.findByText((content) =>
        normalize(content).includes('Hoàn thành bài tập đầu tiên để mở khóa thành tích')
      );
      expect(msg).toBeInTheDocument();
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

      const header = await screen.findByText((content) => normalize(content).includes('Chào mừng trở lại'));
      expect(header).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockUseUserStatistics.mockReturnValue({
        statistics: null,
        isLoading: false,
        error: new Error('API Error'),
      } as any);

      render(React.createElement(DashboardHome), { wrapper: TestWrapper });

      // Try to find either an English or Vietnamese error message (robust)
      // const errEl = await screen.findByText((content) => {
      //   const n = normalize(content).toLowerCase();
      //   return n.includes('lỗi') || n.includes('error') || n.includes('lỗi tải dữ liệu');
      // });
      // expect(errEl).toBeInTheDocument();
      const fullErrorMsg = await screen.findByText((content) =>
      normalize(content).includes('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.')
      );
      expect(fullErrorMsg).toBeInTheDocument();
    });
  });
});
