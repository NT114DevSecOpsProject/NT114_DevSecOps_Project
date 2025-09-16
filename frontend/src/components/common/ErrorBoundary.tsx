import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Button,
  Text,
  Stack,
} from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error cho debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler nếu có
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Sử dụng custom fallback nếu có
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// Component để hiển thị error UI
interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  return (
    <Box
      minH="400px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={8}
    >
      <Stack gap={6} maxW="md" textAlign="center">
        <Box
          p={4}
          bg="red.50"
          borderRadius="md"
          border="1px solid"
          borderColor="red.200"
        >
          <Text fontSize="lg" fontWeight="bold" color="red.600" mb={2}>
            Đã xảy ra lỗi!
          </Text>
          <Text fontSize="sm" color="red.600">
            Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại hoặc liên hệ hỗ trợ.
          </Text>
        </Box>

        <Stack gap={4}>
          <Button 
            colorScheme="blue" 
            onClick={onReset}
            color="white"
            bg="blue.500"
            _hover={{
              bg: "blue.600",
            }}
          >
            Thử lại
          </Button>
        </Stack>

        {process.env.NODE_ENV === 'development' && error && (
          <Box
            p={4}
            bg="gray.50"
            borderRadius="md"
            border="1px solid"
            borderColor="gray.200"
            maxW="full"
            overflow="auto"
          >
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              Chi tiết lỗi:
            </Text>
            <Text
              fontSize="xs"
              fontFamily="mono"
              whiteSpace="pre-wrap"
              p={2}
              bg="white"
              borderRadius="sm"
            >
              {error.message || 'Không có thông tin lỗi'}
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default ErrorBoundary;