import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  Stack,
  Card,
  CardBody,
  CardHeader,
  Button,
  HStack,
  VStack,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Icon,
  Code,
  useToast,
  Flex,
  Spacer,
  SimpleGrid,
  Progress,
} from "@chakra-ui/react";
import {
  FiCode,
  FiPlay,
  FiCheckCircle,
  FiArrowLeft,
  FiSave,
  FiTarget,
  FiRefreshCw,
} from "react-icons/fi";
import { useParams, Link } from "@tanstack/react-router";
import { useExercise } from "../../hooks/queries/useExerciseQueries";
import type { TestCase, ExerciseValidationResponse } from "../../types/api";
import {
  useUserScore,
  useCreateScore,
} from "../../hooks/queries/useScoreQueries";
import { useAuth } from "../../hooks/useAuth";
import { exerciseService } from "../../services/exercises";
import {
  hasCorrectAnswers,
  mapResults,
  getCorrectAnswersCount,
  getResultsCount,
} from "../../utils/scoreUtils";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import QueryErrorBoundary from "../../components/common/QueryErrorBoundary";
import CodeEditor from "../../components/common/CodeEditor";

const ExerciseDetail: React.FC = () => {
  // Router and navigation
  const { exerciseId } = useParams({ from: "/exercises/$exerciseId" });

  const toast = useToast();

  // State management
  const [userSolution, setUserSolution] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ExerciseValidationResponse | null>(null);

  // Data fetching
  const {
    data: exercise,
    isLoading,
    error,
    refetch,
  } = useExercise(Number(exerciseId));
  const { user } = useAuth();
  const { data: userScore } = useUserScore(Number(exerciseId));

  // Mutations
  const createScoreMutation = useCreateScore();

  // Generate template from exercise
  const generateTemplate = React.useCallback(() => {
    if (!exercise) return "";

    return `# ${exercise.title}

${exercise.body}

# Hướng dẫn:
# 1. Đọc kỹ mô tả bài tập ở trên
# 2. Xem các test cases để hiểu input/output mong đợi
# 3. Viết code của bạn bên dưới dòng này
# 4. Nhấn "Chạy và kiểm tra" để test code

# Viết code của bạn ở đây:

`;
  }, [exercise]);

  // Load exercise body as template when exercise is loaded
  React.useEffect(() => {
    if (exercise && !userSolution) {
      setUserSolution(generateTemplate());
    }
  }, [exercise, userSolution, generateTemplate]);

  // Handle reset template
  const handleResetTemplate = () => {
    setUserSolution(generateTemplate());
    setValidationResult(null);
    toast({
      title: "Đã reset template",
      description: "Template hướng dẫn đã được tải lại.",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

  // Theme colors
  const cardBg = useColorModeValue("white", "gray.800");
  const codeBg = useColorModeValue("gray.50", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // Handle solution validation and submission
  const handleSubmitSolution = async () => {
    if (!user) {
      toast({
        title: "Cần đăng nhập",
        description: "Bạn cần đăng nhập để nộp bài giải.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!userSolution.trim()) {
      toast({
        title: "Thiếu lời giải",
        description: "Vui lòng nhập lời giải của bạn.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First validate the code
      const validationResponse = await exerciseService.validateCode({
        answer: userSolution,
        exercise_id: Number(exerciseId),
      });

      setValidationResult(validationResponse);

      // Create score with detailed results
      await createScoreMutation.mutateAsync({
        exercise_id: Number(exerciseId),
        answer: userSolution,
        results: validationResponse.results,
        user_results: validationResponse.user_results,
      });

      toast({
        title: validationResponse.all_correct
          ? "Chính xác!"
          : "Chưa hoàn toàn đúng",
        description: validationResponse.all_correct
          ? "Chúc mừng! Bạn đã giải đúng tất cả test cases."
          : `Bạn đã đúng ${getCorrectAnswersCount(
              validationResponse.results
            )}/${getResultsCount(validationResponse.results)} test cases.`,
        status: validationResponse.all_correct ? "success" : "warning",
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Error submitting solution:", error);

      // Handle specific validation errors
      const errorMessage = error?.message || "Có lỗi xảy ra khi nộp bài giải. Vui lòng thử lại.";

      toast({
        title: "Lỗi kiểm tra code",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get difficulty info
  const getDifficultyInfo = () => {
    if (!exercise) return { label: "", color: "gray" };
    return {
      label: exerciseService.getDifficultyLabel(exercise.difficulty),
      color: exerciseService.getDifficultyColor(exercise.difficulty),
    };
  };

  // Get completion status
  const isCompleted = userScore?.all_correct === true;
  const isAttempted = userScore !== undefined;
  const hasPartialSuccess = userScore && hasCorrectAnswers(userScore);
  const difficultyInfo = getDifficultyInfo();

  // Loading state
  if (isLoading) {
    return <LoadingSpinner message="Đang tải chi tiết bài tập..." />;
  }

  // Error state
  if (error) {
    return <QueryErrorBoundary error={error} onRetry={refetch} />;
  }

  // Not found state
  if (!exercise) {
    return (
      <Box textAlign="center" py={16}>
        <Heading size="lg" mb={4}>
          Không tìm thấy bài tập
        </Heading>
        <Text color="text.muted" mb={6}>
          Bài tập với ID {exerciseId} không tồn tại.
        </Text>
        <Button as={Link} to="/exercises" leftIcon={<Icon as={FiArrowLeft} />}>
          Quay lại danh sách
        </Button>
      </Box>
    );
  }

  return (
    <Stack gap={8} align="stretch">
      {/* Navigation */}
      <HStack>
        <Button
          as={Link}
          to="/exercises"
          leftIcon={<Icon as={FiArrowLeft} />}
          variant="ghost"
          size="sm"
        >
          Danh sách bài tập
        </Button>
        <Spacer />
        {isCompleted && (
          <Badge colorScheme="green" variant="subtle" px={3} py={1}>
            <HStack spacing={1}>
              <Icon as={FiCheckCircle} boxSize={3} />
              <Text fontSize="sm">Đã hoàn thành</Text>
            </HStack>
          </Badge>
        )}
      </HStack>

      {/* Page Header */}
      <Box>
        <HStack spacing={3} mb={2}>
          <Icon as={FiCode} boxSize={6} color="blue.500" />
          <VStack align="flex-start" spacing={1}>
            <Heading size="xl">{exercise.title}</Heading>
            <HStack spacing={3}>
              <Text fontSize="sm" color="text.secondary">
                Bài #{exercise.id}
              </Text>
              <Badge colorScheme={difficultyInfo.color} variant="outline">
                <HStack spacing={1}>
                  <Icon as={FiTarget} boxSize={3} />
                  <Text fontSize="xs">{difficultyInfo.label}</Text>
                </HStack>
              </Badge>
            </HStack>
          </VStack>
        </HStack>
        <Text color="text.secondary">
          Chi tiết và thực hành bài tập lập trình
        </Text>
      </Box>

      {/* Exercise Description */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardHeader>
          <Heading size="md">Mô tả bài tập</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <Text lineHeight="1.8" fontSize="md">
            {exercise.body}
          </Text>
        </CardBody>
      </Card>

      {/* Test Cases */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardHeader>
          <Heading size="md">Test Cases ({exercise.test_cases.length})</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {exercise.test_cases.map((testCase, index) => {
              // Handle both string and object formats
              const isObject =
                typeof testCase === "object" && testCase !== null;
              const input = isObject ? (testCase as TestCase).input : testCase;
              const expectedOutput = isObject
                ? (testCase as TestCase).expected
                : exercise.solutions[index];

              return (
                <Box key={index}>
                  <Text fontSize="sm" color="text.secondary" mb={2}>
                    Test case {index + 1}:
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    <Box
                      bg={codeBg}
                      p={3}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <Text fontSize="xs" color="text.secondary" mb={1}>
                        Đầu vào:
                      </Text>
                      <Code fontSize="sm" colorScheme="blue">
                        {String(input)}
                      </Code>
                    </Box>
                    <Box
                      bg={codeBg}
                      p={3}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={borderColor}
                    >
                      <Text fontSize="xs" color="text.secondary" mb={1}>
                        Kết quả mong đợi:
                      </Text>
                      <Code fontSize="sm" colorScheme="green">
                        {String(expectedOutput)}
                      </Code>
                    </Box>
                  </VStack>
                </Box>
              );
            })}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Solution Area */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardHeader>
          <Flex align="center">
            <Heading size="md">Lời giải của bạn</Heading>
            <Spacer />
            {!user && (
              <Text fontSize="sm" color="orange.500">
                Cần đăng nhập để nộp bài
              </Text>
            )}
          </Flex>
        </CardHeader>
        <CardBody pt={0}>
          <VStack align="stretch" spacing={4}>
            <CodeEditor
              value={userSolution}
              onChange={setUserSolution}
              language="python"
              height="400px"
              placeholder={
                !user ? "# Cần đăng nhập để viết code..." : exercise.body
              }
              readOnly={!user}
              fontSize={14}
              minimap={false}
              lineNumbers="on"
              wordWrap="on"
            />

            <HStack justify="space-between" wrap="wrap" gap={2}>
              <HStack>
                <Button
                  leftIcon={<Icon as={FiPlay} />}
                  colorScheme="blue"
                  variant="solid"
                  onClick={handleSubmitSolution}
                  isLoading={isSubmitting}
                  loadingText="Đang kiểm tra..."
                  isDisabled={!user || !userSolution.trim()}
                  color="white"
                  _hover={{
                    bg: "blue.600",
                    color: "white",
                  }}
                  _dark={{
                    color: "white",
                    _hover: {
                      bg: "blue.600",
                      color: "white",
                    },
                  }}
                >
                  Chạy và kiểm tra
                </Button>

                <Button
                  leftIcon={<Icon as={FiSave} />}
                  variant="outline"
                  onClick={() => {
                    // Save draft functionality could be added here
                    toast({
                      title: "Đã lưu nháp",
                      description: "Lời giải đã được lưu tạm thời.",
                      status: "info",
                      duration: 2000,
                      isClosable: true,
                    });
                  }}
                  isDisabled={!user}
                >
                  Lưu nháp
                </Button>
              </HStack>

              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                variant="ghost"
                size="sm"
                onClick={handleResetTemplate}
                isDisabled={!user}
                colorScheme="gray"
              >
                Reset template
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">Kết quả kiểm tra</Heading>
              <Badge
                colorScheme={validationResult.all_correct ? "green" : "orange"}
                variant="subtle"
                px={3}
                py={1}
              >
                {getCorrectAnswersCount(validationResult.results)}/
                {getResultsCount(validationResult.results)} đúng
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <VStack align="stretch" spacing={4}>
              <Progress
                value={
                  (getCorrectAnswersCount(validationResult.results) /
                    getResultsCount(validationResult.results)) *
                  100
                }
                colorScheme={validationResult.all_correct ? "green" : "orange"}
                size="lg"
                borderRadius="md"
              />

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {mapResults(
                  validationResult.results,
                  (isCorrect: boolean, index: number) => (
                    <Box
                      key={index}
                      p={3}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={isCorrect ? "green.200" : "red.200"}
                      bg={isCorrect ? "black.50" : "black.50"}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="medium">
                          Test case {index + 1}
                        </Text>
                        <Badge
                          colorScheme={isCorrect ? "green" : "red"}
                          variant="subtle"
                        >
                          {isCorrect ? "Đúng" : "Sai"}
                        </Badge>
                      </HStack>
                      <VStack align="stretch" spacing={2}>
                        <Box>
                          <Text fontSize="xs" color="text.secondary">
                            Kết quả của bạn:
                          </Text>
                          <Code fontSize="sm">
                            {String(validationResult.user_results[index])}
                          </Code>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="color: 'text.inverse">
                            Kết quả mong đợi:
                          </Text>
                          <Code fontSize="sm" colorScheme="green">
                            {String(exercise!.solutions[index])}
                          </Code>
                        </Box>
                      </VStack>
                    </Box>
                  )
                )}
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Status Alert */}
      {isAttempted && !validationResult && (
        <Alert
          status={
            isCompleted ? "success" : hasPartialSuccess ? "warning" : "info"
          }
          borderRadius="md"
        >
          <AlertIcon />
          <Box>
            <AlertTitle>
              {isCompleted
                ? "Hoàn thành!"
                : hasPartialSuccess
                ? "Một phần đúng"
                : "Đã thử"}
            </AlertTitle>
            <AlertDescription>
              {isCompleted
                ? "Bạn đã giải đúng tất cả test cases. Chúc mừng!"
                : hasPartialSuccess
                ? `Bạn đã đúng ${getCorrectAnswersCount(
                    userScore!.results
                  )}/${getResultsCount(userScore!.results)} test cases.`
                : "Bạn đã thử bài tập này nhưng chưa đúng hoàn toàn."}
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Help Section */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardHeader>
          <Heading size="md">Gợi ý</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <VStack align="stretch" spacing={3}>
            <Text fontSize="sm" color="text.secondary">
              • Đọc kỹ mô tả bài tập và hiểu rõ yêu cầu
            </Text>
            <Text fontSize="sm" color="text.secondary">
              • Phân tích ví dụ test để hiểu input và output mong đợi
            </Text>
            <Text fontSize="sm" color="text.secondary">
              • Viết code theo cấu trúc function hoặc arrow function
            </Text>
            <Text fontSize="sm" color="text.secondary">
              • Kiểm tra kỹ logic trước khi nộp bài
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Stack>
  );
};

export default ExerciseDetail;
