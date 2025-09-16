import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Container,
  VStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';

// Props cho ProtectedRoute
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallbackPath?: string;
}

// Component để bảo vệ routes yêu cầu authentication
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  fallbackPath = '/auth/login',
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <Container maxW="md" py={12}>
        <VStack spacing={8} align="center">
          <Card w="100%" maxW="400px" shadow="lg">
            <CardBody p={8} textAlign="center">
              <VStack spacing={4}>
                <Spinner size="lg" color="blue.500" />
                <Heading size="md">Đang kiểm tra quyền truy cập...</Heading>
                <Text color="text.muted">
                  Vui lòng chờ trong giây lát
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxW="md" py={12}>
        <VStack spacing={8} align="center">
          <Card w="100%" maxW="400px" shadow="lg">
            <CardBody p={8}>
              <VStack spacing={6}>
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  Có lỗi xảy ra khi kiểm tra quyền truy cập
                </Alert>

                <Text textAlign="center" color="text.muted">
                  {error.message || 'Không thể xác thực người dùng'}
                </Text>

                <VStack spacing={3} w="100%">
                  <Button
                    colorScheme="blue"
                    size="lg"
                    width="100%"
                    onClick={() => navigate({ to: fallbackPath })}
                    color="white"
                    bg="blue.500"
                    _hover={{
                      bg: "blue.600",
                    }}
                  >
                    Đăng nhập
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    width="100%"
                    onClick={() => navigate({ to: '/' })}
                  >
                    Về trang chủ
                  </Button>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Container maxW="md" py={12}>
        <VStack spacing={8} align="center">
          <VStack spacing={2} textAlign="center">
            <Heading size="xl" color="blue.600">
              Yêu cầu đăng nhập
            </Heading>
            <Text fontSize="lg" color="text.muted">
              Bạn cần đăng nhập để truy cập trang này
            </Text>
          </VStack>

          <Card w="100%" maxW="400px" shadow="lg">
            <CardBody p={8}>
              <VStack spacing={6}>
                <Text textAlign="center" color="text.muted">
                  Vui lòng đăng nhập để tiếp tục sử dụng các tính năng của CodeLand.io
                </Text>

                <VStack spacing={3} w="100%">
                  <Button
                    colorScheme="blue"
                    size="lg"
                    width="100%"
                    onClick={() => navigate({ to: '/auth/login' })}
                    color="white"
                    bg="blue.500"
                    _hover={{
                      bg: "blue.600",
                    }}
                  >
                    Đăng nhập
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    width="100%"
                    onClick={() => navigate({ to: '/auth/register' })}
                  >
                    Đăng ký tài khoản mới
                  </Button>
                </VStack>

                <Text fontSize="sm" textAlign="center" color="text.muted">
                  Hoặc{' '}
                  <Button
                    variant="link"
                    color="blue.500"
                    fontSize="sm"
                    onClick={() => navigate({ to: '/exercises' })}
                  >
                    xem danh sách bài tập
                  </Button>{' '}
                  mà không cần đăng nhập
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    );
  }

  // Check admin permission
  if (requireAdmin && !user.admin) {
    return (
      <Container maxW="md" py={12}>
        <VStack spacing={8} align="center">
          <VStack spacing={2} textAlign="center">
            <Heading size="xl" color="red.500">
              Không có quyền truy cập
            </Heading>
            <Text fontSize="lg" color="text.muted">
              Bạn không có quyền truy cập trang này
            </Text>
          </VStack>

          <Card w="100%" maxW="400px" shadow="lg">
            <CardBody p={8}>
              <VStack spacing={6}>
                <Alert status="warning" borderRadius="md">
                  <AlertIcon />
                  Trang này chỉ dành cho quản trị viên
                </Alert>

                <Text textAlign="center" color="text.muted">
                  Bạn đang đăng nhập với tài khoản: <strong>{user.username}</strong>
                  <br />
                  Tài khoản này không có quyền quản trị viên.
                </Text>

                <VStack spacing={3} w="100%">
                  <Button
                    colorScheme="blue"
                    size="lg"
                    width="100%"
                    onClick={() => navigate({ to: '/dashboard' })}
                    color="white"
                    bg="blue.500"
                    _hover={{
                      bg: "blue.600",
                    }}
                  >
                    Về trang chính
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    width="100%"
                    onClick={() => navigate({ to: '/auth/logout' })}
                  >
                    Đăng xuất
                  </Button>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};

