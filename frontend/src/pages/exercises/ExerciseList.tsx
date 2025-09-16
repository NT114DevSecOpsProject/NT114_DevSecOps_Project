import React, { useState, useMemo } from 'react';
import {
  Box,
  Heading,
  Text,
  Stack,
  SimpleGrid,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  Select,
  Button,
  Badge,
  useColorModeValue,
  Icon,
  VStack,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { FiSearch, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { useExercises } from '../../hooks/queries/useExerciseQueries';
import { useExerciseProgress } from '../../hooks/useExerciseProgress';
import { useAuth } from '../../hooks/useAuth';

import LoadingSpinner from '../../components/common/LoadingSpinner';
import QueryErrorBoundary from '../../components/common/QueryErrorBoundary';
import ExerciseCard from '../../components/exercises/ExerciseCard';

// Pagination constants
const EXERCISES_PER_PAGE = 12;

// Filter options
const FILTER_OPTIONS = {
  all: 'Tất cả',
  completed: 'Đã hoàn thành',
  attempted: 'Đã thử',
  not_attempted: 'Chưa thử',
} as const;

const DIFFICULTY_OPTIONS = {
  all: 'Tất cả độ khó',
  0: 'Dễ',
  1: 'Trung bình',
  2: 'Khó',
} as const;

type FilterType = keyof typeof FILTER_OPTIONS;
type DifficultyFilter = keyof typeof DIFFICULTY_OPTIONS;

const ExerciseList: React.FC = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Data fetching
  const { data: exercises, isLoading, error, refetch } = useExercises();
  const { user } = useAuth();
  const { exerciseProgress, progressStats } = useExerciseProgress();

  // Theme colors
  const searchBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Create progress lookup map
  const progressMap = useMemo(() => {
    return new Map(exerciseProgress.map(progress => [progress.exerciseId, progress]));
  }, [exerciseProgress]);

  // Filter and search exercises
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];

    let filtered = exercises;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(exercise =>
        exercise.title.toLowerCase().includes(query) ||
        exercise.body.toLowerCase().includes(query) ||
        exercise.test_cases.some(tc => tc.toLowerCase().includes(query)) ||
        exercise.id.toString().includes(query)
      );
    }

    // Apply status filter
    if (filterType !== 'all') {
      filtered = filtered.filter(exercise => {
        const progress = progressMap.get(exercise.id);
        
        switch (filterType) {
          case 'completed':
            return progress?.isCompleted === true;
          case 'attempted':
            return progress?.isAttempted === true;
          case 'not_attempted':
            return !progress?.isAttempted;
          default:
            return true;
        }
      });
    }

    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      const difficulty = Number(difficultyFilter);
      filtered = filtered.filter(exercise => exercise.difficulty === difficulty);
    }

    return filtered;
  }, [exercises, searchQuery, filterType, difficultyFilter, progressMap]);

  // Pagination
  const totalPages = Math.ceil(filteredExercises.length / EXERCISES_PER_PAGE);
  const paginatedExercises = useMemo(() => {
    const startIndex = (currentPage - 1) * EXERCISES_PER_PAGE;
    const endIndex = startIndex + EXERCISES_PER_PAGE;
    return filteredExercises.slice(startIndex, endIndex);
  }, [filteredExercises, currentPage]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, difficultyFilter]);

  // Handle quick attempt
  const handleQuickAttempt = (exerciseId: number) => {
    // Navigate to exercise detail page
    window.location.href = `/exercises/${exerciseId}`;
  };

  // Loading state
  if (isLoading) {
    return <LoadingSpinner message="Đang tải danh sách bài tập..." />;
  }

  // Error state
  if (error) {
    return <QueryErrorBoundary error={error} onRetry={refetch} />;
  }

  return (
    <Stack gap={8} align="stretch">
      {/* Page Header */}
      <Box>
        <Heading size="xl" mb={2}>
          Danh Sách Bài Tập
        </Heading>
        <Text color="text.secondary">
          Khám phá và thực hành các bài tập lập trình
        </Text>
      </Box>

      {/* Filters and Search */}
      <VStack align="stretch" spacing={4}>
        <HStack spacing={4} wrap="wrap">
          {/* Search Input */}
          <InputGroup maxW="400px" flex={1}>
            <InputLeftElement>
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Tìm kiếm bài tập..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg={searchBg}
              borderColor={borderColor}
            />
          </InputGroup>

          {/* Filter Selects */}
          <HStack spacing={2}>
            <Icon as={FiFilter} color="gray.400" />
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              maxW="200px"
              bg={searchBg}
              borderColor={borderColor}
            >
              {Object.entries(FILTER_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            
            <Select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}
              maxW="150px"
              bg={searchBg}
              borderColor={borderColor}
            >
              {Object.entries(DIFFICULTY_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </HStack>

          {/* Refresh Button */}
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            variant="outline"
            onClick={() => refetch()}
            size="md"
          >
            Làm mới
          </Button>
        </HStack>

        {/* Results Summary */}
        <Flex align="center" wrap="wrap" gap={4}>
          <Text color="text.secondary" fontSize="sm">
            Hiển thị {paginatedExercises.length} trong tổng số {filteredExercises.length} bài tập
          </Text>
          
          <Spacer />
          
          {/* Status Summary */}
          {user && (
            <HStack spacing={3}>
              <Badge colorScheme="green" variant="subtle">
                Hoàn thành: {progressStats.completedExercises}
              </Badge>
              <Badge colorScheme="orange" variant="subtle">
                Đã thử: {progressStats.attemptedExercises}
              </Badge>
              <Badge colorScheme="gray" variant="subtle">
                Tổng: {progressStats.totalExercises}
              </Badge>
            </HStack>
          )}
        </Flex>
      </VStack>

      {/* Exercise Grid */}
      {paginatedExercises.length > 0 ? (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {paginatedExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onAttempt={handleQuickAttempt}
              showActions={true}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Box textAlign="center" py={16}>
          <Heading size="md" mb={4} color="text.secondary">
            Không tìm thấy bài tập nào
          </Heading>
          <Text color="text.muted" mb={6}>
            {searchQuery || filterType !== 'all'
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
              : 'Chưa có bài tập nào được tạo'}
          </Text>
          {(searchQuery || filterType !== 'all' || difficultyFilter !== 'all') && (
            <Button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setDifficultyFilter('all');
              }}
              variant="outline"
            >
              Xóa bộ lọc
            </Button>
          )}
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <HStack justify="center" spacing={2} pt={4}>
          <Button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            isDisabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            Trước
          </Button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              onClick={() => setCurrentPage(page)}
              variant={currentPage === page ?  'outline': 'solid'}
              colorScheme={currentPage === page ? 'blue' : 'gray'}
              size="sm"
              minW="40px"
            >
              {page}
            </Button>
          ))}
          
          <Button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            isDisabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            Sau
          </Button>
        </HStack>
      )}
    </Stack>
  );
};

export default ExerciseList;