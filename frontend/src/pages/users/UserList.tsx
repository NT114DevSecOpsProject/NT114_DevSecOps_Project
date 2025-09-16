import React from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  HStack,
  useToast,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Text,
} from '@chakra-ui/react';
import { useUsers } from '../../hooks/queries/useUserQueries';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const UserList: React.FC = () => {
  const toast = useToast();
  const { data: users, isLoading, error, refetch } = useUsers();

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Đã làm mới danh sách',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <ProtectedRoute requireAdmin>
      <Container maxW="6xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <Heading size="lg">Quản lý người dùng</Heading>
            <Button onClick={handleRefresh} isLoading={isLoading}>
              Làm mới
            </Button>
          </HStack>

          {/* Content */}
          <Card>
            <CardBody>
              {isLoading ? (
                <Box textAlign="center" py={8}>
                  <LoadingSpinner />
                  <Text mt={4} color="text.muted">
                    Đang tải danh sách người dùng...
                  </Text>
                </Box>
              ) : error ? (
                <Alert status="error">
                  <AlertIcon />
                  Không thể tải danh sách người dùng: {error.message}
                </Alert>
              ) : !users || users.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Text color="text.muted">
                    Không có người dùng nào trong hệ thống
                  </Text>
                </Box>
              ) : (
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>ID</Th>
                        <Th>Tên người dùng</Th>
                        <Th>Email</Th>
                        <Th>Trạng thái</Th>
                        <Th>Quyền</Th>
                        <Th>Thao tác</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {users.map((user) => (
                        <Tr key={user.id}>
                          <Td>{user.id}</Td>
                          <Td fontWeight="medium">{user.username}</Td>
                          <Td>{user.email}</Td>
                          <Td>
                            <Badge
                              colorScheme={user.active ? 'green' : 'red'}
                              variant="subtle"
                            >
                              {user.active ? 'Hoạt động' : 'Không hoạt động'}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={user.admin ? 'purple' : 'gray'}
                              variant="subtle"
                            >
                              {user.admin ? 'Quản trị viên' : 'Người dùng'}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              <Button size="sm" variant="outline">
                                Xem chi tiết
                              </Button>
                              {!user.admin && (
                                <Button size="sm" colorScheme="red" variant="outline">
                                  Vô hiệu hóa
                                </Button>
                              )}
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </CardBody>
          </Card>

          {/* Stats */}
          {users && users.length > 0 && (
            <Card>
              <CardBody>
                <HStack spacing={8}>
                  <VStack>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {users.length}
                    </Text>
                    <Text fontSize="sm" color="text.muted">
                      Tổng số người dùng
                    </Text>
                  </VStack>
                  <VStack>
                    <Text fontSize="2xl" fontWeight="bold" color="green.500">
                      {users.filter(u => u.active).length}
                    </Text>
                    <Text fontSize="sm" color="text.muted">
                      Đang hoạt động
                    </Text>
                  </VStack>
                  <VStack>
                    <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                      {users.filter(u => u.admin).length}
                    </Text>
                    <Text fontSize="sm" color="text.muted">
                      Quản trị viên
                    </Text>
                  </VStack>
                </HStack>
              </CardBody>
            </Card>
          )}
        </VStack>
      </Container>
    </ProtectedRoute>
  );
};

export default UserList;