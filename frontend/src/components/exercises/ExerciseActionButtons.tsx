import React from 'react';
import {
  HStack,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { ViewIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import type { Exercise } from '../../types/api';

interface ExerciseActionButtonsProps {
  exercise: Exercise;
  onViewDetail: (exercise: Exercise) => void;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
  isLoading?: boolean;
}

export const ExerciseActionButtons: React.FC<ExerciseActionButtonsProps> = ({
  exercise,
  onViewDetail,
  onEdit,
  onDelete,
  isLoading = false,
}) => {
  return (
    <HStack spacing={1}>
      {/* Nút xem chi tiết */}
      <Tooltip label="Xem chi tiết" placement="top">
        <IconButton
          aria-label="Xem chi tiết bài tập"
          icon={<ViewIcon />}
          size="sm"
          variant="ghost"
          colorScheme="blue"
          onClick={() => onViewDetail(exercise)}
          isDisabled={isLoading}
        />
      </Tooltip>

      {/* Nút chỉnh sửa */}
      <Tooltip label="Chỉnh sửa" placement="top">
        <IconButton
          aria-label="Chỉnh sửa bài tập"
          icon={<EditIcon />}
          size="sm"
          variant="ghost"
          colorScheme="green"
          onClick={() => onEdit(exercise)}
          isDisabled={isLoading}
        />
      </Tooltip>

      {/* Nút xóa */}
      <Tooltip label="Xóa bài tập" placement="top">
        <IconButton
          aria-label="Xóa bài tập"
          icon={<DeleteIcon />}
          size="sm"
          variant="ghost"
          colorScheme="red"
          onClick={() => onDelete(exercise)}
          isDisabled={isLoading}
        />
      </Tooltip>
    </HStack>
  );
};