import React from 'react';
import { Box, Spinner, Text, Stack } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  fullScreen?: boolean;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message = 'Đang tải...',
  fullScreen = false,
  color = 'blue.500'
}) => {
  const content = (
    <Stack spacing={4} align="center">
      <Spinner
        size={size}
        color={color}
      />
      {message && (
        <Text
          fontSize="sm"
          color="gray.600"
          textAlign="center"
        >
          {message}
        </Text>
      )}
    </Stack>
  );

  if (fullScreen) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="rgba(255, 255, 255, 0.8)"
        zIndex={9999}
        backdropFilter="blur(2px)"
      >
        {content}
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="200px"
      w="full"
    >
      {content}
    </Box>
  );
};

export default LoadingSpinner;