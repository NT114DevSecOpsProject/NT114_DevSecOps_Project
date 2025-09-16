import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  Alert,
  AlertIcon,
  useToast,
  HStack,
  Badge,
  Box,
  Divider,
} from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';
import type { User } from '../../types/api';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!user) return;

    setIsDeleting(true);

    try {
      // TODO: Implement API call để delete user
      // Hiện tại API chưa có endpoint DELETE /users/{id}
      // Tạm thời chỉ hiển thị thông báo
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      toast({
        title: 'Thông báo',
        description: 'Tính năng xóa người dùng đang được phát triển. API chưa hỗ trợ endpoint này.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });

      // onClose(); // Tạm thời không đóng modal để user biết tính năng chưa hoạt động
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: (error as Error)?.message || 'Không thể xóa người dùng',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset state khi modal đóng
  React.useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="red.500">
          <HStack>
            <WarningIcon />
            <Text>Xác nhận xóa người dùng</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* API Warning */}
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="medium">Tính năng đang phát triển</Text>
                <Text fontSize="sm">
                  API chưa hỗ trợ endpoint DELETE /users/&#123;id&#125; để xóa người dùng.
                </Text>
              </VStack>
            </Alert>

            {user && (
              <>
                {/* Warning Message */}
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="medium">Cảnh báo: Hành động không thể hoàn tác!</Text>
                    <Text fontSize="sm">
                      Việc xóa người dùng sẽ xóa vĩnh viễn tất cả dữ liệu liên quan bao gồm:
                    </Text>
                  </VStack>
                </Alert>

                {/* Consequences List */}
                <Box pl={4}>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm">• Thông tin tài khoản và hồ sơ cá nhân</Text>
                    <Text fontSize="sm">• Lịch sử làm bài tập và điểm số</Text>
                    <Text fontSize="sm">• Tất cả dữ liệu hoạt động trong hệ thống</Text>
                  </VStack>
                </Box>

                <Divider />

                {/* User Info */}
                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Thông tin người dùng sẽ bị xóa:
                  </Text>
                  
                  <VStack spacing={2} align="stretch" p={3} bg="gray.50" borderRadius="md" _dark={{ bg: 'gray.700' }}>
                    <HStack justify="space-between">
                      <Text fontWeight="medium">ID:</Text>
                      <Text>{user.id}</Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontWeight="medium">Tên người dùng:</Text>
                      <Text fontWeight="bold">{user.username}</Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontWeight="medium">Email:</Text>
                      <Text>{user.email}</Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontWeight="medium">Trạng thái:</Text>
                      <Badge
                        colorScheme={user.active ? 'green' : 'red'}
                        variant="subtle"
                      >
                        {user.active ? 'Hoạt động' : 'Không hoạt động'}
                      </Badge>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontWeight="medium">Quyền:</Text>
                      <Badge
                        colorScheme={user.admin ? 'purple' : 'gray'}
                        variant="subtle"
                      >
                        {user.admin ? 'Quản trị viên' : 'Người dùng'}
                      </Badge>
                    </HStack>
                  </VStack>
                </Box>

                {/* Admin Protection */}
                {user.admin && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium">Lưu ý về tài khoản quản trị viên</Text>
                      <Text fontSize="sm">
                        Đây là tài khoản quản trị viên. Việc xóa có thể ảnh hưởng đến quản lý hệ thống.
                      </Text>
                    </VStack>
                  </Alert>
                )}

                {/* Confirmation Text */}
                <Box textAlign="center" p={4} bg="red.50" borderRadius="md" _dark={{ bg: 'red.900' }}>
                  <Text fontWeight="bold" color="red.600" _dark={{ color: 'red.300' }}>
                    Bạn có chắc chắn muốn xóa người dùng "{user.username}" không?
                  </Text>
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={onClose}
            isDisabled={isDeleting}
          >
            Hủy
          </Button>
          <Button
            colorScheme="red"
            onClick={handleDelete}
            isLoading={isDeleting}
            loadingText="Đang xóa..."
            isDisabled={!user}
          >
            Xác nhận xóa
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};