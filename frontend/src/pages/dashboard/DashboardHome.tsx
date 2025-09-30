import React from "react";
import {
  Box,
  Heading,
  Text,
  Grid,
  GridItem,
  Stack,
  Card,
  CardBody,
  Progress,
  HStack,
  VStack,
  Badge,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiTrendingUp, FiTarget, FiAward, FiActivity } from "react-icons/fi";
import { useAuth } from "../../hooks/useAuth";
import { useUserStats } from "../../hooks/queries/useUserQueries";
import { useExercises } from "../../hooks/queries/useExerciseQueries";
import {
  useUserProgress,
  useUserStatistics,
} from "../../hooks/queries/useScoreQueries";
import {
  getCorrectAnswersCount,
  getResultsCount,
  hasCorrectAnswers,
} from "../../utils/scoreUtils";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import QueryErrorBoundary from "../../components/common/QueryErrorBoundary";

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const {
    stats: userStats,
    isLoading: userStatsLoading,
    error: userStatsError,
  } = useUserStats();
  const {
    data: exercises,
    isLoading: exercisesLoading,
    error: exercisesError,
  } = useExercises();
  const { isLoading: progressLoading, error: progressError } =
    useUserProgress();
  const {
    statistics,
    isLoading: statisticsLoading,
    error: statisticsError,
  } = useUserStatistics();

  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  if (
    userStatsLoading ||
    exercisesLoading ||
    progressLoading ||
    statisticsLoading
  ) {
    return <LoadingSpinner message="Đang tải dashboard..." />;
  }

  if (userStatsError) {
    return <QueryErrorBoundary error={userStatsError} />;
  }

  if (exercisesError) {
    return <QueryErrorBoundary error={exercisesError} />;
  }

  if (progressError) {
    return <QueryErrorBoundary error={progressError} />;
  }

  if (statisticsError) {
    return <QueryErrorBoundary error={statisticsError} />;
  }

  return (
    <Stack gap={8}>
      {/* Page Header */}
      <Box>
        <Heading size="xl" mb={2}>
          Chào mừng trở lại{user ? `, ${user.username}` : ""}!
        </Heading>
        <Text color="gray.600" _dark={{ color: "gray.400" }}>
          Tổng quan về tiến độ học tập và hoạt động của bạn trên CodeLand.io
        </Text>
      </Box>

      {/* Personal Stats Cards */}
      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(4, 1fr)",
        }}
        gap={6}
      >
        <GridItem>
          <Card
            bg={cardBg}
            borderColor={borderColor}
            _hover={{ transform: "translateY(-2px)", shadow: "md" }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack justify="space-between" mb={2}>
                <VStack align="start" spacing={1}>
                  <Text
                    fontSize="sm"
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                  >
                    Tổng Lượt Thử
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                    {statistics?.totalAttempts || 0}
                  </Text>
                </VStack>
                <Icon as={FiActivity} boxSize={6} color="blue.500" />
              </HStack>
              <Text fontSize="sm" color="green.500">
                {statistics?.correctAnswers || 0} câu trả lời đúng
              </Text>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card
            bg={cardBg}
            borderColor={borderColor}
            _hover={{ transform: "translateY(-2px)", shadow: "md" }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack justify="space-between" mb={2}>
                <VStack align="start" spacing={1}>
                  <Text
                    fontSize="sm"
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                  >
                    Tỷ Lệ Thành Công
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">
                    {statistics?.successRate || 0}%
                  </Text>
                </VStack>
                <Icon as={FiTarget} boxSize={6} color="green.500" />
              </HStack>
              <Progress
                value={statistics?.successRate || 0}
                colorScheme="green"
                size="sm"
                borderRadius="full"
              />
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card
            bg={cardBg}
            borderColor={borderColor}
            _hover={{ transform: "translateY(-2px)", shadow: "md" }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack justify="space-between" mb={2}>
                <VStack align="start" spacing={1}>
                  <Text
                    fontSize="sm"
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                  >
                    Chuỗi Thành Công
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                    {statistics?.currentStreak || 0}
                  </Text>
                </VStack>
                <Icon as={FiTrendingUp} boxSize={6} color="purple.500" />
              </HStack>
              <Text fontSize="sm" color="purple.500">
                Tối đa: {statistics?.maxStreak || 0} lần
              </Text>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card
            bg={cardBg}
            borderColor={borderColor}
            _hover={{ transform: "translateY(-2px)", shadow: "md" }}
            transition="all 0.2s"
          >
            <CardBody>
              <HStack justify="space-between" mb={2}>
                <VStack align="start" spacing={1}>
                  <Text
                    fontSize="sm"
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                  >
                    Độ Chính Xác Test
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                    {statistics?.testCaseAccuracy || 0}%
                  </Text>
                </VStack>
                <Icon as={FiAward} boxSize={6} color="orange.500" />
              </HStack>
              <Progress
                value={statistics?.testCaseAccuracy || 0}
                colorScheme="orange"
                size="sm"
                borderRadius="full"
              />
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Detailed Progress Section */}
      <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap={6}>
        {/* Progress Breakdown */}
        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Heading size="md" mb={4}>
                Phân Tích Kết Quả
              </Heading>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack>
                    <Box w={3} h={3} bg="green.500" borderRadius="full" />
                    <Text>Hoàn toàn đúng</Text>
                  </HStack>
                  <Badge colorScheme="green" variant="subtle">
                    {statistics?.correctAnswers || 0}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack>
                    <Box w={3} h={3} bg="yellow.500" borderRadius="full" />
                    <Text>Một phần đúng</Text>
                  </HStack>
                  <Badge colorScheme="yellow" variant="subtle">
                    {statistics?.partialAnswers || 0}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack>
                    <Box w={3} h={3} bg="red.500" borderRadius="full" />
                    <Text>Chưa đúng</Text>
                  </HStack>
                  <Badge colorScheme="red" variant="subtle">
                    {statistics?.incorrectAnswers || 0}
                  </Badge>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        {/* Recent Activity */}
        <GridItem>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <Heading size="md" mb={4}>
                Hoạt Động Gần Đây
              </Heading>
              <VStack spacing={3} align="stretch">
                {statistics?.recentActivity &&
                statistics.recentActivity.length > 0 ? (
                  statistics.recentActivity.slice(0, 5).map((score, index) => (
                    <HStack
                      key={score.id || index}
                      justify="space-between"
                      p={2}
                      borderRadius="md"
                      bg="gray.50"
                      _dark={{ bg: "gray.700" }}
                    >
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="medium">
                          Bài tập #{score.exercise_id}
                        </Text>
                        <Text
                          fontSize="xs"
                          color="gray.600"
                          _dark={{ color: "gray.400" }}
                        >
                          {`${getCorrectAnswersCount(
                            score.results
                          )}/${getResultsCount(score.results)} test cases`}
                        </Text>
                      </VStack>
                      <Badge
                        colorScheme={
                          score.all_correct
                            ? "green"
                            : getCorrectAnswersCount(score.results) > 0
                            ? "yellow"
                            : "red"
                        }
                        variant="subtle"
                      >
                        {score.all_correct
                          ? "Hoàn thành"
                          : hasCorrectAnswers(score)
                          ? "Một phần"
                          : "Chưa đúng"}
                      </Badge>
                    </HStack>
                  ))
                ) : (
                  <Text
                    color="gray.600"
                    _dark={{ color: "gray.400" }}
                    textAlign="center"
                    py={4}
                  >
                    Chưa có hoạt động nào. Hãy bắt đầu làm bài tập!
                  </Text>
                )}
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Platform Overview (for admin users) */}
      {user?.admin && (
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Heading size="md" mb={4}>
              Tổng Quan Hệ Thống (Quản trị viên)
            </Heading>
            <Grid
              templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
              gap={6}
            >
              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {userStats?.totalUsers || 0}
                </Text>
                <Text
                  fontSize="sm"
                  color="gray.600"
                  _dark={{ color: "gray.400" }}
                >
                  Tổng người dùng
                </Text>
                <Text fontSize="xs" color="green.500">
                  {userStats?.activeUsers || 0} đang hoạt động
                </Text>
              </VStack>

              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {exercises?.length || 0}
                </Text>
                <Text
                  fontSize="sm"
                  color="gray.600"
                  _dark={{ color: "gray.400" }}
                >
                  Bài tập có sẵn
                </Text>
                <Text fontSize="xs" color="green.500">
                  Sẵn sàng thực hiện
                </Text>
              </VStack>

              <VStack>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {userStats?.activeRate?.toFixed(1) || 0}%
                </Text>
                <Text
                  fontSize="sm"
                  color="gray.600"
                  _dark={{ color: "gray.400" }}
                >
                  Tỷ lệ người dùng hoạt động
                </Text>
                <Text fontSize="xs" color="purple.500">
                  Trên tổng số người dùng
                </Text>
              </VStack>
            </Grid>
          </CardBody>
        </Card>
      )}
    </Stack>
  );
};

export default DashboardHome;
