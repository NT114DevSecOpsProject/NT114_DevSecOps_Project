import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Alert,
  AlertIcon,
  useToast,
  FormErrorMessage,
  Switch,
  HStack,
  Text,
  Skeleton,
} from '@chakra-ui/react';
import { useUser } from '../../hooks/queries/useUserQueries';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

interface FormData {
  username: string;
  email: string;
  active: boolean;
  admin: boolean;
}

interface FormErrors {
  username?: string;
  email?: string;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const toast = useToast();
  const { data: user, isLoading: userLoading, error: userError } = useUser(userId || 0);

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    active: true,
    admin: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load user data vào form khi user data thay đổi
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        active: user.active,
        admin: user.admin,
      });
    }
  }, [user]);

  // Reset form khi modal đóng
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        username: '',
        email: '',
        active: true,
        admin: false,
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate username
    if (!formData.username.trim()) {
      newErrors.username = 'Tên người dùng không được để trống';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Tên người dùng phải có ít nhất 3 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không đúng định dạng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm() || !user) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement API call để update user
      // Hiện tại API chưa có endpoint PUT /users/{id}
      // Tạm thời chỉ hiển thị thông báo
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      toast({
        title: 'Thông báo',
        description: 'Tính năng chỉnh sửa người dùng đang được phát triển. API chưa hỗ trợ endpoint này.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });

      // onClose(); // Tạm thời không đóng modal để user biết tính năng chưa hoạt động
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: (error as Error)?.message || 'Không thể cập nhật thông tin người dùng',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error khi user bắt đầu nhập
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Chỉnh sửa người dùng</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {userLoading ? (
            <VStack spacing={4}>
              <Skeleton height="60px" width="100%" />
              <Skeleton height="60px" width="100%" />
              <Skeleton height="60px" width="100%" />
              <Skeleton height="60px" width="100%" />
            </VStack>
          ) : userError ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              Không thể tải thông tin người dùng: {userError.message}
            </Alert>
          ) : user ? (
            <VStack spacing={4}>
              {/* API Warning */}
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="medium">Tính năng đang phát triển</Text>
                  <Text fontSize="sm">
                    API chưa hỗ trợ endpoint PUT /users/&#123;id&#125; để cập nhật thông tin người dùng.
                  </Text>
                </VStack>
              </Alert>

              {/* User ID (readonly) */}
              <FormControl>
                <FormLabel>ID người dùng</FormLabel>
                <Input
                  value={user.id}
                  isReadOnly
                  bg="gray.100"
                  _dark={{ bg: 'gray.700' }}
                />
              </FormControl>

              {/* Username */}
              <FormControl isInvalid={!!errors.username}>
                <FormLabel>Tên người dùng</FormLabel>
                <Input
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Nhập tên người dùng"
                  autoComplete="username"
                />
                <FormErrorMessage>{errors.username}</FormErrorMessage>
              </FormControl>

              {/* Email */}
              <FormControl isInvalid={!!errors.email}>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Nhập địa chỉ email"
                  autoComplete="email"
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>

              {/* Active Status */}
              <FormControl>
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">Trạng thái hoạt động</Text>
                    <Text fontSize="sm" color="text.muted">
                      Cho phép người dùng đăng nhập và sử dụng hệ thống
                    </Text>
                  </VStack>
                  <Switch
                    isChecked={formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                    colorScheme="green"
                  />
                </HStack>
              </FormControl>

              {/* Admin Status */}
              <FormControl>
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">Quyền quản trị viên</Text>
                    <Text fontSize="sm" color="text.muted">
                      Cấp quyền quản trị cho người dùng này
                    </Text>
                  </VStack>
                  <Switch
                    isChecked={formData.admin}
                    onChange={(e) => handleInputChange('admin', e.target.checked)}
                    colorScheme="purple"
                  />
                </HStack>
              </FormControl>
            </VStack>
          ) : (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              Không tìm thấy thông tin người dùng
            </Alert>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={onClose}
            isDisabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Đang cập nhật..."
            isDisabled={!user}
          >
            Cập nhật
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};