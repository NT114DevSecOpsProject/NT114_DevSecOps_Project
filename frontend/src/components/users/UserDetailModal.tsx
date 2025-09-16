import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Divider,
  Box,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Alert,
  AlertIcon,
  Skeleton,
} from '@chakra-ui/react';
import { useUser } from '../../hooks/queries/useUserQueries';
import { useScores } from '../../hooks/queries/useScoreQueries';
import type { Score } from '../../types/api';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const { data: user, isLoading: userLoading, error: userError } = useUser(userId || 0);
  const { data: allScores } = useScores();

  // Lấy scores của user (nếu có)
  const userScores = React.useMemo(() => {
    if (!userId || !allScores) return [];
    return allScores.filter((score: Score) => score.user_id === userId);
  }, [userId, allScores]);

  // Tính toán thống kê
  const stats = React.useMemo(() => {
    if (!userScores.length) {
      return {
        totalExercises: 0,
        completedExercises: 0,
        correctAnswers: 0,
        successRate: 0,
      };
    }

    const totalExercises = userScores.length;
    const completedExercises = userScores.filter((score: Score) => score.all_correct !== null).length;
    const correctAnswers = userScores.filter((score: Score) => score.all_correct === true).length;
    const successRate = completedExercises > 0 ? (correctAnswers / completedExercises) * 100 : 0;

    return {
      totalExercises,
      completedExercises,
      correctAnswers,
      successRate,
    };
  }, [userScores]);



  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Chi tiết người dùng</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {userLoading ? (
            <VStack spacing={4}>
              <Skeleton height="20px" width="100%" />
              <Skeleton height="20px" width="80%" />
              <Skeleton height="20px" width="60%" />
              <Skeleton height="100px" width="100%" />
            </VStack>
          ) : userError ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              Không thể tải thông tin người dùng: {userError.message}
            </Alert>
          ) : user ? (
            <VStack spacing={6} align="stretch">
              {/* Thông tin cơ bản */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={3}>
                  Thông tin cơ bản
                </Text>
                
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="medium">ID:</Text>
                    <Text>{user.id}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="medium">Tên người dùng:</Text>
                    <Text fontWeight="bold">{user.username}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="medium">Email:</Text>
                    <Text>{user.email}</Text>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="medium">Trạng thái:</Text>
                    <Badge
                      colorScheme={user.active ? 'green' : 'red'}
                      variant="subtle"
                    >
                      {user.active ? 'Hoạt động' : 'Không hoạt động'}
                    </Badge>
                  </HStack>

                  <HStack justify="space-between">
                    <Text fontWeight="medium">Quyền:</Text>
                    <Badge
                      colorScheme={user.admin ? 'purple' : 'gray'}
                      variant="subtle"
                    >
                      {user.admin ? 'Quản trị viên' : 'Người dùng'}
                    </Badge>
                  </HStack>
                </VStack>
              </Box>

              <Divider />

              {/* Thống kê bài tập */}
              <Box>
                <Text fontSize="lg" fontWeight="bold" mb={3}>
                  Thống kê bài tập
                </Text>

                <StatGroup>
                  <Stat>
                    <StatLabel>Tổng bài tập</StatLabel>
                    <StatNumber color="blue.500">{stats.totalExercises}</StatNumber>
                  </Stat>

                  <Stat>
                    <StatLabel>Đã hoàn thành</StatLabel>
                    <StatNumber color="green.500">{stats.completedExercises}</StatNumber>
                  </Stat>

                  <Stat>
                    <StatLabel>Làm đúng</StatLabel>
                    <StatNumber color="purple.500">{stats.correctAnswers}</StatNumber>
                  </Stat>

                  <Stat>
                    <StatLabel>Tỷ lệ thành công</StatLabel>
                    <StatNumber color="orange.500">
                      {stats.successRate.toFixed(1)}%
                    </StatNumber>
                  </Stat>
                </StatGroup>
              </Box>

              {/* Hoạt động gần đây */}
              {userScores.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={3}>
                      Hoạt động gần đây
                    </Text>

                    <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
                      {userScores
                        .slice(0, 5) // Chỉ hiển thị 5 hoạt động gần nhất
                        .map((score: Score) => (
                          <HStack
                            key={score.id}
                            justify="space-between"
                            p={2}
                            bg="gray.50"
                            borderRadius="md"
                            _dark={{ bg: 'gray.700' }}
                          >
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="medium">
                                Bài tập #{score.exercise_id}
                              </Text>
                              <Text fontSize="xs" color="text.muted">
                                Gần đây
                              </Text>
                            </VStack>

                            <Badge
                              colorScheme={
                                score.all_correct === true
                                  ? 'green'
                                  : score.all_correct === false
                                  ? 'red'
                                  : 'gray'
                              }
                              variant="subtle"
                            >
                              {score.all_correct === true
                                ? 'Đúng'
                                : score.all_correct === false
                                ? 'Sai'
                                : 'Chưa hoàn thành'}
                            </Badge>
                          </HStack>
                        ))}
                    </VStack>
                  </Box>
                </>
              )}
            </VStack>
          ) : (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              Không tìm thấy thông tin người dùng
            </Alert>
          )}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Đóng</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};