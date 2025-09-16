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
  Alert,
  AlertIcon,
  Text,
  VStack,
  Badge,
  Box,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { useDeleteExercise } from '../../hooks/queries/useExerciseQueries';
import type { Exercise } from '../../types/api';

interface DeleteExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
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

export const DeleteExerciseModal: React.FC<DeleteExerciseModalProps> = ({
  isOpen,
  onClose,
  exercise,
}) => {
  const toast = useToast();
  const deleteExerciseMutation = useDeleteExercise();

  const handleDelete = async () => {
    if (!exercise) return;

    try {
      await deleteExerciseMutation.mutateAsync(exercise.id);

      toast({
        title: 'Thành công',
        description: `Đã xóa bài tập "${exercise.title}" thành công`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: (error as Error)?.message || 'Không thể xóa bài tập',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (!exercise) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Xác nhận xóa bài tập</ModalHeader>
        <ModalCloseButton isDisabled={deleteExerciseMutation.isPending} />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* API Limitation Alert */}
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="medium">
                  Tính năng chưa được hỗ trợ
                </Text>
                <Text fontSize="sm">
                  API hiện tại chưa hỗ trợ xóa bài tập. Tính năng này sẽ được cập nhật trong phiên bản tương lai.
                </Text>
              </VStack>
            </Alert>

            {/* Exercise Info */}
            <Box
              p={4}
              bg="gray.50"
              borderRadius="md"
              border="1px"
              borderColor="gray.200"
              _dark={{ bg: 'gray.700', borderColor: 'gray.600' }}
            >
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <Text fontWeight="semibold" fontSize="lg">
                      {exercise.title}
                    </Text>
                    <Text fontSize="sm" color="text.muted">
                      ID: {exercise.id}
                    </Text>
                  </VStack>
                  <Badge
                    colorScheme={DIFFICULTY_COLORS[exercise.difficulty as keyof typeof DIFFICULTY_COLORS]}
                    variant="solid"
                  >
                    {DIFFICULTY_LABELS[exercise.difficulty as keyof typeof DIFFICULTY_LABELS]}
                  </Badge>
                </HStack>

                <Text fontSize="sm" color="text.muted" noOfLines={3}>
                  {exercise.body}
                </Text>

                <HStack spacing={4}>
                  <Text fontSize="sm" color="text.muted">
                    Test cases: <Text as="span" fontWeight="medium">{exercise.test_cases?.length || 0}</Text>
                  </Text>
                  <Text fontSize="sm" color="text.muted">
                    Solutions: <Text as="span" fontWeight="medium">{exercise.solutions?.length || 0}</Text>
                  </Text>
                </HStack>
              </VStack>
            </Box>

            {/* Workaround Instructions */}
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={1}>
                <Text fontWeight="medium" fontSize="sm">
                  Hướng dẫn thay thế:
                </Text>
                <Text fontSize="sm">
                  • Liên hệ admin hệ thống để được hỗ trợ xóa bài tập
                </Text>
                <Text fontSize="sm">
                  • Có thể chỉnh sửa bài tập thành bản nháp thay vì xóa
                </Text>
                <Text fontSize="sm">
                  • Tính năng xóa sẽ được cập nhật trong phiên bản tương lai
                </Text>
              </VStack>
            </Alert>

            {/* API Error Display */}
            {deleteExerciseMutation.error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {deleteExerciseMutation.error.message || 'Có lỗi xảy ra khi xóa bài tập'}
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            colorScheme="blue"
            onClick={onClose}
          >
            Đóng
          </Button>
          <Button
            colorScheme="red"
            onClick={handleDelete}
            isLoading={deleteExerciseMutation.isPending}
            loadingText="Đang thử xóa..."
            isDisabled
          >
            Xóa bài tập (Chưa hỗ trợ)
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};