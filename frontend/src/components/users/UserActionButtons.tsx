import React from 'react';
import {
  HStack,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { ViewIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import type { User } from '../../types/api';

interface UserActionButtonsProps {
  user: User;
  onViewDetail: (user: User) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  isLoading?: boolean;
}

export const UserActionButtons: React.FC<UserActionButtonsProps> = ({
  user,
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
          aria-label="Xem chi tiết người dùng"
          icon={<ViewIcon />}
          size="sm"
          variant="ghost"
          colorScheme="blue"
          onClick={() => onViewDetail(user)}
          isDisabled={isLoading}
        />
      </Tooltip>

      {/* Nút chỉnh sửa */}
      <Tooltip label="Chỉnh sửa" placement="top">
        <IconButton
          aria-label="Chỉnh sửa người dùng"
          icon={<EditIcon />}
          size="sm"
          variant="ghost"
          colorScheme="green"
          onClick={() => onEdit(user)}
          isDisabled={isLoading}
        />
      </Tooltip>

      {/* Nút xóa - chỉ hiển thị cho non-admin users */}
      {!user.admin && (
        <Tooltip label="Xóa người dùng" placement="top">
          <IconButton
            aria-label="Xóa người dùng"
            icon={<DeleteIcon />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => onDelete(user)}
            isDisabled={isLoading}
          />
        </Tooltip>
      )}
    </HStack>
  );
};