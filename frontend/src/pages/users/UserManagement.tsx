import React, { useState, useMemo } from 'react';
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
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
  Spacer,
  useDisclosure,
  ButtonGroup,
  IconButton,

  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useUsers } from '../../hooks/queries/useUserQueries';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { UserActionButtons } from '../../components/users/UserActionButtons';
import { AddUserModal } from '../../components/users/AddUserModal';
import { EditUserModal } from '../../components/users/EditUserModal';
import { UserDetailModal } from '../../components/users/UserDetailModal';
import { DeleteUserModal } from '../../components/users/DeleteUserModal';
import type { User } from '../../types/api';

const ITEMS_PER_PAGE = 10;

const UserManagement: React.FC = () => {
  const toast = useToast();
  const { data: users, isLoading, error, refetch } = useUsers();

  // Modal states
  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const detailModal = useDisclosure();
  const deleteModal = useDisclosure();

  // Selected user states
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter(user => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && user.active) ||
        (statusFilter === 'inactive' && !user.active);

      // Role filter
      const matchesRole = roleFilter === 'all' ||
        (roleFilter === 'admin' && user.admin) ||
        (roleFilter === 'user' && !user.admin);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, inactive: 0, admin: 0 };

    return {
      total: users.length,
      active: users.filter(u => u.active).length,
      inactive: users.filter(u => !u.active).length,
      admin: users.filter(u => u.admin).length,
    };
  }, [users]);

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

  // Modal handlers
  const handleViewDetail = (user: User) => {
    setSelectedUserId(user.id);
    detailModal.onOpen();
  };

  const handleEdit = (user: User) => {
    setSelectedUserId(user.id);
    editModal.onOpen();
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    deleteModal.onOpen();
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <ProtectedRoute requireAdmin>
      <Container maxW="7xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Flex align="center">
            <VStack align="start" spacing={1}>
              <Heading size="lg">Quản lý người dùng</Heading>
              <Text color="text.muted">
                Quản lý tài khoản người dùng trong hệ thống
              </Text>
            </VStack>
            <Spacer />
            <HStack spacing={3}>
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                onClick={addModal.onOpen}
              >
                Thêm người dùng
              </Button>
              <Button onClick={handleRefresh} isLoading={isLoading}>
                Làm mới
              </Button>
            </HStack>
          </Flex>

          {/* Statistics */}
          <Card>
            <CardBody>
              <StatGroup>
                <Stat>
                  <StatLabel>Tổng số người dùng</StatLabel>
                  <StatNumber color="blue.500">{stats.total}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Đang hoạt động</StatLabel>
                  <StatNumber color="green.500">{stats.active}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Không hoạt động</StatLabel>
                  <StatNumber color="red.500">{stats.inactive}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Quản trị viên</StatLabel>
                  <StatNumber color="purple.500">{stats.admin}</StatNumber>
                </Stat>
              </StatGroup>
            </CardBody>
          </Card>

          {/* Filters */}
          <Card>
            <CardBody>
              <Flex gap={4} wrap="wrap">
                {/* Search */}
                <InputGroup maxW="300px">
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="gray.300" />
                  </InputLeftElement>
                  <Input
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>

                {/* Status Filter */}
                <Select
                  maxW="200px"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Không hoạt động</option>
                </Select>

                {/* Role Filter */}
                <Select
                  maxW="200px"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
                >
                  <option value="all">Tất cả quyền</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="user">Người dùng</option>
                </Select>

                <Spacer />

                {/* Results count */}
                <Text color="text.muted" alignSelf="center">
                  Hiển thị {currentUsers.length} / {filteredUsers.length} người dùng
                </Text>
              </Flex>
            </CardBody>
          </Card>

          {/* User Table */}
          <Card>
            <CardBody p={0}>
              {isLoading ? (
                <Box textAlign="center" py={8}>
                  <LoadingSpinner />
                  <Text mt={4} color="text.muted">
                    Đang tải danh sách người dùng...
                  </Text>
                </Box>
              ) : error ? (
                <Box p={6}>
                  <Alert status="error">
                    <AlertIcon />
                    Không thể tải danh sách người dùng: {error.message}
                  </Alert>
                </Box>
              ) : filteredUsers.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Text color="text.muted">
                    {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                      ? 'Không tìm thấy người dùng nào phù hợp với bộ lọc'
                      : 'Không có người dùng nào trong hệ thống'}
                  </Text>
                </Box>
              ) : (
                <>
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead bg="gray.50" _dark={{ bg: 'gray.700' }}>
                        <Tr>
                          <Th>ID</Th>
                          <Th>Tên người dùng</Th>
                          <Th>Email</Th>
                          <Th>Trạng thái</Th>
                          <Th>Quyền</Th>
                          <Th width="120px">Thao tác</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {currentUsers.map((user) => (
                          <Tr key={user.id} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}>
                            <Td fontWeight="medium">{user.id}</Td>
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
                              <UserActionButtons
                                user={user}
                                onViewDetail={handleViewDetail}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                isLoading={isLoading}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Box p={4} borderTop="1px" borderColor="gray.200" _dark={{ borderColor: 'gray.600' }}>
                      <Flex align="center" justify="space-between">
                        <Text fontSize="sm" color="text.muted">
                          Trang {currentPage} / {totalPages} 
                          ({startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} của {filteredUsers.length})
                        </Text>

                        <ButtonGroup size="sm" isAttached variant="outline">
                          <IconButton
                            aria-label="Trang trước"
                            icon={<ChevronLeftIcon />}
                            onClick={handlePreviousPage}
                            isDisabled={currentPage === 1}
                          />

                          {getPageNumbers().map((page) => (
                            <Button
                              key={page}
                              onClick={() => handlePageClick(page)}
                              colorScheme={currentPage === page ? 'blue' : 'gray'}
                              variant={currentPage === page ? 'solid' : 'outline'}
                            >
                              {page}
                            </Button>
                          ))}

                          <IconButton
                            aria-label="Trang sau"
                            icon={<ChevronRightIcon />}
                            onClick={handleNextPage}
                            isDisabled={currentPage === totalPages}
                          />
                        </ButtonGroup>
                      </Flex>
                    </Box>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </VStack>
      </Container>

      {/* Modals */}
      <AddUserModal
        isOpen={addModal.isOpen}
        onClose={addModal.onClose}
      />

      <EditUserModal
        isOpen={editModal.isOpen}
        onClose={editModal.onClose}
        userId={selectedUserId}
      />

      <UserDetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.onClose}
        userId={selectedUserId}
      />

      <DeleteUserModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.onClose}
        user={selectedUser}
      />
    </ProtectedRoute>
  );
};

export default UserManagement;