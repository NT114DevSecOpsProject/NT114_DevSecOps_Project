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
  Tooltip,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useExercises } from '../../hooks/queries/useExerciseQueries';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ExerciseActionButtons } from '../../components/exercises/ExerciseActionButtons';
import { AddExerciseModal } from '../../components/exercises/AddExerciseModal';
import { EditExerciseModal } from '../../components/exercises/EditExerciseModal';
import { ExerciseDetailModal } from '../../components/exercises/ExerciseDetailModal';
import { DeleteExerciseModal } from '../../components/exercises/DeleteExerciseModal';
import type { Exercise } from '../../types/api';

const ITEMS_PER_PAGE = 10;

// Difficulty labels
const DIFFICULTY_LABELS = {
  0: 'Dễ',
  1: 'Trung bình', 
  2: 'Khó'
};

const DIFFICULTY_COLORS = {
  0: 'green',
  1: 'yellow',
  2: 'red'
};

const ExerciseManagement: React.FC = () => {
  const toast = useToast();
  const { data: exercises, isLoading, error, refetch } = useExercises();

  // Modal states
  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const detailModal = useDisclosure();
  const deleteModal = useDisclosure();

  // Selected exercise states
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | '0' | '1' | '2'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter exercises based on search and filters
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];

    return exercises.filter(exercise => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.body.toLowerCase().includes(searchTerm.toLowerCase());

      // Difficulty filter
      const matchesDifficulty = difficultyFilter === 'all' ||
        exercise.difficulty.toString() === difficultyFilter;

      return matchesSearch && matchesDifficulty;
    });
  }, [exercises, searchTerm, difficultyFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredExercises.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentExercises = filteredExercises.slice(startIndex, endIndex);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, difficultyFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!exercises) return { total: 0, easy: 0, medium: 0, hard: 0 };

    return {
      total: exercises.length,
      easy: exercises.filter(e => e.difficulty === 0).length,
      medium: exercises.filter(e => e.difficulty === 1).length,
      hard: exercises.filter(e => e.difficulty === 2).length,
    };
  }, [exercises]);

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
  const handleViewDetail = (exercise: Exercise) => {
    setSelectedExerciseId(exercise.id);
    detailModal.onOpen();
  };

  const handleEdit = (exercise: Exercise) => {
    setSelectedExerciseId(exercise.id);
    editModal.onOpen();
  };

  const handleDelete = (exercise: Exercise) => {
    setSelectedExercise(exercise);
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
              <Heading size="lg">Quản lý bài tập</Heading>
              <Text color="text.muted">
                Quản lý các bài tập code trong hệ thống
              </Text>
            </VStack>
            <Spacer />
            <HStack spacing={3}>
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                onClick={addModal.onOpen}
              >
                Thêm bài tập
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
                  <StatLabel>Tổng số bài tập</StatLabel>
                  <StatNumber color="blue.500">{stats.total}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Dễ</StatLabel>
                  <StatNumber color="green.500">{stats.easy}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Trung bình</StatLabel>
                  <StatNumber color="yellow.500">{stats.medium}</StatNumber>
                </Stat>
                <Stat>
                  <StatLabel>Khó</StatLabel>
                  <StatNumber color="red.500">{stats.hard}</StatNumber>
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
                    placeholder="Tìm kiếm theo tiêu đề hoặc mô tả..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>

                {/* Difficulty Filter */}
                <Select
                  maxW="200px"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value as 'all' | '0' | '1' | '2')}
                >
                  <option value="all">Tất cả độ khó</option>
                  <option value="0">Dễ</option>
                  <option value="1">Trung bình</option>
                  <option value="2">Khó</option>
                </Select>

                <Spacer />

                {/* Results count */}
                <Text color="text.muted" alignSelf="center">
                  Hiển thị {currentExercises.length} / {filteredExercises.length} bài tập
                </Text>
              </Flex>
            </CardBody>
          </Card>

          {/* Exercise Table */}
          <Card>
            <CardBody p={0}>
              {isLoading ? (
                <Box textAlign="center" py={8}>
                  <LoadingSpinner />
                  <Text mt={4} color="text.muted">
                    Đang tải danh sách bài tập...
                  </Text>
                </Box>
              ) : error ? (
                <Box p={6}>
                  <Alert status="error">
                    <AlertIcon />
                    Không thể tải danh sách bài tập: {error.message}
                  </Alert>
                </Box>
              ) : filteredExercises.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Text color="text.muted">
                    {searchTerm || difficultyFilter !== 'all'
                      ? 'Không tìm thấy bài tập nào phù hợp với bộ lọc'
                      : 'Không có bài tập nào trong hệ thống'}
                  </Text>
                </Box>
              ) : (
                <>
                  <Box overflowX="auto">
                    <Table variant="simple">
                      <Thead bg="gray.50" _dark={{ bg: 'gray.700' }}>
                        <Tr>
                          <Th>ID</Th>
                          <Th>Tiêu đề</Th>
                          <Th>Mô tả</Th>
                          <Th>Độ khó</Th>
                          <Th>Test cases</Th>
                          <Th width="120px">Thao tác</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {currentExercises.map((exercise) => (
                          <Tr key={exercise.id} _hover={{ bg: 'gray.50', _dark: { bg: 'gray.700' } }}>
                            <Td fontWeight="medium">{exercise.id}</Td>
                            <Td fontWeight="medium" maxW="200px">
                              <Tooltip label={exercise.title} placement="top">
                                <Text isTruncated>{exercise.title}</Text>
                              </Tooltip>
                            </Td>
                            <Td maxW="300px">
                              <Tooltip label={exercise.body} placement="top">
                                <Text isTruncated>{exercise.body}</Text>
                              </Tooltip>
                            </Td>
                            <Td>
                              <Badge
                                colorScheme={DIFFICULTY_COLORS[exercise.difficulty as keyof typeof DIFFICULTY_COLORS]}
                                variant="subtle"
                              >
                                {DIFFICULTY_LABELS[exercise.difficulty as keyof typeof DIFFICULTY_LABELS]}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontSize="sm" color="text.muted">
                                {exercise.test_cases?.length || 0} test cases
                              </Text>
                            </Td>
                            <Td>
                              <ExerciseActionButtons
                                exercise={exercise}
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
                          ({startIndex + 1}-{Math.min(endIndex, filteredExercises.length)} của {filteredExercises.length})
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
      <AddExerciseModal
        isOpen={addModal.isOpen}
        onClose={addModal.onClose}
      />

      <EditExerciseModal
        isOpen={editModal.isOpen}
        onClose={editModal.onClose}
        exerciseId={selectedExerciseId}
      />

      <ExerciseDetailModal
        isOpen={detailModal.isOpen}
        onClose={detailModal.onClose}
        exerciseId={selectedExerciseId}
      />

      <DeleteExerciseModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.onClose}
        exercise={selectedExercise}
      />
    </ProtectedRoute>
  );
};

export default ExerciseManagement;