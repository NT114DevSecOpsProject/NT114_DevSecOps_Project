import React from 'react';
import { lazyLoad } from '../../utils/lazyLoad';
import { withLazyModal } from '../common/LazyModal';

// Lazy load user modals để giảm bundle size khi không sử dụng
export const LazyAddUserModal = lazyLoad(
  () => import('./AddUserModal').then(module => ({ default: module.AddUserModal })),
  {
    displayName: 'LazyAddUserModal'
  }
);

export const LazyEditUserModal = lazyLoad(
  () => import('./EditUserModal').then(module => ({ default: module.EditUserModal })),
  {
    displayName: 'LazyEditUserModal'
  }
);

export const LazyUserDetailModal = lazyLoad(
  () => import('./UserDetailModal').then(module => ({ default: module.UserDetailModal })),
  {
    displayName: 'LazyUserDetailModal'
  }
);

export const LazyDeleteUserModal = lazyLoad(
  () => import('./DeleteUserModal').then(module => ({ default: module.DeleteUserModal })),
  {
    displayName: 'LazyDeleteUserModal'
  }
);

// Cũng có thể sử dụng withLazyModal wrapper
export const LazyAddUserModalWithWrapper = withLazyModal(
  React.lazy(() => import('./AddUserModal').then(module => ({ default: module.AddUserModal }))),
  'Thêm người dùng mới'
);

export const LazyEditUserModalWithWrapper = withLazyModal(
  React.lazy(() => import('./EditUserModal').then(module => ({ default: module.EditUserModal }))),
  'Chỉnh sửa người dùng'
);

export const LazyUserDetailModalWithWrapper = withLazyModal(
  React.lazy(() => import('./UserDetailModal').then(module => ({ default: module.UserDetailModal }))),
  'Chi tiết người dùng'
);

export const LazyDeleteUserModalWithWrapper = withLazyModal(
  React.lazy(() => import('./DeleteUserModal').then(module => ({ default: module.DeleteUserModal }))),
  'Xóa người dùng'
);