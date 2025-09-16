import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Avatar,
  Badge,
  Card,
  CardBody,
  Flex,
  Icon,
  Button,
  useColorModeValue
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaTrophy, FaMedal, FaAward, FaCrown, FaStar } from 'react-icons/fa';
import { useLeaderboard } from '../../hooks/useLeaderboard';

// Animation keyframes
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.6); }
  100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
`;

const sparkle = keyframes`
  0% { opacity: 0; transform: scale(0) rotate(0deg); }
  50% { opacity: 1; transform: scale(1) rotate(180deg); }
  100% { opacity: 0; transform: scale(0) rotate(360deg); }
`;

interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  totalScore: number;
  completedExercises: number;
  rank: number;
  totalAttempts?: number;
  averageAccuracy?: number;
  easyCompleted?: number;
  mediumCompleted?: number;
  hardCompleted?: number;
  
}

// Component cho top 3 podium
const PodiumTop3: React.FC<{ users: LeaderboardUser[] }> = ({ users }) => {
  const goldGradient = useColorModeValue(
    'linear(to-br, #FFD700, #FFA500)',
    'linear(to-br, #FFD700, #FF8C00)'
  );
  const silverGradient = useColorModeValue(
    'linear(to-br, #C0C0C0, #808080)',
    'linear(to-br, #E5E5E5, #A0A0A0)'
  );
  const bronzeGradient = useColorModeValue(
    'linear(to-br, #CD7F32, #8B4513)',
    'linear(to-br, #D4AF37, #B8860B)'
  );

  const getPodiumConfig = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          height: '300px',
          gradient: goldGradient,
          icon: FaCrown,
          iconColor: '#FFD700',
          title: 'Quán Quân',
          animation: `${float} 3s ease-in-out infinite, ${glow} 2s ease-in-out infinite`,
          zIndex: 3
        };
      case 2:
        return {
          height: '250px',
          gradient: silverGradient,
          icon: FaTrophy,
          iconColor: '#C0C0C0',
          title: 'Á Quân',
          animation: `${float} 3s ease-in-out infinite 0.5s`,
          zIndex: 2
        };
      case 3:
        return {
          height: '200px',
          gradient: bronzeGradient,
          icon: FaMedal,
          iconColor: '#CD7F32',
          title: 'Hạng Ba',
          animation: `${float} 3s ease-in-out infinite 1s`,
          zIndex: 1
        };
      default:
        return null;
    }
  };

  const top3 = users.slice(0, 3);
  // Ensure we have exactly the top 3 by rank, not reordered
  const sortedTop3 = top3.sort((a, b) => a.rank - b.rank);
  
  // Reorder for podium display: [2nd, 1st, 3rd] but maintain correct ranks
  const reorderedTop3 = [];
  if (sortedTop3[1]) reorderedTop3.push(sortedTop3[1]); // 2nd place
  if (sortedTop3[0]) reorderedTop3.push(sortedTop3[0]); // 1st place  
  if (sortedTop3[2]) reorderedTop3.push(sortedTop3[2]); // 3rd place

  return (
    <Box position="relative" py={16} overflow="hidden">
      {/* Background decorations */}
      <Box
        position="absolute"
        top="10%"
        left="10%"
        width="20px"
        height="20px"
        borderRadius="50%"
        bg="yellow.400"
        animation={`${sparkle} 2s ease-in-out infinite`}
      />
      <Box
        position="absolute"
        top="20%"
        right="15%"
        width="15px"
        height="15px"
        borderRadius="50%"
        bg="orange.400"
        animation={`${sparkle} 2s ease-in-out infinite 0.7s`}
      />
      <Box
        position="absolute"
        bottom="30%"
        left="20%"
        width="25px"
        height="25px"
        borderRadius="50%"
        bg="yellow.300"
        animation={`${sparkle} 2s ease-in-out infinite 1.4s`}
      />

      <Flex justify="center" align="end" gap={8} flexWrap="wrap">
        {reorderedTop3.map((user) => {
          const actualRank = user.rank;
          const config = getPodiumConfig(actualRank);
          if (!config) return null;

          return (
            <Box
              key={user.id}
              position="relative"
              zIndex={config.zIndex}
              animation={config.animation}
            >
              {/* Podium */}
              <VStack spacing={0}>
                {/* User Info */}
                <VStack spacing={3} mb={4}>
                  <Box position="relative">
                    <Avatar
                      size="xl"
                      src={user.avatar}
                      name={user.name}
                      border="4px solid"
                      borderColor={config.iconColor}
                      boxShadow={`0 0 20px ${config.iconColor}50`}
                    />
                    <Box
                      position="absolute"
                      top="-10px"
                      right="-10px"
                      bg={config.iconColor}
                      borderRadius="50%"
                      p={2}
                      boxShadow="lg"
                    >
                      <Icon as={config.icon} color="white" boxSize={5} />
                    </Box>
                  </Box>
                  
                  <VStack spacing={1}>
                    <Text
                      fontSize="lg"
                      fontWeight="bold"
                      color={config.iconColor}
                      textAlign="center"
                    >
                      {user.name}
                    </Text>
                    <Badge
                      variant="solid"
                      colorScheme={actualRank === 1 ? 'yellow' : actualRank === 2 ? 'gray' : 'orange'}
                      fontSize="sm"
                      px={3}
                      py={1}
                      borderRadius="full"
                    >
                      {config.title}
                    </Badge>
                    <Text fontSize="2xl" fontWeight="bold" color={config.iconColor}>
                      {user.totalScore.toLocaleString()} điểm
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {user.completedExercises} bài hoàn thành
                    </Text>
                    {user.averageAccuracy !== undefined && (
                      <Text fontSize="xs" color="gray.400">
                        Độ chính xác: {Math.round(user.averageAccuracy * 100)}%
                      </Text>
                    )}
                  </VStack>
                </VStack>

                {/* Podium Base */}
                <Box
                  width="150px"
                  height={config.height}
                  bgGradient={config.gradient}
                  borderRadius="lg lg 0 0"
                  border="2px solid"
                  borderColor={config.iconColor}
                  position="relative"
                  overflow="hidden"
                  _before={{
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    bgGradient: 'linear(to-b, rgba(255,255,255,0.3), transparent)',
                    borderRadius: 'lg lg 0 0'
                  }}
                >
                  <Flex
                    justify="center"
                    align="center"
                    h="full"
                    direction="column"
                  >
                    <Text
                      fontSize="4xl"
                      fontWeight="bold"
                      color="white"
                      textShadow="2px 2px 4px rgba(0,0,0,0.5)"
                    >
                      #{actualRank}
                    </Text>
                  </Flex>
                </Box>
              </VStack>
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
};

// Component cho bảng xếp hạng từ vị trí 4 trở đi
const LeaderboardTable: React.FC<{ users: LeaderboardUser[] }> = ({ users }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const remainingUsers = users.slice(3);

  if (remainingUsers.length === 0) return null;

  return (
    <Box>
      <Heading size="lg" mb={6} textAlign="center">
        Bảng Xếp Hạng
      </Heading>
      
      <VStack spacing={3}>
        {remainingUsers.map((user) => (
          <Card
            key={user.id}
            width="100%"
            bg={bgColor}
            borderColor={borderColor}
            borderWidth="1px"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
              transition: 'all 0.3s ease'
            }}
            transition="all 0.3s ease"
          >
            <CardBody>
              <Flex justify="space-between" align="center">
                <HStack spacing={4}>
                  <Box
                    minW="40px"
                    h="40px"
                    borderRadius="lg"
                    bg={user.rank <= 10 ? 'blue.500' : 'gray.500'}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color="white" fontWeight="bold" fontSize="lg">
                      #{user.rank}
                    </Text>
                  </Box>
                  
                  <Avatar
                    size="md"
                    src={user.avatar}
                    name={user.name}
                  />
                  
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="bold" fontSize="lg">
                      {user.name}
                    </Text>
                    <HStack spacing={3} fontSize="sm" color="gray.500">
                      <Text>{user.completedExercises} hoàn thành</Text>
                      {user.totalAttempts && (
                        <Text>• {user.totalAttempts} lần thử</Text>
                      )}
                      {user.averageAccuracy !== undefined && (
                        <Text>• {Math.round(user.averageAccuracy * 100)}% chính xác</Text>
                      )}
                    </HStack>
                    {(user.hardCompleted || user.mediumCompleted || user.easyCompleted) && (
                      <HStack spacing={2} mt={1}>
                        {user.hardCompleted && user.hardCompleted > 0 && (
                          <Badge colorScheme="red" variant="subtle" fontSize="xs">
                            {user.hardCompleted} Khó
                          </Badge>
                        )}
                        {user.mediumCompleted && user.mediumCompleted  > 0 && (
                          <Badge colorScheme="orange" variant="subtle" fontSize="xs">
                            {user.mediumCompleted} TB
                          </Badge>
                        )}
                        {user.easyCompleted  && user.easyCompleted > 0 && (
                          <Badge colorScheme="green" variant="subtle" fontSize="xs">
                            {user.easyCompleted} Dễ
                          </Badge>
                        )}
                      </HStack>
                    )}
                  </VStack>
                </HStack>

                <VStack align="end" spacing={1}>
                  <HStack>
                    <Icon as={FaStar} color="yellow.400" />
                    <Text fontSize="xl" fontWeight="bold" color="blue.500">
                      {user.totalScore.toLocaleString()}
                    </Text>
                    <Text fontSize="sm" color="gray.500">điểm</Text>
                  </HStack>
                  
                  {user.rank <= 10 && (
                    <Badge colorScheme="blue" variant="subtle">
                      Top 10
                    </Badge>
                  )}
                </VStack>
              </Flex>
            </CardBody>
          </Card>
        ))}
      </VStack>
    </Box>
  );
};

const LeaderboardPage: React.FC = () => {
  const { data: leaderboard, isLoading, error, refetch, isRefetching } = useLeaderboard();
  
  const bgGradient = useColorModeValue(
    'linear(to-br, blue.50, purple.50, pink.50)',
    'linear(to-br, gray.900, blue.900, purple.900)'
  );

  const handleRetry = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Box minH="100vh" bgGradient={bgGradient}>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={8}>
            <Heading
              size="2xl"
              bgGradient="linear(to-r, blue.400, purple.500, pink.400)"
              bgClip="text"
              fontWeight="extrabold"
              textAlign="center"
            >
              Bảng Xếp Hạng
            </Heading>
            
            <VStack spacing={4}>
              <Box
                width="80px"
                height="80px"
                borderRadius="50%"
                bgGradient="linear(to-r, blue.400, purple.500)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                animation={`${float} 2s ease-in-out infinite`}
              >
                <Icon as={FaTrophy} color="white" boxSize={8} />
              </Box>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                Đang tải bảng xếp hạng...
              </Text>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Vui lòng chờ trong giây lát
              </Text>
            </VStack>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (error || !leaderboard) {
    return (
      <Box minH="100vh" bgGradient={bgGradient}>
        <Container maxW="container.xl" py={8}>
          <VStack spacing={8}>
            <Heading
              size="2xl"
              bgGradient="linear(to-r, blue.400, purple.500, pink.400)"
              bgClip="text"
              fontWeight="extrabold"
              textAlign="center"
            >
              Bảng Xếp Hạng
            </Heading>
            
            <VStack spacing={6} maxW="400px">
              <Icon as={FaAward} boxSize={16} color="red.400" />
              <Text fontSize="xl" color="red.500" textAlign="center" fontWeight="semibold">
                Không thể tải dữ liệu
              </Text>
              <Text color="gray.500" textAlign="center">
                {error?.message || 'Có lỗi xảy ra khi tải bảng xếp hạng. Vui lòng thử lại sau.'}
              </Text>
              <Button
                colorScheme="blue"
                onClick={handleRetry}
                isLoading={isRefetching}
                loadingText="Đang tải lại..."
                leftIcon={<Icon as={FaTrophy} />}
                size="lg"
              >
                Thử lại
              </Button>
            </VStack>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bgGradient={bgGradient} position="relative" overflow="hidden">
      {/* Background pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        opacity={0.1}
        bgImage="radial-gradient(circle at 25% 25%, #FFD700 0%, transparent 50%), radial-gradient(circle at 75% 75%, #FF6B6B 0%, transparent 50%)"
      />
      
      <Container maxW="container.xl" py={8} position="relative" zIndex={1}>
        <VStack spacing={12}>
          {/* Header */}
          <VStack spacing={4} textAlign="center">
            <HStack spacing={3}>
              <Icon as={FaTrophy} color="yellow.400" boxSize={8} />
              <Heading
                size="2xl"
                bgGradient="linear(to-r, blue.400, purple.500, pink.400)"
                bgClip="text"
                fontWeight="extrabold"
              >
                Bảng Xếp Hạng
              </Heading>
              <Icon as={FaTrophy} color="yellow.400" boxSize={8} />
            </HStack>
            
            <Text fontSize="lg" color="gray.600" maxW="600px">
              Xem danh sách những người dùng xuất sắc nhất với điểm số cao nhất
              từ việc hoàn thành các bài tập lập trình
            </Text>
            
            {isRefetching && (
              <Badge
                colorScheme="blue"
                variant="subtle"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
              >
                🔄 Đang cập nhật dữ liệu...
              </Badge>
            )}

            {/* Development Debug Info */}
            {process.env.NODE_ENV === 'development' && leaderboard.length > 0 && (
              <Badge
                colorScheme="purple"
                variant="outline"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
              >
                🔧 Dev: Leaderboard calculated from {leaderboard.length} users with real API data
              </Badge>
            )}
          </VStack>

          {/* Top 3 Podium */}
          {leaderboard.length > 0 && (
            <PodiumTop3 users={leaderboard} />
          )}

          {/* Remaining users table */}
          {leaderboard.length > 3 && (
            <Box width="100%" maxW="800px">
              <LeaderboardTable users={leaderboard} />
            </Box>
          )}

          {/* Empty state */}
          {leaderboard.length === 0 && (
            <VStack spacing={6} py={12}>
              <Box
                width="120px"
                height="120px"
                borderRadius="50%"
                bgGradient="linear(to-r, gray.100, gray.200)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
              >
                <Icon as={FaAward} boxSize={16} color="gray.400" />
                <Box
                  position="absolute"
                  top="10px"
                  right="10px"
                  width="20px"
                  height="20px"
                  borderRadius="50%"
                  bg="yellow.200"
                  opacity={0.7}
                  animation={`${sparkle} 3s ease-in-out infinite`}
                />
              </Box>
              
              <VStack spacing={3} textAlign="center" maxW="500px">
                <Text fontSize="xl" color="gray.600" fontWeight="semibold">
                  Bảng xếp hạng đang chờ bạn!
                </Text>
                <Text color="gray.500" lineHeight="1.6">
                  Hiện tại chưa có ai hoàn thành bài tập nào. 
                  Hãy trở thành người đầu tiên chinh phục các thử thách lập trình!
                </Text>
                <Button
                  as="a"
                  href="/exercises"
                  colorScheme="blue"
                  size="lg"
                  leftIcon={<Icon as={FaStar} />}
                  mt={4}
                >
                  Bắt đầu làm bài
                </Button>
              </VStack>
            </VStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default LeaderboardPage;