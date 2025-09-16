import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Icon,
} from '@chakra-ui/react';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';

const LogoutPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { logout, isLogoutLoading, logoutError, isAuthenticated } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(true);

  // Redirect nếu không authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login' });
    }
  }, [isAuthenticated, navigate]);

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowConfirmation(false);
    
    try {
      await logout();
      toast({
        title: 'Đăng xuất thành công',
        description: 'Bạn đã đăng xuất khỏi hệ thống',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Navigate to exercises page
      navigate({ to: '/exercises' });
    } catch (error) {
      console.error('Logout failed:', error);
      // Vẫn navigate về exercises ngay cả khi logout API failed
      navigate({ to: '/exercises' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle cancel logout
  const handleCancel = () => {
    navigate({ to: '/dashboard' });
  };

  // Handle go to login
  const handleGoToLogin = () => {
    navigate({ to: '/auth/login' });
  };

  // Nếu đang logout
  if (isLogoutLoading || isLoggingOut || !showConfirmation) {
    return (
      <VStack spacing={8} align="center" w="100%">
        <Card w="100%" maxW="400px" shadow="lg">
          <CardBody p={8} textAlign="center">
            <VStack spacing={4}>
              <Spinner size="lg" color="interactive.default" />
              <Heading size="md">Đang đăng xuất...</Heading>
              <Text color="text.secondary">
                Vui lòng chờ trong giây lát
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  }

  return (
    <VStack spacing={8} align="center" w="100%">
      {/* Page Header */}
      <VStack spacing={2} textAlign="center">
        <Icon as={FiLogOut} boxSize={12} color="text.secondary" />
        <Heading size="lg" color="text.primary">
          Đăng xuất
        </Heading>
        <Text fontSize="md" color="text.secondary">
          Bạn có chắc chắn muốn đăng xuất?
        </Text>
      </VStack>

      {/* Logout Confirmation Card */}
      <Card w="100%" maxW="400px" shadow="lg">
        <CardBody p={8}>
          <VStack spacing={6}>
            {/* Error message */}
            {logoutError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {logoutError.message || 'Có lỗi xảy ra khi đăng xuất'}
              </Alert>
            )}

            <Text textAlign="center" color="text.secondary">
              Sau khi đăng xuất, bạn sẽ cần đăng nhập lại để truy cập các tính năng cá nhân như dashboard và lịch sử điểm số.
            </Text>

            <VStack spacing={3} w="100%">
              <Button
                colorScheme="red"
                size="lg"
                width="100%"
                onClick={handleLogout}
                isLoading={isLogoutLoading}
                loadingText="Đang đăng xuất..."
                leftIcon={<FiLogOut />}
              >
                Xác nhận đăng xuất
              </Button>

              <Button
                variant="outline"
                size="lg"
                width="100%"
                onClick={handleCancel}
              >
                Hủy bỏ
              </Button>
            </VStack>

            <Text fontSize="sm" textAlign="center" color="text.secondary">
              Hoặc{' '}
              <Button
                variant="link"
                color="interactive.default"
                fontSize="sm"
                onClick={handleGoToLogin}
              >
                đăng nhập với tài khoản khác
              </Button>
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default LogoutPage;