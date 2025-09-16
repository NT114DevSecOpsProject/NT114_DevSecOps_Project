import React from 'react';
import { lazyLoad } from '../../utils/lazyLoad';
import { withLazyModal } from '../common/LazyModal';

// Lazy load exercise modals để giảm bundle size khi không sử dụng
export const LazyAddExerciseModal = lazyLoad(
  () => import('./AddExerciseModal').then(module => ({ default: module.AddExerciseModal })),
  {
    displayName: 'LazyAddExerciseModal'
  }
);

export const LazyEditExerciseModal = lazyLoad(
  () => import('./EditExerciseModal').then(module => ({ default: module.EditExerciseModal })),
  {
    displayName: 'LazyEditExerciseModal'
  }
);

export const LazyExerciseDetailModal = lazyLoad(
  () => import('./ExerciseDetailModal').then(module => ({ default: module.ExerciseDetailModal })),
  {
    displayName: 'LazyExerciseDetailModal'
  }
);

export const LazyDeleteExerciseModal = lazyLoad(
  () => import('./DeleteExerciseModal').then(module => ({ default: module.DeleteExerciseModal })),
  {
    displayName: 'LazyDeleteExerciseModal'
  }
);

// Alternative: sử dụng withLazyModal wrapper
export const LazyAddExerciseModalWithWrapper = withLazyModal(
  React.lazy(() => import('./AddExerciseModal').then(module => ({ default: module.AddExerciseModal }))),
  'Thêm bài tập mới'
);

export const LazyEditExerciseModalWithWrapper = withLazyModal(
  React.lazy(() => import('./EditExerciseModal').then(module => ({ default: module.EditExerciseModal }))),
  'Chỉnh sửa bài tập'
);

export const LazyExerciseDetailModalWithWrapper = withLazyModal(
  React.lazy(() => import('./ExerciseDetailModal').then(module => ({ default: module.ExerciseDetailModal }))),
  'Chi tiết bài tập'
);

export const LazyDeleteExerciseModalWithWrapper = withLazyModal(
  React.lazy(() => import('./DeleteExerciseModal').then(module => ({ default: module.DeleteExerciseModal }))),
  'Xóa bài tập'
);