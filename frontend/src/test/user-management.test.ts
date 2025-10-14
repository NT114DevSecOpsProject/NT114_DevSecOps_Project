import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChakraProvider } from '@chakra-ui/react';
import React from 'react';
import UserManagement from '../pages/users/UserManagement';
import theme from '../theme';
// DÒNG NÀY ĐÃ ĐƯỢC THÊM ĐỂ KHẮC PHỤC LỖI 'CANNOT FIND MODULE' Ở DÒNG 78
import * as useUserQueries from '../hooks/queries/useUserQueries';

// Dữ liệu mock cơ bản
const mockUsersData = [
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
];

// **********************************************
// KHẮC PHỤC: BỔ SUNG MỌC ĐẦY ĐỦ CHO useUser
// **********************************************
vi.mock('../hooks/queries/useUserQueries', () => ({
  // Dùng vi.fn() để có thể dễ dàng ghi đè giá trị trả về
  useUsers: vi.fn(() => ({
    data: mockUsersData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isSuccess: true,    // BẮT BUỘC
    isError: false,     // BẮT BUỘC
    isPending: false,   // BẮT BUỘC
    isFetching: false,  // BẮT BUỘC
    status: 'success', // BẮT BUỘC
  })),
  useCreateUser: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  useAdminCreateUser: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
  // BỔ SUNG HOOK useUser (KHẮC PHỤC LỖI "No useUser export")
  useUser: vi.fn(() => ({
    data: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      active: true,
      admin: false
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isSuccess: true,    // BẮT BUỘC
    isError: false,     // BẮT BUỘC
    isPending: false,   // BẮT BUỘC
    isFetching: false,  // BẮT BUỘC
    status: 'success',  // BẮT BUỘC
  })),
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
  useNavigate: vi.fn(),
}));

// **********************************************
// KHẮC PHỤC LỖI TREO & LỖI MODULE
// **********************************************
// DÒNG 78 ĐÃ ĐƯỢC SỬA: Thay thế require bằng useUserQueries.useUsers
const useUsersMock = vi.mocked(useUserQueries.useUsers);

// Biến global để cleanup QueryClient
let queryClient: QueryClient;

// Test wrapper component (Giữ nguyên format React.createElement)
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Client được tạo mới cho mỗi lần render để đảm bảo độc lập
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0, // Giúp queries không bị treo
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

// Khắc phục LỖI TREO: Dọn dẹp cache và timers sau mỗi test
afterEach(() => {
    if (queryClient) {
        queryClient.clear();
    }
    vi.useRealTimers();
    vi.runOnlyPendingTimers(); // Đảm bảo không có timer nào còn treo
});

// Hàm tiện ích để render component
const renderUserManagement = (overrideMock?: any) => {
  // Logic mockReturnValue tự động điền các cờ trạng thái React Query nếu thiếu
  const finalMock = {
    // Giá trị mặc định (cho Success/Pagination)
    isSuccess: true,
    isError: false,
    isPending: false,
    isFetching: false,
    status: 'success',
    // Ghi đè bằng mock cụ thể của test case
    ...(overrideMock || {}), 
  };

  useUsersMock.mockReturnValue(finalMock as any);
  
  return render(
    React.createElement(
      TestWrapper,
      null,
      React.createElement(UserManagement)
    )
  );
};

describe('UserManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user management page title', async () => {
    renderUserManagement({
      data: mockUsersData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    await waitFor(() => {
      expect(screen.getByText('Quản lý người dùng')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should display user statistics', async () => {
    renderUserManagement({
      data: mockUsersData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    await waitFor(() => {
      expect(screen.getByText('Tổng số người dùng')).toBeInTheDocument();
      expect(screen.getByText('Đang hoạt động')).toBeInTheDocument();
      expect(screen.getByText('Không hoạt động')).toBeInTheDocument();
      expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
    });
  });

  it('should display user table with correct data', async () => {
    renderUserManagement({
      data: mockUsersData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
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
    renderUserManagement({
      data: mockUsersData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    await waitFor(() => {
      expect(screen.getByText('Thêm người dùng')).toBeInTheDocument();
    });
  });

  it('should display search and filter controls', async () => {
    renderUserManagement({
      data: mockUsersData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tìm kiếm theo tên hoặc email...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tất cả trạng thái')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tất cả quyền')).toBeInTheDocument();
    });
  });

  it('should display pagination when there are more than 10 users', async () => {
    // Mock nhiều users để test pagination
    const manyUsers = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      active: true,
      admin: false,
    }));

    // Ghi đè mock cho test case này
    renderUserManagement({
      data: manyUsers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      // Các cờ trạng thái Success tự động được điền
    });

    await waitFor(() => {
      // Should show pagination controls
      expect(screen.getByText('Trang 1 / 2')).toBeInTheDocument();
    });
  });
});

// --------------------------------------------------------------------------------

describe('UserManagement Component - Error States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock về trạng thái Success mặc định
    // renderUserManagement({
    //   data: mockUsersData,
    //   isLoading: false,
    //   error: null,
    //   refetch: vi.fn(),
    // });
  });

  it('should display error message when loading fails', async () => {
    // Ghi đè mock cho test case này
    renderUserManagement({
      data: null,
      isLoading: false,
      error: new Error('Failed to load users'),
      refetch: vi.fn(),
      // TRẠNG THÁI LỖI: isError là true, các cờ khác là false
      isSuccess: false,
      isError: true,
      isPending: false,
      isFetching: false,
      status: 'error', 
    });

    await waitFor(() => {
      expect(screen.getByText(/Không thể tải danh sách người dùng/)).toBeInTheDocument();
    });
  });

  it('should display loading state', async () => {
    // Ghi đè mock cho test case này
    renderUserManagement({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      // TRẠNG THÁI ĐANG TẢI: isPending/isFetching là true, các cờ khác là false
      isSuccess: false,
      isError: false,
      isPending: true,
      isFetching: true,
      status: 'pending',
    });

    await waitFor(() => {
      expect(screen.getByText('Đang tải danh sách người dùng...')).toBeInTheDocument();
    });
  });

  it('should display empty state when no users exist', async () => {
    // Ghi đè mock cho test case này
    renderUserManagement({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      // TRẠNG THÁI THÀNH CÔNG (DỮ LIỆU RỖNG)
      isSuccess: true,
      isError: false,
      isPending: false,
      isFetching: false,
      status: 'success',
    });

    await waitFor(() => {
      expect(screen.getByText('Không có người dùng nào trong hệ thống')).toBeInTheDocument();
    });
  });
});

// --------------------------------------------------------------------------------

describe('UserManagement Component - Statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
    
  it('should calculate and display correct statistics', async () => {
    renderUserManagement({
      data: mockUsersData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isSuccess: true,
      isError: false,
      isPending: false,
      isFetching: false,
      status: 'success',
    });

    await waitFor(() => {
      // Total users: 3
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // Active users: 2 (admin and user1)
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      
      // Inactive users: 1 (user2)
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });
});

// XÓA afterAll() vì afterEach() đã được tối ưu để dọn dẹp React Query.