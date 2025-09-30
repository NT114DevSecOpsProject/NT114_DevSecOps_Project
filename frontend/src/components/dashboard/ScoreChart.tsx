import React from "react";
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Grid,
  GridItem,
  Flex,
  useColorModeValue,
  Badge,
  Stack,
} from "@chakra-ui/react";
import type { Score } from "../../types/api";
import { mapResults, hasCorrectAnswers } from "../../utils/scoreUtils";

interface ScoreChartProps {
  scores: Score[];
  title?: string;
  showDetails?: boolean;
}

interface DayData {
  date: string;
  attempts: number;
  correct: number;
  accuracy: number;
  scores: Score[];
}

const ScoreChart: React.FC<ScoreChartProps> = ({
  scores,
  title = "Biểu đồ tiến độ",
  showDetails = true,
}) => {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const barBg = useColorModeValue("blue.100", "blue.900");
  const barColor = useColorModeValue("blue.500", "blue.400");

  // Tạo dữ liệu cho 7 ngày gần nhất
  const chartData = React.useMemo(() => {
    const days: DayData[] = [];
    const now = new Date();

    // Tạo 7 ngày gần nhất
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push({
        date: date.toISOString().split("T")[0],
        attempts: 0,
        correct: 0,
        accuracy: 0,
        scores: [],
      });
    }

    // Vì API không có timestamp, chúng ta sẽ hiển thị thông báo thay vì data giả lập
    // Tất cả scores sẽ được gán vào ngày hôm nay
    if (scores.length > 0) {
      const todayIndex = days.length - 1; // Ngày cuối cùng (hôm nay)
      days[todayIndex].attempts = scores.length;
      days[todayIndex].scores = scores;
      days[todayIndex].correct = scores.filter((score) => {
        // Use calculated all_correct based on results
        return hasCorrectAnswers(score);
      }).length;
      days[todayIndex].accuracy =
        days[todayIndex].attempts > 0
          ? (days[todayIndex].correct / days[todayIndex].attempts) * 100
          : 0;
    }

    return days;
  }, [scores]);

  // Tìm giá trị max để scale chart
  const maxAttempts = Math.max(...chartData.map((d) => d.attempts), 1);

  return (
    <Card bg={cardBg} borderColor={borderColor}>
      <CardBody>
        <Heading size="md" mb={2}>
          {title}
        </Heading>

        {/* Data limitation notice */}
        <Box
          mb={4}
          p={3}
          bg="orange.50"
          borderRadius="md"
          border="1px solid"
          borderColor="orange.200"
          _dark={{ bg: "orange.900", borderColor: "orange.700" }}
        >
          <Text
            fontSize="sm"
            color="orange.700"
            _dark={{ color: "orange.300" }}
          >
            ⚠️ <strong>Lưu ý:</strong> API hiện tại không cung cấp timestamp cho
            scores. Tất cả dữ liệu được hiển thị trong ngày hôm nay. Để có biểu
            đồ tiến độ chính xác theo thời gian, cần thêm field{" "}
            <code>created_at</code> vào Score model.
          </Text>
        </Box>

        {/* Chart */}
        <Grid templateColumns="repeat(7, 1fr)" gap={2} mb={6}>
          {chartData.map((day, index) => {
            const height =
              day.attempts > 0
                ? Math.max(20, (day.attempts / maxAttempts) * 80)
                : 10;
            const accuracyColor =
              day.accuracy >= 80
                ? "green"
                : day.accuracy >= 50
                ? "yellow"
                : "red";

            return (
              <GridItem key={index}>
                <Box textAlign="center">
                  {/* Ngày */}
                  <Text fontSize="xs" mb={2} fontWeight="medium">
                    {new Date(day.date).toLocaleDateString("vi-VN", {
                      weekday: "short",
                      day: "numeric",
                    })}
                  </Text>

                  {/* Bar chart */}
                  <Box
                    h="100px"
                    bg={barBg}
                    borderRadius="md"
                    display="flex"
                    alignItems="end"
                    justifyContent="center"
                    position="relative"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    {day.attempts > 0 && (
                      <Box
                        bg={barColor}
                        h={`${height}px`}
                        w="60%"
                        borderRadius="sm"
                        mb={1}
                        position="relative"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Text fontSize="xs" color="white" fontWeight="bold">
                          {day.attempts}
                        </Text>
                      </Box>
                    )}

                    {day.attempts === 0 && (
                      <Text
                        fontSize="xs"
                        color="gray.400"
                        position="absolute"
                        bottom="2"
                      >
                        0
                      </Text>
                    )}
                  </Box>

                  {/* Accuracy badge */}
                  {day.attempts > 0 && (
                    <Badge
                      colorScheme={accuracyColor}
                      size="sm"
                      mt={2}
                      variant="subtle"
                    >
                      {Math.round(day.accuracy)}%
                    </Badge>
                  )}
                </Box>
              </GridItem>
            );
          })}
        </Grid>

        {/* Legend */}
        <Flex justify="center" gap={6} mb={4}>
          <Flex align="center" gap={2}>
            <Box w="12px" h="12px" bg={barColor} borderRadius="sm" />
            <Text fontSize="sm">Số lần thử</Text>
          </Flex>
          <Flex align="center" gap={2}>
            <Badge colorScheme="green" size="sm">
              %
            </Badge>
            <Text fontSize="sm">Độ chính xác</Text>
          </Flex>
        </Flex>

        {/* Summary stats */}
        {showDetails && (
          <Stack gap={3}>
            <Box>
              <Text fontSize="sm" color="text.secondary" mb={1}>
                Tổng quan 7 ngày
              </Text>
              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="blue.500">
                    {chartData.reduce((sum, day) => sum + day.attempts, 0)}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    Lần thử
                  </Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="green.500">
                    {chartData.reduce((sum, day) => sum + day.correct, 0)}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    Đúng
                  </Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="purple.500">
                    {Math.round(
                      chartData.reduce((sum, day) => sum + day.accuracy, 0) /
                        chartData.filter((day) => day.attempts > 0).length || 0
                    )}
                    %
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    TB Chính xác
                  </Text>
                </Box>
              </Grid>
            </Box>
          </Stack>
        )}
      </CardBody>
    </Card>
  );
};

export default ScoreChart;
