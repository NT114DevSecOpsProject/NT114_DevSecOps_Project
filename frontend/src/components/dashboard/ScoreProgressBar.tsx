import React from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Progress,
  Stack,
  Flex,
  Badge,
  useColorModeValue,
  CircularProgress,
  CircularProgressLabel,
  Grid,
  GridItem,
} from '@chakra-ui/react';

interface ProgressData {
  totalAttempts: number;
  correctAnswers: number;
  partialAnswers: number;
  incorrectAnswers: number;
  successRate: number;
  testCaseAccuracy: number;
  currentStreak: number;
  maxStreak: number;
}

interface ScoreProgressBarProps {
  progress: ProgressData;
  title?: string;
  showCircular?: boolean;
}

const ScoreProgressBar: React.FC<ScoreProgressBarProps> = ({ 
  progress, 
  title = "Tiến độ học tập",
  showCircular = true 
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Tính toán các tỷ lệ phần trăm
  const correctPercentage = progress.totalAttempts > 0 
    ? (progress.correctAnswers / progress.totalAttempts) * 100 
    : 0;
  
  const partialPercentage = progress.totalAttempts > 0 
    ? (progress.partialAnswers / progress.totalAttempts) * 100 
    : 0;
  
  const incorrectPercentage = progress.totalAttempts > 0 
    ? (progress.incorrectAnswers / progress.totalAttempts) * 100 
    : 0;

  // Xác định màu sắc dựa trên performance
  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return 'green';
    if (rate >= 60) return 'yellow';
    if (rate >= 40) return 'orange';
    return 'red';
  };

  const performanceColor = getPerformanceColor(progress.successRate);
  const testCaseColor = getPerformanceColor(progress.testCaseAccuracy);

  return (
    <Card bg={cardBg} borderColor={borderColor}>
      <CardBody>
        <Heading size="md" mb={6}>{title}</Heading>
        
        <Grid templateColumns={{ base: "1fr", lg: showCircular ? "2fr 1fr" : "1fr" }} gap={6}>
          {/* Progress Bars */}
          <GridItem>
            <Stack gap={6}>
              {/* Overall Success Rate */}
              <Box>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontWeight="medium">Tỷ lệ thành công tổng thể</Text>
                  <Badge colorScheme={performanceColor} variant="subtle">
                    {Math.round(progress.successRate)}%
                  </Badge>
                </Flex>
                <Progress 
                  value={progress.successRate} 
                  colorScheme={performanceColor}
                  size="lg"
                  borderRadius="md"
                />
                <Text fontSize="sm" color="text.secondary" mt={1}>
                  {progress.correctAnswers} / {progress.totalAttempts} bài hoàn thành đúng
                </Text>
              </Box>

              {/* Test Case Accuracy */}
              <Box>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text fontWeight="medium">Độ chính xác test cases</Text>
                  <Badge colorScheme={testCaseColor} variant="subtle">
                    {Math.round(progress.testCaseAccuracy)}%
                  </Badge>
                </Flex>
                <Progress 
                  value={progress.testCaseAccuracy} 
                  colorScheme={testCaseColor}
                  size="lg"
                  borderRadius="md"
                />
                <Text fontSize="sm" color="text.secondary" mt={1}>
                  Tỷ lệ test cases được thực hiện đúng
                </Text>
              </Box>

              {/* Detailed Breakdown */}
              <Stack gap={4}>
                <Text fontWeight="medium">Phân tích chi tiết</Text>
                
                {/* Correct Answers */}
                <Box>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="sm">Câu trả lời đúng hoàn toàn</Text>
                    <Text fontSize="sm" fontWeight="bold" color="green.500">
                      {progress.correctAnswers} ({Math.round(correctPercentage)}%)
                    </Text>
                  </Flex>
                  <Progress 
                    value={correctPercentage} 
                    colorScheme="green" 
                    size="sm"
                    borderRadius="sm"
                  />
                </Box>

                {/* Partial Answers */}
                <Box>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="sm">Câu trả lời một phần đúng</Text>
                    <Text fontSize="sm" fontWeight="bold" color="yellow.500">
                      {progress.partialAnswers} ({Math.round(partialPercentage)}%)
                    </Text>
                  </Flex>
                  <Progress 
                    value={partialPercentage} 
                    colorScheme="yellow" 
                    size="sm"
                    borderRadius="sm"
                  />
                </Box>

                {/* Incorrect Answers */}
                <Box>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="sm">Câu trả lời sai</Text>
                    <Text fontSize="sm" fontWeight="bold" color="red.500">
                      {progress.incorrectAnswers} ({Math.round(incorrectPercentage)}%)
                    </Text>
                  </Flex>
                  <Progress 
                    value={incorrectPercentage} 
                    colorScheme="red" 
                    size="sm"
                    borderRadius="sm"
                  />
                </Box>
              </Stack>
            </Stack>
          </GridItem>

          {/* Circular Progress & Stats */}
          {showCircular && (
            <GridItem>
              <Stack gap={6} align="center">
                {/* Main Circular Progress */}
                <Box textAlign="center">
                  <CircularProgress 
                    value={progress.successRate} 
                    size="120px" 
                    color={`${performanceColor}.400`}
                    trackColor={useColorModeValue('gray.100', 'gray.700')}
                    thickness="8px"
                  >
                    <CircularProgressLabel fontSize="lg" fontWeight="bold">
                      {Math.round(progress.successRate)}%
                    </CircularProgressLabel>
                  </CircularProgress>
                  <Text fontSize="sm" color="text.secondary" mt={2}>
                    Tỷ lệ thành công
                  </Text>
                </Box>

                {/* Streak Information */}
                <Stack gap={3} align="center" w="full">
                  <Box textAlign="center" p={3} borderRadius="md" bg={useColorModeValue('blue.50', 'blue.900')}>
                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                      {progress.currentStreak}
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      Chuỗi hiện tại
                    </Text>
                  </Box>

                  <Box textAlign="center" p={3} borderRadius="md" bg={useColorModeValue('purple.50', 'purple.900')}>
                    <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                      {progress.maxStreak}
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      Kỷ lục cá nhân
                    </Text>
                  </Box>
                </Stack>

                {/* Performance Badge */}
                <Box textAlign="center">
                  <Badge 
                    colorScheme={performanceColor} 
                    size="lg" 
                    px={3} 
                    py={1}
                    borderRadius="full"
                  >
                    {progress.successRate >= 80 ? 'Xuất sắc' :
                     progress.successRate >= 60 ? 'Tốt' :
                     progress.successRate >= 40 ? 'Khá' : 'Cần cải thiện'}
                  </Badge>
                </Box>
              </Stack>
            </GridItem>
          )}
        </Grid>

        {/* Summary Stats */}
        <Box mt={6} pt={4} borderTop="1px solid" borderColor={borderColor}>
          <Grid templateColumns="repeat(4, 1fr)" gap={4} textAlign="center">
            <Box>
              <Text fontSize="lg" fontWeight="bold" color="blue.500">
                {progress.totalAttempts}
              </Text>
              <Text fontSize="xs" color="text.secondary">
                Tổng lần thử
              </Text>
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold" color="green.500">
                {progress.correctAnswers}
              </Text>
              <Text fontSize="xs" color="text.secondary">
                Hoàn thành
              </Text>
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold" color="yellow.500">
                {progress.partialAnswers}
              </Text>
              <Text fontSize="xs" color="text.secondary">
                Một phần
              </Text>
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold" color="purple.500">
                {Math.round(progress.testCaseAccuracy)}%
              </Text>
              <Text fontSize="xs" color="text.secondary">
                Test cases
              </Text>
            </Box>
          </Grid>
        </Box>
      </CardBody>
    </Card>
  );
};

export default ScoreProgressBar;