import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  VStack,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  IconButton,
  Text,
  Link,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import type { UserLogin } from '../../types/api';

// Props cho LoginForm
interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

// Validation functions
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email là bắt buộc';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Email không hợp lệ';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Mật khẩu là bắt buộc';
  if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
  return null;
};

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
}) => {
  // State cho form
  const [formData, setFormData] = useState<UserLogin>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<UserLogin>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Auth context
  const { login, isLoginLoading, loginError } = useAuth();



  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<UserLogin> = {};

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await login(formData);
      onSuccess?.();
    } catch (error) {
      // Error đã được handle trong AuthContext
      console.error('Login failed:', error);
      
      // Focus vào email field để user có thể thử lại
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      if (emailInput) {
        emailInput.focus();
      }
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="400px">
      <VStack spacing={4}>
        {/* Email field */}
        <FormControl isInvalid={!!errors.email} isRequired>
          <FormLabel>Email</FormLabel>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({ ...prev, email: value }));
              // Clear error khi user bắt đầu nhập
              if (errors.email) {
                setErrors(prev => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="Nhập email của bạn"
            autoComplete="email"
          />
          <FormErrorMessage>{errors.email}</FormErrorMessage>
        </FormControl>

        {/* Password field */}
        <FormControl isInvalid={!!errors.password} isRequired>
          <FormLabel>Mật khẩu</FormLabel>
          <InputGroup>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, password: value }));
                // Clear error khi user bắt đầu nhập
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: undefined }));
                }
              }}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
            <InputRightElement>
              <IconButton
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                icon={showPassword ? <FiEyeOff /> : <FiEye />}
                onClick={togglePasswordVisibility}
                variant="ghost"
                size="sm"
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.password}</FormErrorMessage>
        </FormControl>

        {/* Error message */}
        {loginError && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {loginError.message || 'Đăng nhập thất bại, vui lòng thử lại'}
          </Alert>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          width="100%"
          isLoading={isLoginLoading}
          loadingText="Đang đăng nhập..."
          isDisabled={!formData.email || !formData.password}
          color="white"
          bg="blue.500"
          _hover={{
            bg: "blue.600",
          }}
          _active={{
            bg: "blue.700",
          }}
          _disabled={{
            opacity: 0.6,
            cursor: 'not-allowed',
          }}
        >
          Đăng nhập
        </Button>

        {/* Switch to register */}
        {onSwitchToRegister && (
          <Text textAlign="center" fontSize="sm">
            Chưa có tài khoản?{' '}
            <Link
              color="blue.500"
              onClick={onSwitchToRegister}
              cursor="pointer"
              _hover={{ textDecoration: 'underline' }}
            >
              Đăng ký ngay
            </Link>
          </Text>
        )}
      </VStack>
    </Box>
  );
};