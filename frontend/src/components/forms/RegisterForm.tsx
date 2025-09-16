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
  FormHelperText,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import type { UserRegistration } from '../../types/api';

// Props cho RegisterForm
interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

// Extended form data với password confirmation
interface RegisterFormData extends UserRegistration {
  confirmPassword: string;
}

// Validation functions
const validateUsername = (username: string): string | null => {
  if (!username) return 'Tên người dùng là bắt buộc';
  if (username.length < 3) return 'Tên người dùng phải có ít nhất 3 ký tự';
  if (username.length > 128) return 'Tên người dùng không được quá 128 ký tự';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới';
  }
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email) return 'Email là bắt buộc';
  if (email.length > 128) return 'Email không được quá 128 ký tự';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Email không hợp lệ';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Mật khẩu là bắt buộc';
  if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
  return null;
};

const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) return 'Xác nhận mật khẩu là bắt buộc';
  if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp';
  return null;
};

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  // State cho form
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Auth context
  const { register, isRegisterLoading, registerError } = useAuth();



  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};
    
    const usernameError = validateUsername(formData.username);
    if (usernameError) newErrors.username = usernameError;
    
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      // Chỉ gửi data cần thiết cho API
      const { confirmPassword: _, ...registrationData } = formData;
      await register(registrationData);
      onSuccess?.();
    } catch (error) {
      // Error đã được handle trong AuthContext
      console.error('Registration failed:', error);
      
      // Focus vào username field để user có thể thử lại
      const usernameInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (usernameInput) {
        usernameInput.focus();
      }
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} w="100%" maxW="400px">
      <VStack spacing={4}>
        {/* Username field */}
        <FormControl isInvalid={!!errors.username} isRequired>
          <FormLabel>Tên người dùng</FormLabel>
          <Input
            type="text"
            value={formData.username}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({ ...prev, username: value }));
              // Clear error khi user bắt đầu nhập
              if (errors.username) {
                setErrors(prev => ({ ...prev, username: undefined }));
              }
            }}
            placeholder="Nhập tên người dùng"
            autoComplete="username"
          />
          <FormHelperText>
            Chỉ được chứa chữ cái, số và dấu gạch dưới
          </FormHelperText>
          <FormErrorMessage>{errors.username}</FormErrorMessage>
        </FormControl>

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
              autoComplete="new-password"
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
          <FormHelperText>
            Mật khẩu phải có ít nhất 6 ký tự
          </FormHelperText>
          <FormErrorMessage>{errors.password}</FormErrorMessage>
        </FormControl>

        {/* Confirm Password field */}
        <FormControl isInvalid={!!errors.confirmPassword} isRequired>
          <FormLabel>Xác nhận mật khẩu</FormLabel>
          <InputGroup>
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, confirmPassword: value }));
                // Clear error khi user bắt đầu nhập
                if (errors.confirmPassword) {
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }
                // Clear confirm password error khi password thay đổi
                if (errors.confirmPassword) {
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
            />
            <InputRightElement>
              <IconButton
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                icon={showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                onClick={toggleConfirmPasswordVisibility}
                variant="ghost"
                size="sm"
              />
            </InputRightElement>
          </InputGroup>
          <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
        </FormControl>

        {/* Error message */}
        {registerError && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {registerError.message || 'Đăng ký thất bại, vui lòng thử lại'}
          </Alert>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          width="100%"
          isLoading={isRegisterLoading}
          loadingText="Đang đăng ký..."
          isDisabled={!formData.username || !formData.email || !formData.password || !formData.confirmPassword}
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
          Đăng ký
        </Button>

        {/* Switch to login */}
        {onSwitchToLogin && (
          <Text textAlign="center" fontSize="sm">
            Đã có tài khoản?{' '}
            <Link
              color="blue.500"
              onClick={onSwitchToLogin}
              cursor="pointer"
              _hover={{ textDecoration: 'underline' }}
            >
              Đăng nhập ngay
            </Link>
          </Text>
        )}
      </VStack>
    </Box>
  );
};