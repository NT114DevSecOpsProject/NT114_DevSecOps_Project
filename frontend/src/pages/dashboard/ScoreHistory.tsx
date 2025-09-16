import React from 'react';
import {
  Box,
  Heading,
  Text,
  Stack,
  Card,
  CardBody,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Icon,
  useColorModeValue,
  SimpleGrid,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import { 
  useUserScores, 
  useUserStatistics,
} from '../../hooks/queries/useScoreQueries';
import { useExercises } from '../../hooks/queries/useExerciseQueries';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import QueryErrorBoundary from '../../components/common/QueryErrorBoundary';
import ProgressSummary from '../../components/dashboard/ProgressSummary';
import ScoreProgressBar from '../../components/dashboard/ScoreProgressBar';
import { FiTrendingUp, FiTarget, FiAward, FiActivity } from 'react-icons/fi';

const ScoreHistory: React.FC = () => {
  const { data: scores, isLoading, error, refetch } = useUserScores();
  const { statistics, isLoading: statsLoading } = useUserStatistics();
  const { data: exercises } = useExercises();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  if (isLoading || statsLoading) {
    return <LoadingSpinner message="Đang tải lịch sử điểm số..." />;
  }

  if (error) {
    return <QueryErrorBoundary error={error} onRetry={refetch} />;
  }

  // Helper function để lấy tên exercise
  const getExerciseTitle = (exerciseId: number) => {
    const exercise = exercises?.find(ex => ex.id === exerciseId);
    return exercise?.title || `Bài tập #${exerciseId}`;
  };

  // Helper function để format difficulty
  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 0: return { label: 'Dễ', color: 'green' };
      case 1: return { label: 'Trung bình', color: 'yellow' };
      case 2: return { label: 'Khó', color: 'red' };
      default: return { label: 'Không xác định', color: 'gray' };
    }
  };

  // Helper function để tính accuracy của một score
  const getScoreAccuracy = (score: any) => {
    if (!score.results || score.results.length === 0) return 0;
    const correct = score.results.filter((r: boolean) => r === true).length;
    return Math.round((correct / score.results.length) * 100);
  };

  return (
    <Stack gap={8} align="stretch">
      {/* Page Header */}
      <Box>
        <Heading size="xl" mb={2}>
          Lịch Sử Điểm Số
        </Heading>
        <Text color="text.secondary">
          Theo dõi tiến độ học tập và thành tích của bạn
        </Text>
      </Box>

      {/* Statistics Overview */}
      {statistics && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>
                  <Flex align="center" gap={2}>
                    <Icon as={FiActivity} />
                    Tổng số lần thử
                  </Flex>
                </StatLabel>
                <StatNumber>{statistics.totalAttempts}</StatNumber>
                <StatHelpText>
                  {statistics.correctAnswers} câu đúng hoàn toàn
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>
                  <Flex align="center" gap={2}>
                    <Icon as={FiTarget} />
                    Tỷ lệ thành công
                  </Flex>
                </StatLabel>
                <StatNumber>{statistics.successRate}%</StatNumber>
                <StatHelpText>
                  <StatArrow type={statistics.successRate >= 70 ? 'increase' : 'decrease'} />
                  Độ chính xác test cases: {statistics.testCaseAccuracy}%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>
                  <Flex align="center" gap={2}>
                    <Icon as={FiTrendingUp} />
                    Chuỗi thành công
                  </Flex>
                </StatLabel>
                <StatNumber>{statistics.currentStreak}</StatNumber>
                <StatHelpText>
                  Kỷ lục: {statistics.maxStreak} câu liên tiếp
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>
                  <Flex align="center" gap={2}>
                    <Icon as={FiAward} />
                    Thành tích
                  </Flex>
                </StatLabel>
                <StatNumber>
                  <CircularProgress 
                    value={statistics.successRate} 
                    size="60px" 
                    color={statistics.successRate >= 70 ? 'green.400' : 'orange.400'}
                  >
                    <CircularProgressLabel fontSize="sm">
                      {Math.round(statistics.successRate)}%
                    </CircularProgressLabel>
                  </CircularProgress>
                </StatNumber>
                <StatHelpText>
                  Tổng thể
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Progress Summary */}
      <ProgressSummary 
        title="Tổng Quan Tiến Độ 7 Ngày"
        days={7}
      />

      {/* Progress Bar Visualization */}
      {statistics && (
        <ScoreProgressBar 
          progress={{
            totalAttempts: statistics.totalAttempts,
            correctAnswers: statistics.correctAnswers,
            partialAnswers: statistics.partialAnswers,
            incorrectAnswers: statistics.incorrectAnswers,
            successRate: statistics.successRate,
            testCaseAccuracy: statistics.testCaseAccuracy,
            currentStreak: statistics.currentStreak,
            maxStreak: statistics.maxStreak,
          }}
          title="Phân tích tiến độ chi tiết"
          showCircular={true}
        />
      )}

      {/* Score History Table */}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardBody>
          <Heading size="md" mb={4}>Lịch sử chi tiết</Heading>
          {scores && scores.length > 0 ? (
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Bài tập</Th>
                    <Th>Kết quả</Th>
                    <Th>Độ chính xác</Th>
                    <Th>Test cases</Th>
                    <Th>Trạng thái</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {scores.slice(0, 20).map((score) => { // Hiển thị 20 kết quả gần nhất
                    const exercise = exercises?.find(ex => ex.id === score.exercise_id);
                    const accuracy = getScoreAccuracy(score);
                    const difficulty = getDifficultyLabel(exercise?.difficulty || 0);
                    
                    return (
                      <Tr key={score.id}>
                        <Td>
                          <Box>
                            <Text fontWeight="medium">
                              {getExerciseTitle(score.exercise_id)}
                            </Text>
                            <Badge colorScheme={difficulty.color} size="sm">
                              {difficulty.label}
                            </Badge>
                          </Box>
                        </Td>
                        <Td>
                          <Badge 
                            colorScheme={score.all_correct ? 'green' : accuracy > 0 ? 'yellow' : 'red'}
                            variant="subtle"
                          >
                            {score.all_correct ? 'Hoàn thành' : accuracy > 0 ? 'Một phần' : 'Chưa đúng'}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontWeight="bold" color={accuracy >= 70 ? 'green.500' : accuracy > 0 ? 'yellow.500' : 'red.500'}>
                            {accuracy}%
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {score.results ? score.results.filter(r => r === true).length : 0}/{score.results ? score.results.length : 0}
                          </Text>
                        </Td>
                        <Td>
                          <Flex gap={1}>
                            {score.results && score.results.map((result, index) => (
                              <Box
                                key={index}
                                w="8px"
                                h="8px"
                                borderRadius="full"
                                bg={result ? 'green.400' : 'red.400'}
                              />
                            ))}
                          </Flex>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          ) : (
            <Box textAlign="center" py={8}>
              <Text color="text.secondary">
                Chưa có lịch sử điểm số nào. Hãy bắt đầu làm bài tập!
              </Text>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Recent Activity */}
      {statistics?.recentActivity && statistics.recentActivity.length > 0 && (
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Heading size="md" mb={4}>Hoạt động gần đây</Heading>
            <Stack gap={3}>
              {statistics.recentActivity.slice(0, 5).map((score) => {
                const accuracy = getScoreAccuracy(score);
                
                return (
                  <Box key={score.id} p={3} borderRadius="md" bg={useColorModeValue('gray.50', 'gray.700')}>
                    <Flex justify="space-between" align="center">
                      <Box>
                        <Text fontWeight="medium">
                          {getExerciseTitle(score.exercise_id)}
                        </Text>
                        <Text fontSize="sm" color="text.secondary">
                          {score.results ? score.results.filter(r => r === true).length : 0}/{score.results ? score.results.length : 0} test cases đúng
                        </Text>
                      </Box>
                      <Box textAlign="right">
                        <Badge 
                          colorScheme={score.all_correct ? 'green' : accuracy > 0 ? 'yellow' : 'red'}
                          mb={1}
                        >
                          {accuracy}%
                        </Badge>
                        <Text fontSize="xs" color="text.secondary">
                          Vừa xong
                        </Text>
                      </Box>
                    </Flex>
                  </Box>
                );
              })}
            </Stack>
          </CardBody>
        </Card>
      )}
    </Stack>
  );
};

export default ScoreHistory;