import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Heading,
  Text,
  VStack,
  Card,
  CardBody,
  Link,
  useToast,
} from '@chakra-ui/react';
import { RegisterForm } from '../../components/forms/RegisterForm';
import { useAuth } from '../../hooks/useAuth';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  // Redirect nếu đã đăng nhập
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, navigate]);

  // Handle successful registration
  const handleRegisterSuccess = () => {
    toast({
      title: 'Đăng ký thành công',
      description: 'Tài khoản của bạn đã được tạo thành công!',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    
    // Navigate to dashboard
    navigate({ to: '/dashboard' });
  };

  // Handle switch to login
  const handleSwitchToLogin = () => {
    navigate({ to: '/auth/login' });
  };

  return (
    <VStack spacing={8} align="center" w="100%">
      {/* Page Header */}
      <VStack spacing={2} textAlign="center">
        <Heading size="lg" color="text.primary">
          Đăng ký tài khoản
        </Heading>
        <Text fontSize="md" color="text.secondary">
          Tạo tài khoản mới để bắt đầu học lập trình
        </Text>
      </VStack>

      {/* Register Form Card */}
      <Card w="100%" maxW="400px" shadow="lg">
        <CardBody p={8}>
          <RegisterForm
            onSuccess={handleRegisterSuccess}
            onSwitchToLogin={handleSwitchToLogin}
          />
        </CardBody>
      </Card>

      {/* Additional Links */}
      <VStack spacing={2} textAlign="center" mt={4}>
        <Text fontSize="sm" color="text.secondary">
          Bằng cách đăng ký, bạn đồng ý với{' '}
          <Link color="interactive.default" href="#" textDecoration="underline">
            Điều khoản sử dụng
          </Link>{' '}
          và{' '}
          <Link color="interactive.default" href="#" textDecoration="underline">
            Chính sách bảo mật
          </Link>
        </Text>
      </VStack>
    </VStack>
  );
};

export default RegisterPage;