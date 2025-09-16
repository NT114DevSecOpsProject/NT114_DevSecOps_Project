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
} from '@chakra-ui/react';
import { useCreateUser, useAdminCreateUser } from '../../hooks/queries/useUserQueries';
import type { UserRegistration, AdminUserCreate } from '../../types/api';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData extends UserRegistration {
  confirmPassword: string;
  isAdmin: boolean;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const createUserMutation = useCreateUser();
  const adminCreateUserMutation = useAdminCreateUser();

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    isAdmin: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form khi modal đóng
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        isAdmin: false,
      });
      setErrors({});
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

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (formData.isAdmin) {
        // Sử dụng endpoint admin_create cho user có quyền admin
        const adminUserData: AdminUserCreate = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          admin: true,
          active: true,
        };

        const response = await adminCreateUserMutation.mutateAsync(adminUserData);

        toast({
          title: 'Tạo admin thành công! 🎉',
          description: `User "${response.data.username}" đã được tạo với quyền quản trị viên`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
      } else {
        // Sử dụng endpoint thường cho user bình thường
        const userData: UserRegistration = {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
        };

        await createUserMutation.mutateAsync(userData);

        toast({
          title: 'Thành công',
          description: 'Đã tạo người dùng mới thành công',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: (error as Error)?.message || 'Không thể tạo người dùng mới',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
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
        <ModalHeader>Thêm người dùng mới</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
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

            {/* Password */}
            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Mật khẩu</FormLabel>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="new-password"
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            {/* Confirm Password */}
            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel>Xác nhận mật khẩu</FormLabel>
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
              />
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            </FormControl>

            {/* Admin Switch */}
            <FormControl>
              <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium">Quyền quản trị viên</Text>
                  <Text fontSize="sm" color="text.muted">
                    Cấp quyền quản trị cho người dùng này
                  </Text>
                  <Text fontSize="xs" color="green.500" fontWeight="medium">
                    ✅ API hỗ trợ endpoint /users/admin_create
                  </Text>
                </VStack>
                <Switch
                  isChecked={formData.isAdmin}
                  onChange={(e) => handleInputChange('isAdmin', e.target.checked)}
                  colorScheme="purple"
                  isDisabled={false}
                />
              </HStack>
            </FormControl>

            {/* Admin Switch Info */}
            {formData.isAdmin && (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="medium" fontSize="sm">
                    👑 Tạo user với quyền quản trị viên
                  </Text>
                  <Text fontSize="sm">
                    User sẽ được tạo với quyền admin ngay lập tức thông qua endpoint <code>/users/admin_create</code>
                  </Text>
                  <VStack align="start" spacing={0} pl={4}>
                    <Text fontSize="xs" color="text.muted">• Có đầy đủ quyền quản trị hệ thống</Text>
                    <Text fontSize="xs" color="text.muted">• Có thể tạo và quản lý người dùng khác</Text>
                    <Text fontSize="xs" color="text.muted">• Trạng thái active mặc định</Text>
                  </VStack>
                </VStack>
              </Alert>
            )}

            {/* API Error Display */}
            {(createUserMutation.error || adminCreateUserMutation.error) && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {createUserMutation.error?.message || 
                 adminCreateUserMutation.error?.message || 
                 'Có lỗi xảy ra khi tạo người dùng'}
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={onClose}
            isDisabled={createUserMutation.isPending || adminCreateUserMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            colorScheme={formData.isAdmin ? "purple" : "blue"}
            onClick={handleSubmit}
            isLoading={createUserMutation.isPending || adminCreateUserMutation.isPending}
            loadingText={formData.isAdmin ? "Đang tạo admin..." : "Đang tạo user..."}
          >
            {formData.isAdmin ? '👑 Tạo quản trị viên' : 'Tạo người dùng'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};