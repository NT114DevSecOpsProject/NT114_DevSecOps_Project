import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import UserManagement from '../pages/users/UserManagement';
import { theme } from '../theme';

// Mock các dependencies
vi.mock('../hooks/queries/useUserQueries', () => ({
  useUsers: () => ({
    data: [
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        active: true,
        admin: true,
      },
      {
        id: 2,
        username: 'user1',
        email: 'user1@example.com',
        active: true,
        admin: false,
      },
      {
        id: 3,
        username: 'user2',
        email: 'user2@example.com',
        active: false,
        admin: false,
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCreateUser: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

vi.mock('../hooks/queries/useScoreQueries', () => ({
  useScores: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

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
    React.createElement(
      ChakraProvider,
      { theme },
      children
    )
  );
};

describe('UserManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user management page title', async () => {
    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      expect(screen.getByText('Quản lý người dùng')).toBeInTheDocument();
    });
  });

  it('should display user statistics', async () => {
    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      expect(screen.getByText('Tổng số người dùng')).toBeInTheDocument();
      expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
      expect(screen.getByText('Không hoạt động')).toBeInTheDocument();
      expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
    });
  });

  it('should display user table with correct data', async () => {
    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      // Check table headers
      expect(screen.getByText('Tên người dùng')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Trạng thái')).toBeInTheDocument();
      expect(screen.getByText('Quyền')).toBeInTheDocument();

      // Check user data
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    });
  });

  it('should display add user button', async () => {
    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      expect(screen.getByText('Thêm người dùng')).toBeInTheDocument();
    });
  });

  it('should display search and filter controls', async () => {
    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tìm kiếm theo tên hoặc email...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tất cả trạng thái')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tất cả quyền')).toBeInTheDocument();
    });
  });

  it('should display pagination when there are more than 10 users', async () => {
    // Mock nhiều users để test pagination
    vi.mocked(require('../hooks/queries/useUserQueries').useUsers).mockReturnValue({
      data: Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        username: `user${i + 1}`,
        email: `user${i + 1}@example.com`,
        active: true,
        admin: false,
      })),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      // Should show pagination controls
      expect(screen.getByText('Trang 1 / 2')).toBeInTheDocument();
    });
  });
});

describe('UserManagement Component - Error States', () => {
  it('should display error message when loading fails', async () => {
    vi.mocked(require('../hooks/queries/useUserQueries').useUsers).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load users'),
      refetch: vi.fn(),
    });

    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải danh sách người dùng/)).toBeInTheDocument();
    });
  });

  it('should display loading state', async () => {
    vi.mocked(require('../hooks/queries/useUserQueries').useUsers).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      expect(screen.getByText('Đang tải danh sách người dùng...')).toBeInTheDocument();
    });
  });

  it('should display empty state when no users exist', async () => {
    vi.mocked(require('../hooks/queries/useUserQueries').useUsers).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      expect(screen.getByText('Không có người dùng nào trong hệ thống')).toBeInTheDocument();
    });
  });
});

describe('UserManagement Component - Statistics', () => {
  it('should calculate and display correct statistics', async () => {
    render(
      React.createElement(
        TestWrapper,
        null,
        React.createElement(UserManagement)
      )
    );

    await waitFor(() => {
      // Total users: 3
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Active users: 2 (admin and user1)
      const activeElements = screen.getAllByText('2');
      expect(activeElements.length).toBeGreaterThan(0);
      
      // Inactive users: 1 (user2)
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // Admin users: 1 (admin)
      const adminElements = screen.getAllByText('1');
      expect(adminElements.length).toBeGreaterThan(0);
    });
  });
});