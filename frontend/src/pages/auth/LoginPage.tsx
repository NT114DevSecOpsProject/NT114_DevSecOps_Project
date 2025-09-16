import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Heading,
  Text,
  VStack,
  Card,
  CardBody,
  useToast,
} from '@chakra-ui/react';
import { LoginForm } from '../../components/forms/LoginForm';
import { useAuth } from '../../hooks/useAuth';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();

  // Redirect nếu đã đăng nhập
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' });
    }
  }, [isAuthenticated, navigate]);

  // Handle successful login
  const handleLoginSuccess = () => {
    toast({
      title: 'Đăng nhập thành công',
      description: 'Chào mừng bạn quay trở lại!',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    
    // Navigate to dashboard
    navigate({ to: '/dashboard' });
  };

  // Handle switch to register
  const handleSwitchToRegister = () => {
    navigate({ to: '/auth/register' });
  };

  return (
    <VStack spacing={8} align="center" w="100%">
      {/* Page Header */}
      <VStack spacing={2} textAlign="center">
        <Heading size="lg" color="text.primary">
          Đăng nhập
        </Heading>
        <Text fontSize="md" color="text.secondary">
          Đăng nhập vào tài khoản của bạn để tiếp tục
        </Text>
      </VStack>

      {/* Login Form Card */}
      <Card w="100%" maxW="400px" shadow="lg">
        <CardBody p={8}>
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={handleSwitchToRegister}
          />
        </CardBody>
      </Card>
    </VStack>
  );
};

export default LoginPage;