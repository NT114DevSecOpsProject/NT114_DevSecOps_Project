import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Alert,
  AlertIcon,
  useToast,
  FormErrorMessage,
  Select,
  HStack,
  Text,
  Box,
  IconButton,
  Divider,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useExercise, useUpdateExercise } from '../../hooks/queries/useExerciseQueries';
import type { ExerciseCreate } from '../../types/api';
import LoadingSpinner from '../common/LoadingSpinner';

interface EditExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId: number | null;
}

type FormData = ExerciseCreate;

interface FormErrors {
  title?: string;
  body?: string;
  difficulty?: string;
  test_cases?: string;
  solutions?: string;
}

export const EditExerciseModal: React.FC<EditExerciseModalProps> = ({
  isOpen,
  onClose,
  exerciseId,
}) => {
  const toast = useToast();
  const { data: exercise, isLoading: isLoadingExercise, error: exerciseError } = useExercise(exerciseId || 0);
  const updateExerciseMutation = useUpdateExercise();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    body: '',
    difficulty: 0,
    test_cases: [''],
    solutions: [''],
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Load exercise data khi modal mở và có exerciseId
  useEffect(() => {
    if (isOpen && exercise) {
      setFormData({
        title: exercise.title,
        body: exercise.body,
        difficulty: exercise.difficulty,
        test_cases: exercise.test_cases.length > 0 ? exercise.test_cases : [''],
        solutions: exercise.solutions.length > 0 ? exercise.solutions : [''],
      });
      setErrors({});
    }
  }, [isOpen, exercise]);

  // Reset form khi modal đóng
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        body: '',
        difficulty: 0,
        test_cases: [''],
        solutions: [''],
      });
      setErrors({});
    }
  }, [isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề không được để trống';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Tiêu đề phải có ít nhất 3 ký tự';
    }

    // Validate body
    if (!formData.body.trim()) {
      newErrors.body = 'Mô tả bài tập không được để trống';
    } else if (formData.body.length < 10) {
      newErrors.body = 'Mô tả bài tập phải có ít nhất 10 ký tự';
    }

    // Validate test cases
    const validTestCases = formData.test_cases.filter(tc => tc.trim() !== '');
    if (validTestCases.length === 0) {
      newErrors.test_cases = 'Phải có ít nhất 1 test case';
    }

    // Validate solutions
    const validSolutions = formData.solutions.filter(sol => sol.trim() !== '');
    if (validSolutions.length === 0) {
      newErrors.solutions = 'Phải có ít nhất 1 solution';
    } else if (validSolutions.length !== validTestCases.length) {
      newErrors.solutions = 'Số lượng solutions phải bằng số lượng test cases';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!exerciseId || !validateForm()) {
      return;
    }

    try {
      const exerciseData: ExerciseCreate = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        difficulty: formData.difficulty,
        test_cases: formData.test_cases.filter(tc => tc.trim() !== ''),
        solutions: formData.solutions.filter(sol => sol.trim() !== ''),
      };

      await updateExerciseMutation.mutateAsync({ id: exerciseId, data: exerciseData });

      toast({
        title: 'Thành công',
        description: 'Đã cập nhật bài tập thành công',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onClose();
    } catch (error: unknown) {
      toast({
        title: 'Lỗi',
        description: (error as Error)?.message || 'Không thể cập nhật bài tập',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error khi user bắt đầu nhập
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Handle test case changes
  const handleTestCaseChange = (index: number, value: string) => {
    const newTestCases = [...formData.test_cases];
    newTestCases[index] = value;
    setFormData(prev => ({ ...prev, test_cases: newTestCases }));

    if (errors.test_cases) {
      setErrors(prev => ({ ...prev, test_cases: undefined }));
    }
  };

  // Handle solution changes
  const handleSolutionChange = (index: number, value: string) => {
    const newSolutions = [...formData.solutions];
    newSolutions[index] = value;
    setFormData(prev => ({ ...prev, solutions: newSolutions }));

    if (errors.solutions) {
      setErrors(prev => ({ ...prev, solutions: undefined }));
    }
  };

  // Add test case/solution pair
  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, ''],
      solutions: [...prev.solutions, ''],
    }));
  };

  // Remove test case/solution pair
  const removeTestCase = (index: number) => {
    if (formData.test_cases.length > 1) {
      const newTestCases = formData.test_cases.filter((_, i) => i !== index);
      const newSolutions = formData.solutions.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        test_cases: newTestCases,
        solutions: newSolutions,
      }));
    }
  };

  // Loading state khi đang load exercise data
  if (isOpen && exerciseId && isLoadingExercise) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Chỉnh sửa bài tập</ModalHeader>
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

  // Error state khi không load được exercise
  if (isOpen && exerciseId && exerciseError) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Chỉnh sửa bài tập</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              Không thể tải thông tin bài tập: {exerciseError.message}
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
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Chỉnh sửa bài tập</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={4}>
            {/* Title */}
            <FormControl isInvalid={!!errors.title}>
              <FormLabel>Tiêu đề bài tập</FormLabel>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Nhập tiêu đề bài tập"
              />
              <FormErrorMessage>{errors.title}</FormErrorMessage>
            </FormControl>

            {/* Body */}
            <FormControl isInvalid={!!errors.body}>
              <FormLabel>Mô tả bài tập</FormLabel>
              <Textarea
                value={formData.body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                placeholder="Nhập mô tả chi tiết về bài tập..."
                rows={4}
                resize="vertical"
              />
              <FormErrorMessage>{errors.body}</FormErrorMessage>
            </FormControl>

            {/* Difficulty */}
            <FormControl isInvalid={!!errors.difficulty}>
              <FormLabel>Độ khó</FormLabel>
              <Select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', parseInt(e.target.value))}
              >
                <option value={0}>Dễ</option>
                <option value={1}>Trung bình</option>
                <option value={2}>Khó</option>
              </Select>
              <FormErrorMessage>{errors.difficulty}</FormErrorMessage>
            </FormControl>

            <Divider />

            {/* Test Cases and Solutions */}
            <Box w="100%">
              <HStack justify="space-between" mb={3}>
                <Text fontWeight="medium" fontSize="lg">
                  Test Cases & Solutions
                </Text>
                <Button
                  leftIcon={<AddIcon />}
                  size="sm"
                  onClick={addTestCase}
                  colorScheme="green"
                  variant="outline"
                >
                  Thêm test case
                </Button>
              </HStack>

              <VStack spacing={3}>
                {formData.test_cases.map((testCase, index) => (
                  <Box key={index} w="100%" p={3} border="1px" borderColor="gray.200" borderRadius="md">
                    <HStack justify="space-between" mb={2}>
                      <Text fontWeight="medium" fontSize="sm">
                        Test Case #{index + 1}
                      </Text>
                      {formData.test_cases.length > 1 && (
                        <IconButton
                          aria-label="Xóa test case"
                          icon={<DeleteIcon />}
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => removeTestCase(index)}
                        />
                      )}
                    </HStack>

                    <VStack spacing={2}>
                      <FormControl>
                        <FormLabel fontSize="sm">Function Call</FormLabel>
                        <Input
                          value={testCase}
                          onChange={(e) => handleTestCaseChange(index, e.target.value)}
                          placeholder="VD: sum(2, 3)"
                          size="sm"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="sm">Expected Output</FormLabel>
                        <Input
                          value={formData.solutions[index] || ''}
                          onChange={(e) => handleSolutionChange(index, e.target.value)}
                          placeholder="VD: 5"
                          size="sm"
                        />
                      </FormControl>
                    </VStack>
                  </Box>
                ))}
              </VStack>

              {/* Test Cases Error */}
              {(errors.test_cases || errors.solutions) && (
                <Alert status="error" mt={3} borderRadius="md">
                  <AlertIcon />
                  {errors.test_cases || errors.solutions}
                </Alert>
              )}
            </Box>

            {/* API Error Display */}
            {updateExerciseMutation.error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {updateExerciseMutation.error.message || 'Có lỗi xảy ra khi cập nhật bài tập'}
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={onClose}
            isDisabled={updateExerciseMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={updateExerciseMutation.isPending}
            loadingText="Đang cập nhật..."
          >
            Cập nhật bài tập
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};