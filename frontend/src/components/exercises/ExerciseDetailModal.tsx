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
  Alert,
  AlertIcon,
  Badge,
  Text,
  Box,
  HStack,
  Divider,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Code,
} from '@chakra-ui/react';
import { useExercise } from '../../hooks/queries/useExerciseQueries';
import LoadingSpinner from '../common/LoadingSpinner';

interface ExerciseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: number | null;
}

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

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  isOpen,
  onClose,
  exerciseId,
}) => {
  const { data: exercise, isLoading, error } = useExercise(exerciseId || 0);

  // Loading state
  if (isOpen && exerciseId && isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Chi tiết bài tập</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box textAlign="center" py={8}>
              <LoadingSpinner />
              <Text mt={4} color="text.muted">
                Đang tải thông tin bài tập...
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  // Error state
  if (isOpen && exerciseId && error) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Chi tiết bài tập</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              Không thể tải thông tin bài tập: {error.message}
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Đóng</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  // No exercise data
  if (!exercise) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Chi tiết bài tập</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              Không tìm thấy thông tin bài tập
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Đóng</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Chi tiết bài tập</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Header Info */}
            <Box>
              <HStack justify="space-between" align="start" mb={3}>
                <VStack align="start" spacing={1}>
                  <Heading size="md">{exercise.title}</Heading>
                  <Text fontSize="sm" color="text.muted">
                    ID: {exercise.id}
                  </Text>
                </VStack>
                <Badge
                  colorScheme={DIFFICULTY_COLORS[exercise.difficulty as keyof typeof DIFFICULTY_COLORS]}
                  variant="solid"
                  fontSize="sm"
                  px={3}
                  py={1}
                  borderRadius="full"
                >
                  {DIFFICULTY_LABELS[exercise.difficulty as keyof typeof DIFFICULTY_LABELS]}
                </Badge>
              </HStack>
            </Box>

            <Divider />

            {/* Description */}
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Mô tả bài tập:
              </Text>
              <Box
                p={3}
                bg="gray.50"
                borderRadius="md"
                border="1px"
                borderColor="gray.200"
                _dark={{ bg: 'gray.700', borderColor: 'gray.600' }}
              >
                <Text whiteSpace="pre-wrap">{exercise.body}</Text>
              </Box>
            </Box>

            <Divider />

            {/* Test Cases */}
            <Box>
              <Text fontWeight="semibold" mb={3}>
                Test Cases ({exercise.test_cases?.length || 0}):
              </Text>
              
              {exercise.test_cases && exercise.test_cases.length > 0 ? (
                <VStack spacing={3} align="stretch">
                  {exercise.test_cases.map((testCase, index) => (
                    <Card key={index} size="sm" variant="outline">
                      <CardHeader pb={2}>
                        <Text fontWeight="medium" fontSize="sm" color="blue.600" _dark={{ color: 'blue.300' }}>
                          Test Case #{index + 1}
                        </Text>
                      </CardHeader>
                      <CardBody pt={0}>
                        <VStack spacing={2} align="stretch">
                          <Box>
                            <Text fontSize="xs" fontWeight="medium" color="text.muted" mb={1}>
                              Input:
                            </Text>
                            <Code
                              p={2}
                              borderRadius="md"
                              bg="blue.50"
                              color="blue.800"
                              _dark={{ bg: 'blue.900', color: 'blue.200' }}
                              fontSize="sm"
                              fontFamily="mono"
                              display="block"
                            >
                              {testCase}
                            </Code>
                          </Box>
                          <Box>
                            <Text fontSize="xs" fontWeight="medium" color="text.muted" mb={1}>
                              Expected Output:
                            </Text>
                            <Code
                              p={2}
                              borderRadius="md"
                              bg="green.50"
                              color="green.800"
                              _dark={{ bg: 'green.900', color: 'green.200' }}
                              fontSize="sm"
                              fontFamily="mono"
                              display="block"
                            >
                              {exercise.solutions && exercise.solutions[index] ? exercise.solutions[index] : 'N/A'}
                            </Code>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              ) : (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  Bài tập này chưa có test cases
                </Alert>
              )}
            </Box>

            {/* Solutions Summary */}
            {exercise.solutions && exercise.solutions.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Text fontWeight="semibold" mb={2}>
                    Thông tin Solutions:
                  </Text>
                  <HStack spacing={4}>
                    <Text fontSize="sm" color="text.muted">
                      Số lượng solutions: <Text as="span" fontWeight="medium">{exercise.solutions.length}</Text>
                    </Text>
                    <Text fontSize="sm" color="text.muted">
                      Test cases: <Text as="span" fontWeight="medium">{exercise.test_cases?.length || 0}</Text>
                    </Text>
                  </HStack>
                  
                  {exercise.test_cases && exercise.solutions.length !== exercise.test_cases.length && (
                    <Alert status="warning" mt={2} borderRadius="md">
                      <AlertIcon />
                      Số lượng solutions không khớp với số lượng test cases
                    </Alert>
                  )}
                </Box>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" onClick={onClose}>
            Đóng
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};