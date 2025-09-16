import React from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Grid,
  GridItem,
  VStack,
  HStack,
  useColorModeValue,
  Badge,
  Progress,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FiTrendingUp, FiTarget, FiActivity, FiCalendar } from 'react-icons/fi';
import { useProgressOverTime } from '../../hooks/queries/useScoreQueries';

interface ProgressSummaryProps {
  title?: string;
  days?: number;
}

const ProgressSummary: React.FC<ProgressSummaryProps> = ({ 
  title = "Tổng Quan Tiến Độ", 
  days = 7 
}) => {
  const { progressData, isLoading, error, hasTimestampData, dataLimitation } = useProgressOverTime(days);
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const statBg = useColorModeValue('gray.50', 'gray.700');

  if (isLoading) {
    return (
      <Card bg={cardBg} borderColor={borderColor}>
        <CardBody>
          <Text>Đang tải dữ liệu tiến độ...</Text>
        </CardBody>
      </Card>
    );
  }

  if (error || !progressData) {
    return (
      <Card bg={cardBg} borderColor={borderColor}>
        <CardBody>
          <Text color="red.500">Không thể tải dữ liệu tiến độ</Text>
        </CardBody>
      </Card>
    );
  }

  // Calculate summary stats
  const totalAttempts = progressData.reduce((sum, day) => sum + day.attempts, 0);
  const totalCorrect = progressData.reduce((sum, day) => sum + day.correct, 0);
  const overallAccuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
  const activeDays = progressData.filter(day => day.hasData).length;

  return (
    <Card bg={cardBg} borderColor={borderColor}>
      <CardBody>
        <VStack spacing={6} align="stretch">
          <Box>
            <Heading size="md" mb={2}>{title}</Heading>
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
              Thống kê hoạt động trong {days} ngày gần nhất
            </Text>
          </Box>

          {/* Data Limitation Alert */}
          {!hasTimestampData && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Giới hạn dữ liệu!</AlertTitle>
                <AlertDescription fontSize="sm">
                  {dataLimitation}
                </AlertDescription>
              </Box>
            </Alert>
          )}

          {/* Summary Stats Grid */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
            <GridItem>
              <Box bg={statBg} p={4} borderRadius="md" textAlign="center">
                <HStack justify="center" mb={2}>
                  <Icon as={FiActivity} color="blue.500" />
                  <Text fontSize="sm" fontWeight="medium">Tổng Lượt Thử</Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {totalAttempts}
                </Text>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                  {activeDays} ngày có hoạt động
                </Text>
              </Box>
            </GridItem>

            <GridItem>
              <Box bg={statBg} p={4} borderRadius="md" textAlign="center">
                <HStack justify="center" mb={2}>
                  <Icon as={FiTarget} color="green.500" />
                  <Text fontSize="sm" fontWeight="medium">Hoàn Thành</Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {totalCorrect}
                </Text>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                  bài tập đúng hoàn toàn
                </Text>
              </Box>
            </GridItem>

            <GridItem>
              <Box bg={statBg} p={4} borderRadius="md" textAlign="center">
                <HStack justify="center" mb={2}>
                  <Icon as={FiTrendingUp} color="purple.500" />
                  <Text fontSize="sm" fontWeight="medium">Độ Chính Xác</Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {Math.round(overallAccuracy)}%
                </Text>
                <Progress 
                  value={overallAccuracy} 
                  colorScheme="purple" 
                  size="sm" 
                  borderRadius="full"
                  mt={1}
                />
              </Box>
            </GridItem>

            <GridItem>
              <Box bg={statBg} p={4} borderRadius="md" textAlign="center">
                <HStack justify="center" mb={2}>
                  <Icon as={FiCalendar} color="orange.500" />
                  <Text fontSize="sm" fontWeight="medium">Trung Bình</Text>
                </HStack>
                <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                  {activeDays > 0 ? Math.round(totalAttempts / activeDays) : 0}
                </Text>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                  lượt thử/ngày
                </Text>
              </Box>
            </GridItem>
          </Grid>

          {/* Daily Breakdown */}
          <Box>
            <Text fontSize="md" fontWeight="medium" mb={3}>
              Chi Tiết Theo Ngày
            </Text>
            <VStack spacing={2} align="stretch">
              {progressData.slice(-7).map((day, index) => {
                const dayName = new Date(day.date).toLocaleDateString('vi-VN', { 
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short'
                });
                
                return (
                  <HStack key={index} justify="space-between" p={3} bg={statBg} borderRadius="md">
                    <HStack>
                      <Text fontSize="sm" fontWeight="medium" minW="80px">
                        {dayName}
                      </Text>
                      {day.hasData ? (
                        <Badge colorScheme="green" variant="subtle">
                          Có hoạt động
                        </Badge>
                      ) : (
                        <Badge colorScheme="gray" variant="subtle">
                          Không có dữ liệu
                        </Badge>
                      )}
                    </HStack>
                    
                    {day.hasData && (
                      <HStack spacing={4}>
                        <Text fontSize="sm">
                          <strong>{day.attempts}</strong> lượt thử
                        </Text>
                        <Text fontSize="sm">
                          <strong>{day.correct}</strong> đúng
                        </Text>
                        <Badge 
                          colorScheme={day.accuracy >= 80 ? 'green' : day.accuracy >= 50 ? 'yellow' : 'red'}
                          variant="subtle"
                        >
                          {Math.round(day.accuracy)}%
                        </Badge>
                      </HStack>
                    )}
                  </HStack>
                );
              })}
            </VStack>
          </Box>

          {/* Improvement Suggestion */}
          <Box p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200" _dark={{ bg: "blue.900", borderColor: "blue.700" }}>
            <Text fontSize="sm" color="blue.700" _dark={{ color: "blue.300" }}>
              💡 <strong>Đề xuất cải thiện:</strong> Để có biểu đồ tiến độ chính xác theo thời gian, 
              backend cần thêm field <code>created_at</code> (timestamp) vào Score model. 
              Điều này sẽ cho phép tracking tiến độ thực tế theo ngày/tuần/tháng.
            </Text>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default ProgressSummary;