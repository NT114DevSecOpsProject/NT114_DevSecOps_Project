// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

/**
 * Các mock mặc định cho hook modules dùng trong project để tránh:
 *  - "No <export> is defined" lỗi khi test import module
 *  - lỗi useRouter / useNavigate null khi component dùng router
 *  - các lỗi require/import không tìm được hàm mock
 *
 * Nếu file hook thực sự export nhiều hàm hơn, test cụ thể có thể override (vi.mocked(...).mockReturnValue(...) trong test file).
 */

// Mock module useUserQueries (đường dẫn tương đối từ test files: ../hooks/queries/useUserQueries)
vi.mock('../hooks/queries/useUserQueries', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Các hook thường dùng (thêm hoặc sửa nếu project có tên khác)
    useUsers: vi.fn(() => ({ data: [], isLoading: false, error: null })),
    useUserStats: vi.fn(() => ({ stats: null, isLoading: false, error: null })),
    useCreateUser: vi.fn(() => ({ mutateAsync: vi.fn(), isLoading: false })),
    useAdminCreateUser: vi.fn(() => ({ mutateAsync: vi.fn(), isLoading: false })),
    // export fallback (nếu file thực tế có)
  };
});

// Mock module useExerciseQueries
vi.mock('../hooks/queries/useExerciseQueries', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useExercises: vi.fn(() => ({ data: [], isLoading: false, error: null })),
    // thêm các hook khác nếu cần
  };
});

// Mock module useScoreQueries
vi.mock('../hooks/queries/useScoreQueries', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUserProgress: vi.fn(() => ({ progress: null, isLoading: false, error: null })),
    useUserStatistics: vi.fn(() => ({ statistics: null, isLoading: false, error: null })),
    // thêm các hook khác nếu cần
  };
});

// Mock useAuth hook
vi.mock('../hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: { id: 1, username: 'testuser', email: 'test@example.com', active: true, admin: false },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    })),
  };
});

/**
 * Mock nhẹ cho tanstack react-router để tránh lỗi "useRouter must be used inside a <RouterProvider>"
 * - Import nguyên bản vẫn còn (nếu cần) nhưng chúng ta override các hook có thể gọi trực tiếp.
 */
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // useNavigate thường trả về một hàm navigate, ở test ta trả về hàm giả
    useNavigate: () => {
      return (..._args: any[]) => {}; // noop
    },
    // useRouter có thể được gọi/destructuring trong code -> trả object không null
    useRouter: () => ({
      navigate: () => {},
      subscribe: () => () => {},
      // thêm property nếu component cụ thể cần (thì mình sẽ mở rộng)
    }),
  };
});

/**
 * Nếu cần thêm mock chung (ví dụ fetch, localStorage, matchMedia...), thêm vào đây.
 * Ví dụ mock window.matchMedia nếu có CSS/media queries tests:
 */
// if (typeof window !== 'undefined') {
//   // @ts-ignore
//   window.matchMedia = window.matchMedia || function() {
//     return { matches: false, addListener: () => {}, removeListener: () => {} };
//   };
// }
