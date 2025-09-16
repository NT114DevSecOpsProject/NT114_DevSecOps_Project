import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  Button,
  HStack,
  VStack,
  useColorModeValue,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiCode, FiPlay, FiCheckCircle, FiClock, FiTarget, FiRotateCcw } from 'react-icons/fi';
import { Link } from '@tanstack/react-router';
import { exerciseService } from '../../services/exercises';
import { useExerciseProgressById } from '../../hooks/useExerciseProgress';
import type { Exercise } from '../../types/api';

interface ExerciseCardProps {
  exercise: Exercise;
  onAttempt?: (exerciseId: number) => void;
  showActions?: boolean;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  onAttempt,
  showActions = true,
}) => {
  // Get exercise progress
  const { progress, isCompleted, isAttempted, attemptCount } = useExerciseProgressById(exercise.id);

  // Debug logging - remove this after fixing
  React.useEffect(() => {
    if (progress && isAttempted) {
      console.log(`Exercise ${exercise.id} Debug:`, {
        isCompleted,
        isAttempted,
        bestScore: progress.bestScore,
        lastAttempt: progress.lastAttempt,
      });
    }
  }, [exercise.id, progress, isCompleted, isAttempted]);

  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.500', 'green.300');

  // Get status badge
  const getStatusBadge = () => {
    // Debug logging - remove after fixing
    if (isAttempted) {
      console.log(`Exercise ${exercise.id} Status Logic:`, {
        isCompleted,
        isAttempted,
        bestScore: progress?.bestScore,
        bestScoreAllCorrect: progress?.bestScore?.all_correct,
        lastAttempt: progress?.lastAttempt,
        lastAttemptAllCorrect: progress?.lastAttempt?.all_correct,
      });
    }

    // Double-check: if lastAttempt is all_correct, should be completed
    const shouldBeCompleted = isCompleted || (progress?.lastAttempt?.all_correct === true);

    // Ưu tiên kiểm tra isCompleted trước (nếu đã hoàn thành thì không cần kiểm tra partial)
    if (shouldBeCompleted) {
      console.log(`Exercise ${exercise.id}: Returning Hoàn thành (shouldBeCompleted: ${shouldBeCompleted})`);
      return (
        <Badge colorScheme="green" variant="subtle">
          <HStack spacing={1}>
            <Icon as={FiCheckCircle} boxSize={3} />
            <Text fontSize="xs">Hoàn thành</Text>
          </HStack>
        </Badge>
      );
    }
    
    // Chỉ kiểm tra partial success khi chưa hoàn thành
    if (isAttempted && progress?.bestScore) {
      const hasPartialSuccess = !progress.bestScore.all_correct && 
        progress.bestScore.results.some(r => r === true);
      
      console.log(`Exercise ${exercise.id}: hasPartialSuccess =`, hasPartialSuccess);
      
      if (hasPartialSuccess) {
        console.log(`Exercise ${exercise.id}: Returning Một phần đúng`);
        return (
          <Badge colorScheme="orange" variant="subtle">
            <HStack spacing={1}>
              <Icon as={FiClock} boxSize={3} />
              <Text fontSize="xs">Một phần đúng</Text>
            </HStack>
          </Badge>
        );
      }
    }
    
    if (isAttempted) {
      console.log(`Exercise ${exercise.id}: Returning Chưa đúng`);
      return (
        <Badge colorScheme="red" variant="subtle">
          <Text fontSize="xs">Chưa đúng</Text>
        </Badge>
      );
    }
    
    return (
      <Badge colorScheme="gray" variant="subtle">
        <Text fontSize="xs">Chưa thử</Text>
      </Badge>
    );
  };

  // Get difficulty badge
  const getDifficultyBadge = () => {
    const difficultyLabel = exerciseService.getDifficultyLabel(exercise.difficulty);
    const difficultyColor = exerciseService.getDifficultyColor(exercise.difficulty);
    
    return (
      <Badge colorScheme={difficultyColor} variant="outline" size="sm">
        <HStack spacing={1}>
          <Icon as={FiTarget} boxSize={3} />
          <Text fontSize="xs">{difficultyLabel}</Text>
        </HStack>
      </Badge>
    );
  };

  // Truncate exercise body for preview
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card
      bg={cardBg}
      borderColor={borderColor}
      borderWidth="1px"
      shadow="sm"
      _hover={{
        shadow: 'md',
        transform: 'translateY(-2px)',
        transition: 'all 0.2s ease-in-out',
      }}
      transition="all 0.2s ease-in-out"
    >
      <CardHeader pb={2}>
        <VStack align="stretch" spacing={3}>
          <HStack justify="space-between" align="flex-start">
            <VStack align="flex-start" spacing={1} flex={1}>
              <HStack spacing={2}>
                <Icon as={FiCode} color={textSecondary} />
                <Heading size="sm" color="text.primary">
                  {exercise.title}
                </Heading>
              </HStack>
              <Text fontSize="xs" color={textSecondary}>
                Bài #{exercise.id}
              </Text>
            </VStack>
          </HStack>
          
          <HStack spacing={2} wrap="wrap">
            {getStatusBadge()}
            {getDifficultyBadge()}
          </HStack>
        </VStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack align="stretch" spacing={4}>
          {/* Exercise Description */}
          <Box>
            <Text color="text.secondary" fontSize="sm" lineHeight="1.6">
              {truncateText(exercise.body)}
            </Text>
          </Box>

          {/* Progress Info */}
          {isAttempted && (
            <Box>
              <HStack spacing={4} fontSize="xs" color={textSecondary}>
                <HStack spacing={1}>
                  <Icon as={FiRotateCcw} />
                  <Text>{attemptCount} lần thử</Text>
                </HStack>
                {progress?.bestScore && (
                  <HStack spacing={1}>
                    <Icon as={FiTarget} />
                    <Text>
                      {progress.bestScore.results.filter(r => r).length}/{progress.bestScore.results.length} test cases
                    </Text>
                  </HStack>
                )}
              </HStack>
            </Box>
          )}

          {/* Test Cases Preview */}
          <Box>
            <Text fontSize="xs" color={textSecondary} mb={1} fontWeight="medium">
              Test cases ({exercise.test_cases.length}):
            </Text>
            <Box
              bg={useColorModeValue('gray.50', 'gray.700')}
              p={2}
              borderRadius="md"
              border="1px solid"
              borderColor={useColorModeValue('gray.200', 'gray.600')}
            >
              <Text fontSize="xs" fontFamily="mono" color="text.primary">
                {exercise.test_cases[0]}
                {exercise.test_cases.length > 1 && (
                  <Text as="span" color={textSecondary}>
                    {' '}(+{exercise.test_cases.length - 1} khác)
                  </Text>
                )}
              </Text>
            </Box>
          </Box>

          {/* Actions */}
          {showActions && (
            <HStack spacing={2} pt={2}>
              <Button
                as={Link}
                to="/exercises/$exerciseId"
                params={{ exerciseId: exercise.id.toString() } as any}
                size="sm"
                // colorScheme="blue"
                variant={isAttempted ? "outline" : "solid"}
                leftIcon={<Icon as={FiPlay} />}
                flex={1}
                color={isAttempted ? "white" : "white"}
                bg = "white"
                _hover={{
                  color: isAttempted ? "white" : "white",
                  bg: isAttempted ? "blue.50" : "blue.50", 
                }}
                _dark={{
                  color: isAttempted ? "white" : "white",
                  _hover: {
                    color: isAttempted ? "white" : "white",
                    bg: isAttempted ? "blue.900" : "blue.600",
                  }
                }}
              >
                {isAttempted ? 'Xem chi tiết' : 'Bắt đầu'}
              </Button>
              
              {onAttempt && (
                <Tooltip label="Thử ngay lập tức">
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    onClick={() => onAttempt(exercise.id)}
                    isDisabled={isCompleted}
                  >
                    <Icon as={FiCode} />
                  </Button>
                </Tooltip>
              )}
            </HStack>
          )}

          {/* Progress Indicator */}
          {isCompleted && (
            <Box
              w="full"
              h="2px"
              bg={successColor}
              borderRadius="full"
              opacity={0.8}
            />
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default ExerciseCard;